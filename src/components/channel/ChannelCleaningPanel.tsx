import { useCallback, useEffect, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Camera, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChannelCleaningDetail,
  ChannelCleaningIntervention,
  getChannelCleaningDetail,
  getChannelCleaningList,
} from "@/lib/channel-features-api";
import { ChannelApiError } from "@/lib/owner-channel-api";

const statusLabels = {
  todo: "À faire",
  in_progress: "En cours",
  done: "Terminé",
} as const;

function displayDate(value: string) {
  const date = parseISO(value);
  return isValid(date) ? format(date, "d MMMM yyyy", { locale: fr }) : value;
}
function displayDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("fr-FR");
}

export default function ChannelCleaningPanel({ assignmentId }: { assignmentId: string }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [interventions, setInterventions] = useState<ChannelCleaningIntervention[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ChannelCleaningDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const validPeriod = !(from && to && from >= to);

  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setTimeout(() => setRetryAt(0), Math.max(0, retryAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [retryAt]);

  const load = useCallback(async (appendCursor: string | null = null) => {
    if (!assignmentId || !validPeriod) return;
    setLoading(true);
    setError("");
    try {
      const page = await getChannelCleaningList({ assignmentId, cursor: appendCursor, from, to, limit: 50 });
      setInterventions(previous => appendCursor ? [...previous, ...page.interventions] : page.interventions);
      setCursor(page.next_cursor);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Interventions indisponibles.");
      if (loadError instanceof ChannelApiError && loadError.retryAfter) setRetryAt(Date.now() + loadError.retryAfter * 1000);
    } finally {
      setLoading(false);
    }
  }, [assignmentId, from, to, validPeriod]);

  useEffect(() => {
    setInterventions([]);
    setCursor(null);
    void load();
  }, [load]);

  const loadDetail = async (jobId: string, photoCursor: string | null = null) => {
    setDetailLoading(true);
    setError("");
    try {
      const page = await getChannelCleaningDetail({ assignmentId, jobId, photoCursor, limit: 50 });
      setDetail(previous => photoCursor && previous
        ? { ...page, photos: [...previous.photos, ...page.photos] }
        : page);
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : "Photos indisponibles.");
      if (detailError instanceof ChannelApiError && detailError.retryAfter) setRetryAt(Date.now() + detailError.retryAfter * 1000);
    } finally {
      setDetailLoading(false);
    }
  };

  const openDetail = (id: string) => {
    setSelectedId(id);
    setDetail(null);
    void loadDetail(id);
  };
  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-5 w-5" /> Ménages et photos</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Lecture des interventions Cadence. Les liens photos expirent après cinq minutes et ne sont jamais stockés localement.</p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading || !!retryAt || !validPeriod}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Actualiser
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="cleaning-from">Prévu à partir du</Label><Input id="cleaning-from" type="date" value={from} onChange={event => setFrom(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="cleaning-to">Jusqu’au (exclu)</Label><Input id="cleaning-to" type="date" value={to} onChange={event => setTo(event.target.value)} /></div>
        </div>
        {!validPeriod && <Alert variant="destructive"><AlertDescription>La fin exclusive doit être après le début.</AlertDescription></Alert>}
        {error && <Alert variant="destructive"><AlertDescription>{error}{retryAt ? " Réessayez après la fenêtre de quota." : ""}</AlertDescription></Alert>}
        {loading && !interventions.length && <p className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement des interventions…</p>}
        {!loading && !interventions.length && !error && <p className="text-sm text-muted-foreground">Aucune intervention sur ce filtre.</p>}
        <div className="space-y-2">
          {interventions.map(intervention => (
            <button key={intervention.id} type="button" onClick={() => openDetail(intervention.id)} className="w-full rounded-lg border p-3 text-left transition hover:bg-accent">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{displayDate(intervention.scheduled_date)}</p>
                  <p className="text-sm text-muted-foreground">{intervention.rooms.join(" · ")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Début {displayDateTime(intervention.started_at)} · fin {displayDateTime(intervention.completed_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={intervention.status === "done" ? "default" : intervention.status === "in_progress" ? "secondary" : "outline"}>{statusLabels[intervention.status]}</Badge>
                  <Camera className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </button>
          ))}
        </div>
        {cursor && <Button variant="outline" onClick={() => void load(cursor)} disabled={loading}>{loading ? "Chargement…" : "Afficher les 50 suivantes"}</Button>}
      </CardContent>

      <Dialog open={!!selectedId} onOpenChange={open => { if (!open) closeDetail(); }}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détail de l’intervention</DialogTitle>
            <DialogDescription>Photos avant/après avec liens temporaires Cadence.</DialogDescription>
          </DialogHeader>
          {detailLoading && !detail && <p className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement du détail…</p>}
          {detail && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{displayDate(detail.intervention.scheduled_date)} · {statusLabels[detail.intervention.status]}</p>
                <p className="text-muted-foreground">{detail.intervention.rooms.join(" · ")}</p>
                <p className="mt-1 text-xs text-muted-foreground">Les URL expirent dans environ {detail.photos_url_expires_in} secondes.</p>
              </div>
              {!detail.photos.length && <p className="text-sm text-muted-foreground">Aucune photo pour cette intervention.</p>}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {detail.photos.map(photo => (
                  <figure key={photo.id} className="overflow-hidden rounded-lg border bg-muted">
                    <img src={photo.url} alt={`${photo.room} — ${photo.phase === "before" ? "avant" : "après"}`} className="h-48 w-full object-cover" loading="lazy" />
                    <figcaption className="space-y-1 p-2 text-xs">
                      <div className="flex items-center justify-between gap-2"><span className="font-medium">{photo.room}</span><Badge variant={photo.phase === "before" ? "outline" : "secondary"}>{photo.phase === "before" ? "Avant" : "Après"}</Badge></div>
                      <p className="text-muted-foreground">{displayDateTime(photo.created_at)}</p>
                    </figcaption>
                  </figure>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {detail.next_photo_cursor && <Button variant="outline" onClick={() => selectedId && void loadDetail(selectedId, detail.next_photo_cursor)} disabled={detailLoading}>Afficher plus de photos</Button>}
                <Button variant="outline" onClick={() => selectedId && void loadDetail(selectedId)} disabled={detailLoading}>Régénérer les liens temporaires</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
