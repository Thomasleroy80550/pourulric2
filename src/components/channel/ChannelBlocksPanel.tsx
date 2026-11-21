import { useCallback, useEffect, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, Loader2, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChannelBlocksPage, createChannelBlock, getChannelBlocks } from "@/lib/channel-features-api";
import { ChannelApiError } from "@/lib/owner-channel-api";

function isoToday() {
  return format(new Date(), "yyyy-MM-dd");
}
function isoTomorrow() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return format(tomorrow, "yyyy-MM-dd");
}
function displayDate(value: string) {
  const date = parseISO(value);
  return isValid(date) ? format(date, "d MMMM yyyy", { locale: fr }) : "date à choisir";
}

export default function ChannelBlocksPanel({ assignmentId, isAdmin }: { assignmentId: string; isAdmin: boolean }) {
  const [data, setData] = useState<ChannelBlocksPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [checkIn, setCheckIn] = useState(isoToday);
  const [checkOut, setCheckOut] = useState(isoTomorrow);
  const [cleaningRequested, setCleaningRequested] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [retryAt, setRetryAt] = useState(0);
  const validDates = checkIn < checkOut;

  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setTimeout(() => setRetryAt(0), Math.max(0, retryAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [retryAt]);

  const resetRequest = () => {
    setRequestId(crypto.randomUUID());
    setConfirmed(false);
  };
  const changeCheckIn = (value: string) => { setCheckIn(value); resetRequest(); };
  const changeCheckOut = (value: string) => { setCheckOut(value); resetRequest(); };
  const changeCleaning = (value: boolean) => { setCleaningRequested(value); resetRequest(); };

  const load = useCallback(async () => {
    if (!assignmentId) return;
    setLoading(true);
    setError("");
    try {
      setData(await getChannelBlocks(assignmentId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Blocages indisponibles.");
      if (loadError instanceof ChannelApiError && loadError.retryAfter) setRetryAt(Date.now() + loadError.retryAfter * 1000);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    setData(null);
    setError("");
    resetRequest();
    void load();
  }, [load]);

  const create = async () => {
    if (!validDates || !confirmed || creating || isAdmin) return;
    setCreating(true);
    setError("");
    try {
      const result = await createChannelBlock({
        assignmentId,
        requestId,
        checkIn,
        checkOut,
        cleaningRequested,
      });
      toast.success(result.replayed ? "Demande déjà enregistrée : aucun doublon créé." : "Séjour propriétaire créé.");
      resetRequest();
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Création impossible.");
      if (createError instanceof ChannelApiError && createError.retryAfter) setRetryAt(Date.now() + createError.retryAfter * 1000);
    } finally {
      setCreating(false);
    }
  };

  const nights = validDates ? Math.max(0, Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000)) : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5" /> Séjours propriétaires</CardTitle>
          <p className="text-sm text-muted-foreground">La création ferme les nuits dans Cadence/NextPax. Il n’existe pas de suppression côté API : un blocage posé doit être levé par le gestionnaire.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdmin ? (
            <Alert><AlertDescription>Consultation administrateur uniquement. La création doit être effectuée depuis le profil propriétaire actuellement attribué.</AlertDescription></Alert>
          ) : (
            <div className="rounded-lg border p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="owner-block-check-in">Arrivée</Label><Input id="owner-block-check-in" type="date" min={isoToday()} value={checkIn} onChange={event => changeCheckIn(event.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="owner-block-check-out">Départ (exclu)</Label><Input id="owner-block-check-out" type="date" min={checkIn} value={checkOut} onChange={event => changeCheckOut(event.target.value)} /></div>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Checkbox id="owner-block-cleaning" checked={cleaningRequested} onCheckedChange={value => changeCleaning(value === true)} />
                  <Label htmlFor="owner-block-cleaning" className="text-sm font-normal">Annoter ce séjour avec une demande de ménage (aucune intervention n’est créée automatiquement).</Label>
                </div>
                <div className="flex items-start gap-2 rounded-md bg-muted p-3">
                  <Checkbox id="owner-block-confirm" checked={confirmed} onCheckedChange={value => setConfirmed(value === true)} />
                  <Label htmlFor="owner-block-confirm" className="text-sm font-normal">
                    Je confirme explicitement bloquer {nights} nuit(s) pour mon usage propriétaire, du {displayDate(checkIn)} au {displayDate(checkOut)} (départ exclu).
                  </Label>
                </div>
              </div>
              {!validDates && <p role="alert" className="mt-2 text-sm text-destructive">Le départ exclu doit être après l’arrivée.</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button onClick={() => void create()} disabled={!validDates || !confirmed || creating || !!retryAt}>
                  {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Créer le séjour propriétaire
                </Button>
                <p className="text-xs text-muted-foreground">Identifiant d’idempotence conservé pour une reprise sûre : {requestId.slice(0, 8)}…</p>
              </div>
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Action refusée ou indisponible</AlertTitle>
              <AlertDescription>{error}{error.includes("Comptes") ? " Activez d’abord la permission dans Cadence → Comptes → API privée." : ""}{retryAt ? " Réessayez après la fenêtre de quota." : ""}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-lg">Blocages actifs et en attente</CardTitle>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading || !!retryAt}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Actualiser
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {data?.local_requests.length ? (
            <Alert>
              <AlertDescription>
                {data.local_requests.length} demande(s) locale(s) à reprendre ou vérifier. Réessayez avec le même identifiant après correction ; ne changez pas les dates sans générer une nouvelle demande.
              </AlertDescription>
            </Alert>
          ) : null}
          {loading && !data && <p className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement des blocages…</p>}
          {data && !data.blocks.length && <p className="text-sm text-muted-foreground">Aucun blocage actif ou en attente pour ce logement.</p>}
          <div className="space-y-2">
            {data?.blocks.map(block => (
              <div key={block.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="font-medium">{displayDate(block.check_in)} → {displayDate(block.check_out)}</p>
                  <p className="text-xs text-muted-foreground">Départ exclu · {block.cleaning_requested ? "ménage demandé" : "sans demande de ménage"} · {block.id.slice(0, 8)}…</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={block.status === "active" ? "default" : "secondary"}>{block.status === "active" ? "Actif" : "En cours côté gestionnaire"}</Badge>
                  {block.created_here && <Badge variant="outline">Créé depuis cet espace</Badge>}
                </div>
              </div>
            ))}
          </div>
          {data?.local_requests.map(request => (
            <div key={request.request_id} className="rounded-lg border border-dashed p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{displayDate(request.check_in)} → {displayDate(request.check_out)}</p>
                <Badge variant={request.status === "pending" ? "secondary" : "destructive"}>{request.status === "pending" ? "Reprise possible" : "Refusé / à vérifier"}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Demande {request.request_id} · {new Date(request.created_at).toLocaleString("fr-FR")}</p>
              {request.last_error && <p className="mt-1 text-xs text-muted-foreground">{request.last_error}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
