import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCheck, Loader2, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import OnboardingOwnerPicker from "@/components/admin/OnboardingOwnerPicker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import {
  assignChannelOnboardingBatch, ChannelApiError, ChannelProperty, channelPropertyName,
  getChannelCatalog, getChannelOnboardingContext, OnboardingContext,
} from "@/lib/owner-channel-api";
import { onboardingOwnerName, PropertyMatch, proposeChannelOwners } from "@/lib/channel-onboarding-matching";

type Draft = {
  property: ChannelProperty;
  match: PropertyMatch;
  ownerId: string;
  selected: boolean;
  assigned: boolean;
  linkedOwnerIds: string[];
  message: string;
};
const emptyContext: OnboardingContext = { owners: [], rooms: [], assignments: [] };

export default function AdminChannelOnboardingPage() {
  const [context, setContext] = useState(emptyContext);
  const [scope, setScope] = useState<{ agency: string; environment: string } | null>(null);
  const [rows, setRows] = useState<Draft[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("pending");
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setTimeout(() => setRetryAt(0), Math.max(0, retryAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [retryAt]);
  useEffect(() => { setPage(0); }, [search, filter]);

  const fail = (error: unknown) => {
    setError(error instanceof Error ? error.message : "Impossible de traiter l’onboarding.");
    if (error instanceof ChannelApiError && error.retryAfter) setRetryAt(Date.now() + error.retryAfter * 1000);
  };
  const load = async (resume: boolean) => {
    setBusy(true); setError(""); setProgress(null);
    try {
      const source = resume ? context : await getChannelOnboardingContext();
      if (!resume) { setContext(source); setRows([]); setScope(null); setStarted(false); setCursor(null); setPage(0); }
      let currentCursor = resume ? cursor : null;
      let currentScope = resume ? scope : null;
      const seen = new Set<string>();
      do {
        if (currentCursor && seen.has(currentCursor)) throw new Error("Le channel a renvoyé un curseur répété. Chargement arrêté.");
        if (currentCursor) seen.add(currentCursor);
        const data = await getChannelCatalog(currentCursor);
        if (!data.agency_id || !data.environment) throw new Error("Agence ou environnement manquant dans la réponse du channel.");
        if (currentScope && (data.agency_id !== currentScope.agency || data.environment !== currentScope.environment)) {
          throw new Error("La clé a changé d’agence ou d’environnement. Rechargez les données avant de valider.");
        }
        currentScope = { agency: data.agency_id, environment: data.environment };
        setScope(currentScope);
        const properties = data.properties.map(property => ({ ...property, id: property.id.toLowerCase() }));
        const matches = proposeChannelOwners(properties, source);
        const additions: Draft[] = properties.map(property => {
          const links = source.assignments.filter(link => link.property_id === property.id && link.agency_id === data.agency_id && link.environment === data.environment);
          const match = matches[property.id];
          return { property, match, ownerId: links[0]?.client_profile_id || match.suggestions[0]?.ownerId || "", selected: !links.length && match.strong,
            assigned: links.length > 0, linkedOwnerIds: links.map(link => link.client_profile_id), message: "" };
        });
        setRows(previous => {
          const ids = new Set(previous.map(row => row.property.id));
          return [...previous, ...additions.filter(row => !ids.has(row.property.id))];
        });
        setStarted(true);
        currentCursor = data.next_cursor;
        setCursor(currentCursor);
      } while (currentCursor);
    } catch (error) { fail(error); } finally { setBusy(false); }
  };

  const selected = rows.filter(row => row.selected && row.ownerId && !row.assigned);
  const filtered = useMemo(() => rows.filter(row => {
    const owner = context.owners.find(owner => owner.id === row.ownerId);
    const text = `${channelPropertyName(row.property)} ${row.property.id} ${owner ? onboardingOwnerName(owner) : ""} ${owner?.email || ""}`.toLowerCase();
    if (!text.includes(search.toLowerCase())) return false;
    if (filter === "pending") return !row.assigned;
    if (filter === "strong") return !row.assigned && row.match.strong;
    if (filter === "review") return !row.assigned && !row.match.strong;
    if (filter === "assigned") return row.assigned;
    return true;
  }), [rows, context.owners, search, filter]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 50));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * 50, currentPage * 50 + 50);
  const updateRow = (id: string, patch: Partial<Draft>) => setRows(previous => previous.map(row => row.property.id === id ? { ...row, ...patch } : row));

  const validate = async () => {
    if (!scope || !selected.length) return;
    const selection = selected.map(row => ({ property_id: row.property.id, client_profile_id: row.ownerId }));
    setConfirm(false); setBusy(true); setError(""); setProgress({ done: 0, total: selection.length });
    let successes = 0;
    try {
      for (let offset = 0; offset < selection.length; offset += 20) {
        const result = await assignChannelOnboardingBatch(selection.slice(offset, offset + 20), scope.agency, scope.environment);
        successes += result.results.filter(item => item.success).length;
        setRows(previous => previous.map(row => {
          const item = result.results.find(item => item.property_id === row.property.id);
          return item ? { ...row, assigned: item.success || row.assigned, selected: !item.success && row.selected,
            linkedOwnerIds: item.success ? [item.client_profile_id] : row.linkedOwnerIds, message: item.message } : row;
        }));
        setProgress({ done: Math.min(offset + 20, selection.length), total: selection.length });
        if (result.retry_after) setRetryAt(Date.now() + result.retry_after * 1000);
        if (result.stopped) {
          setError(result.results.find(item => !item.success)?.message || "Validation interrompue. Les lignes restantes sont conservées pour réessayer.");
          break;
        }
      }
      if (successes) toast.success(`${successes} logement(s) attribué(s).`);
    } catch (error) { fail(error); } finally { setBusy(false); }
  };

  return <AdminLayout>
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><Badge variant="secondary">Nouveau channel</Badge><h1 className="mt-2 text-2xl font-bold">Onboarding des logements</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Chargez le catalogue, vérifiez les propriétaires proposés et validez les attributions en lot. Les liens existants et Krossbooking restent inchangés.</p></div>
        <Button asChild variant="outline"><Link to="/admin/users">Gestion des clients</Link></Button>
      </div>
      <Alert><WandSparkles className="h-4 w-4" /><AlertDescription>Les propositions utilisent les noms des logements déjà liés aux profils et les noms des propriétaires. Ce ne sont pas des preuves d’identité : vérifiez la sélection avant de confirmer. Aucune attribution n’est créée au chargement.</AlertDescription></Alert>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={busy || !!retryAt} onClick={() => load(false)}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{started ? "Recharger et refaire les propositions" : "Charger et proposer les propriétaires"}</Button>
        {started && cursor && <Button variant="outline" disabled={busy || !!retryAt} onClick={() => load(true)}>Poursuivre le chargement</Button>}
        {retryAt > 0 && <p className="text-sm text-muted-foreground">Quota atteint : nouvelle tentative possible après 60 secondes.</p>}
        {scope && <p className="break-all text-xs text-muted-foreground">Agence {scope.agency} · Environnement {scope.environment}{started && !cursor && !busy ? " · Catalogue complet" : ""}</p>}
      </div>
      {started && <>
        <div className="grid gap-3 sm:grid-cols-3">
          {[{ label: "Logements chargés", value: rows.length }, { label: "Déjà attribués", value: rows.filter(row => row.assigned).length }, { label: "Sélectionnés pour validation", value: selected.length }].map(stat => <Card key={stat.label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{stat.label}</p><p className="mt-1 text-2xl font-bold">{stat.value}</p></CardContent></Card>)}
        </div>
        <Card>
          <CardHeader><CardTitle className="text-lg">Vérifier les rapprochements</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Input className="min-w-48 flex-1" aria-label="Rechercher dans les logements chargés" value={search} onChange={event => setSearch(event.target.value)} placeholder="Logement, propriétaire, e-mail ou UUID…" />
              <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">À attribuer</SelectItem><SelectItem value="strong">Propositions fortes</SelectItem><SelectItem value="review">À vérifier / sans proposition</SelectItem><SelectItem value="assigned">Déjà attribués</SelectItem><SelectItem value="all">Tous les logements</SelectItem></SelectContent></Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={busy} onClick={() => setRows(previous => previous.map(row => !row.assigned && row.match.strong ? { ...row, selected: !!row.ownerId } : row))}>Sélectionner les propositions fortes</Button>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => setRows(previous => previous.map(row => ({ ...row, selected: false })))}>Tout désélectionner</Button>
              <p className="self-center text-xs text-muted-foreground">Les rapprochements ambigus ne sont pas sélectionnés automatiquement.</p>
            </div>
            <Table><TableHeader><TableRow><TableHead className="w-10">Choix</TableHead><TableHead>Logement</TableHead><TableHead>Propriétaire</TableHead><TableHead>Rapprochement</TableHead></TableRow></TableHeader><TableBody>
              {visible.map(row => <TableRow key={row.property.id}>
                <TableCell><Checkbox aria-label={`Valider ${channelPropertyName(row.property)}`} checked={row.selected && !row.assigned} disabled={busy || row.assigned || !row.ownerId} onCheckedChange={value => updateRow(row.property.id, { selected: value === true })} /></TableCell>
                <TableCell className="min-w-52 max-w-72"><p className="break-words font-medium">{channelPropertyName(row.property)}</p><p className="mt-1 break-all text-xs text-muted-foreground">{row.property.id}</p></TableCell>
                <TableCell className="min-w-64 max-w-80">
                  {row.assigned ? <div className="space-y-1">{row.linkedOwnerIds.map(id => <p key={id} className="break-all text-sm">{context.owners.find(owner => owner.id === id) ? onboardingOwnerName(context.owners.find(owner => owner.id === id)!) : id}</p>)}</div> : <>
                    <OnboardingOwnerPicker owners={context.owners} value={row.ownerId} disabled={busy} onChange={id => updateRow(row.property.id, { ownerId: id, selected: !!id, message: "" })} />
                    <p className="mt-1 break-all text-xs text-muted-foreground">{context.owners.find(owner => owner.id === row.ownerId)?.email}</p>
                  </>}
                </TableCell>
                <TableCell className="min-w-56 max-w-80">
                  <Badge variant={row.assigned ? "secondary" : row.match.strong ? "default" : "outline"}>{row.assigned ? "Déjà attribué" : row.match.strong ? "Proposition forte" : row.match.suggestions.length ? "À vérifier" : "Sans proposition"}</Badge>
                  {!row.assigned && <p className="mt-2 text-xs text-muted-foreground">{row.match.suggestions.find(suggestion => suggestion.ownerId === row.ownerId)?.reason || (row.ownerId ? "Propriétaire choisi manuellement." : "Choisissez un propriétaire dans la liste.")}</p>}
                  {!row.assigned && row.match.suggestions.length > 1 && <p className="mt-1 text-xs text-muted-foreground">Autres pistes : {row.match.suggestions.filter(suggestion => suggestion.ownerId !== row.ownerId).map(suggestion => context.owners.find(owner => owner.id === suggestion.ownerId)).filter(Boolean).map(owner => onboardingOwnerName(owner!)).join(", ")}</p>}
                  {row.message && <p role="status" className={`mt-2 text-xs ${row.assigned ? "text-muted-foreground" : "text-destructive"}`}>{row.message}</p>}
                </TableCell>
              </TableRow>)}
              {!visible.length && <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Aucun logement pour ce filtre.</TableCell></TableRow>}
            </TableBody></Table>
            <div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{filtered.length} logement(s) · Page {currentPage + 1}/{pageCount}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>Précédent</Button><Button variant="outline" size="sm" disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}>Suivant</Button></div></div>
          </CardContent>
        </Card>
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-4 shadow-lg">
          <div><p className="font-medium">{selected.length} attribution(s) sélectionnée(s), toutes pages confondues</p><p className="text-xs text-muted-foreground">Validation serveur par lots de 20. Les erreurs restent visibles pour correction.</p>{progress && <p role="status" className="mt-1 text-xs">{progress.done}/{progress.total} demandes traitées</p>}</div>
          <Button disabled={busy || !!retryAt || !selected.length} onClick={() => setConfirm(true)}><CheckCheck className="mr-2 h-4 w-4" />Valider les attributions</Button>
        </div>
      </>}
      <AlertDialog open={confirm} onOpenChange={setConfirm}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmer {selected.length} attribution(s) ?</AlertDialogTitle><AlertDialogDescription>Chaque propriétaire ci-dessous pourra accéder aux logements sélectionnés. Vérifiez les rapprochements : ils sont proposés à partir des noms, sans identifiant propriétaire fourni par le channel. Aucun lien existant ne sera remplacé.</AlertDialogDescription></AlertDialogHeader>
        <div className="max-h-64 space-y-2 overflow-y-auto text-sm">{selected.map(row => <div key={row.property.id} className="rounded-md border p-2"><p className="font-medium">{channelPropertyName(row.property)}</p><p>{context.owners.find(owner => owner.id === row.ownerId) ? onboardingOwnerName(context.owners.find(owner => owner.id === row.ownerId)!) : row.ownerId}</p><p className="break-all text-xs text-muted-foreground">{context.owners.find(owner => owner.id === row.ownerId)?.email}</p></div>)}</div>
        <AlertDialogFooter><AlertDialogCancel>Revenir aux propositions</AlertDialogCancel><AlertDialogAction onClick={validate}>Confirmer et attribuer</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent></AlertDialog>
    </div>
  </AdminLayout>;
}
