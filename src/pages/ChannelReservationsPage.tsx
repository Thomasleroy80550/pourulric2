import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import MainLayout from "@/components/MainLayout";
import AdminLayout from "@/components/AdminLayout";
import { useSession } from "@/components/SessionContextProvider";
import ChannelReservationRecords from "@/components/ChannelReservationRecords";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChannelApiError } from "@/lib/owner-channel-api";
import {
  advanceChannelReservationSync, getImportedChannelReservations, getReservationSources, ImportedChannelReservation,
  ReservationImport, ReservationSource, ReservationSyncProgress, startChannelReservationSync,
} from "@/lib/channel-reservations-api";

export default function ChannelReservationsPage() {
  const { profile, session } = useSession();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const initialAssignment = params.get("assignment") || "";
  const adminPath = pathname.startsWith("/admin/");
  const Layout = adminPath || profile?.role === "admin" ? AdminLayout : MainLayout;
  const [sources, setSources] = useState<ReservationSource[]>([]);
  const [assignmentId, setAssignmentId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [reservations, setReservations] = useState<ImportedChannelReservation[]>([]);
  const [metadata, setMetadata] = useState<ReservationImport | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [progress, setProgress] = useState<ReservationSyncProgress | null>(null);
  const identity = `${session?.user.id}:${assignmentId}:${from}:${to}:${includeInactive}`;
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setTimeout(() => setRetryAt(0), Math.max(0, retryAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [retryAt]);

  useEffect(() => {
    if (!session || !profile || (adminPath && profile.role !== "admin")) return;
    let active = true;
    setSources([]); setAssignmentId(""); setReservations([]); setMetadata(null); setProgress(null); setSyncing(false); setError(""); setLoading(true);
    const load = async () => {
      try {
        const all: ReservationSource[] = [];
        let next: string | null = null;
        do {
          const page = await getReservationSources(next);
          if (!active) return;
          all.push(...page.sources); next = page.next_cursor;
        } while (next);
        setSources(all);
        if (initialAssignment && !all.some(source => source.id === initialAssignment)) {
          setError("Ce logement n’est pas accessible à votre profil.");
        } else setAssignmentId(initialAssignment || all[0]?.id || "");
      } catch (error) { if (active) setError(error instanceof Error ? error.message : "Impossible de charger les logements attribués."); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [session?.user.id, profile?.role, adminPath, initialAssignment]);

  const fail = (error: unknown) => {
    setError(error instanceof Error ? error.message : "Impossible de traiter la demande.");
    if (error instanceof ChannelApiError && error.retryAfter) setRetryAt(Date.now() + error.retryAfter * 1000);
  };
  const validPeriod = !(from && to && from >= to);
  useEffect(() => {
    setReservations([]); setMetadata(null); setCursor(null); setProgress(null);
    if (!validPeriod) { setLoading(false); return; }
    if (!assignmentId) return;
    let active = true;
    setLoading(true); setError("");
    getImportedChannelReservations(assignmentId, from, to, includeInactive).then(data => {
      if (active) { setReservations(data.reservations); setMetadata(data.import); setCursor(data.next_cursor); }
    }).catch(error => { if (active) setError(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [assignmentId, from, to, includeInactive, validPeriod]);

  const reloadCache = useCallback(async () => {
    const requestIdentity = identityRef.current;
    const data = await getImportedChannelReservations(assignmentId, from, to, includeInactive);
    if (!mounted.current || requestIdentity !== identityRef.current) return;
    setReservations(data.reservations); setMetadata(data.import); setCursor(data.next_cursor);
  }, [assignmentId, from, to, includeInactive]);
  const refresh = async () => {
    setLoading(true); setError("");
    try { await reloadCache(); } catch (error) { fail(error); } finally { setLoading(false); }
  };
  const more = async () => {
    const requestIdentity = identityRef.current;
    setLoading(true); setError("");
    try {
      const data = await getImportedChannelReservations(assignmentId, from, to, includeInactive, cursor);
      if (!mounted.current || requestIdentity !== identityRef.current) return;
      if (data.import?.imported_at !== metadata?.imported_at) throw new Error("Un nouvel import a été publié. Rechargez la copie importée avant de poursuivre la lecture.");
      setReservations(previous => [...previous, ...data.reservations]); setCursor(data.next_cursor);
    } catch (error) { fail(error); } finally { setLoading(false); }
  };
  const synchronize = async (restart: boolean) => {
    const requestIdentity = identityRef.current;
    setSyncing(true); setError("");
    try {
      let current = await startChannelReservationSync(assignmentId, from, to, restart);
      while (mounted.current && requestIdentity === identityRef.current) {
        setProgress(current);
        if (current.status === "completed") {
          toast.success(`Import complet : ${current.reservation_count} réservation(s), annulations comprises.`);
          await reloadCache();
          break;
        }
        current = await advanceChannelReservationSync(current.job_id);
      }
    } catch (error) { if (mounted.current && requestIdentity === identityRef.current) fail(error); }
    finally { if (mounted.current && requestIdentity === identityRef.current) setSyncing(false); }
  };
  const source = sources.find(source => source.id === assignmentId);
  const disabled = syncing || loading;

  return <Layout>
    <div className="mx-auto max-w-5xl space-y-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><Badge variant="secondary">Nouveau channel</Badge><h1 className="mt-2 text-2xl font-bold">Réservations synchronisées</h1></div><Button asChild variant="outline"><Link to={profile?.role === "admin" ? "/admin/channel-onboarding" : "/bookings"}>{profile?.role === "admin" ? "Attributions des logements" : "Réservations Krossbooking"}</Link></Button></div>
      <Alert><AlertDescription>Cette vue utilise uniquement les logements déjà attribués. Les réservations restent séparées de Krossbooking. Un import incomplet ne remplace jamais la copie précédente.</AlertDescription></Alert>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <Card><CardHeader><CardTitle className="text-lg">Logement et période</CardTitle></CardHeader><CardContent className="space-y-4">
        <Label htmlFor="reservation-source">Logement attribué</Label>
        <Select value={assignmentId} onValueChange={setAssignmentId} disabled={disabled || !sources.length}><SelectTrigger id="reservation-source"><SelectValue placeholder={loading ? "Chargement des attributions…" : "Choisir un logement"} /></SelectTrigger><SelectContent>{sources.map(source => <SelectItem key={source.id} value={source.id}>{source.property_id} · {source.environment}{source.profiles ? ` · ${[source.profiles.first_name, source.profiles.last_name].filter(Boolean).join(" ")}` : ""}</SelectItem>)}</SelectContent></Select>
        {source && <p className="break-all text-xs text-muted-foreground">Agence {source.agency_id} · Environnement {source.environment}</p>}
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="reservation-from">Début inclus (optionnel)</Label><Input id="reservation-from" type="date" value={from} disabled={disabled} onChange={event => setFrom(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="reservation-to">Fin exclusive (optionnelle)</Label><Input id="reservation-to" type="date" value={to} disabled={disabled} onChange={event => setTo(event.target.value)} /></div></div>
        <p className="text-xs text-muted-foreground">Les séjours chevauchant [début, fin) sont sélectionnés par l’API. Sans dates, tout le logement est importé. Chaque période possède son propre instantané : un import ne désactive pas les réservations d’une autre période.</p>
        {!validPeriod && <p role="alert" className="text-sm text-destructive">La fin exclusive doit être après le début.</p>}
        <div className="flex flex-wrap gap-2"><Button disabled={disabled || !!retryAt || !assignmentId || !validPeriod} onClick={() => synchronize(false)}>{syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}{progress?.status === "syncing" ? "Reprendre l’import" : "Synchroniser les réservations"}</Button>{progress?.status === "syncing" && !syncing && <Button variant="outline" disabled={loading || !!retryAt} onClick={() => synchronize(true)}>Recommencer l’import</Button>}<Button variant="outline" disabled={disabled || !assignmentId || !validPeriod} onClick={refresh}>Recharger la copie importée</Button></div>
        {retryAt > 0 && <p role="status" className="text-sm text-muted-foreground">Quota commun logements + réservations atteint. Reprise possible après 60 secondes ; les données précédentes restent disponibles.</p>}
        {progress && <p role="status" className="text-sm text-muted-foreground">{progress.pages} page(s) reçue(s) · {progress.reservation_count} réservation(s) · {progress.status === "completed" ? "Import publié" : "Import temporaire, non publié"}</p>}
        {!loading && !sources.length && <p className="text-sm text-muted-foreground">Aucun logement attribué. Un administrateur doit d’abord réaliser le mapping dans l’onboarding.</p>}
      </CardContent></Card>
      {assignmentId && <Card><CardHeader><CardTitle className="text-lg">Copie importée · {reservations.length} réservation(s) affichée(s)</CardTitle></CardHeader><CardContent className="space-y-4">
        {metadata ? <div className="space-y-1 text-xs text-muted-foreground"><p>Dernier import complet sur ce site : {new Date(metadata.imported_at).toLocaleString("fr-FR")}</p><p>Lecture de l’API (fetched_at) : {new Date(metadata.fetched_at).toLocaleString("fr-FR")}</p><p>fetched_at est la date de lecture de l’export, pas la date de synchronisation NextPax. Les données proviennent des dernières réservations synchronisées localement sur le channel.</p></div> : <p className="text-sm text-muted-foreground">Aucun import complet pour ce logement et cette période. Lancez la synchronisation.</p>}
        <div className="flex items-center gap-2"><Checkbox id="include-inactive-reservations" checked={includeInactive} disabled={disabled} onCheckedChange={value => setIncludeInactive(value === true)} /><Label htmlFor="include-inactive-reservations">Afficher aussi les réservations disparues de ce périmètre</Label></div>
        <p className="text-xs text-muted-foreground">Les réservations annulées sont conservées avec leur statut source. « Disparue de ce périmètre » n’est pas un statut d’annulation.</p>
        <ChannelReservationRecords reservations={reservations} />
        {metadata && !loading && !reservations.length && <p className="text-sm text-muted-foreground">Aucune réservation dans le dernier import pour cette période et ce filtre.</p>}
        {cursor && <Button variant="outline" disabled={disabled} onClick={more}>Afficher les 100 suivantes</Button>}
      </CardContent></Card>}
    </div>
  </Layout>;
}
