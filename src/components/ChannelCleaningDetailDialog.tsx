import { useCallback, useEffect, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getChannelCleaningDetail, type ChannelCleaningDetail } from "@/lib/channel-features-api";
import type { HousekeepingTask } from "@/lib/housekeeping-api";

interface ChannelCleaningDetailDialogProps {
  task: HousekeepingTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function displayDate(value: string) {
  const date = parseISO(value);
  return isValid(date) ? format(date, "d MMMM yyyy", { locale: fr }) : value;
}

function displayDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("fr-FR");
}

export default function ChannelCleaningDetailDialog({ task, open, onOpenChange }: ChannelCleaningDetailDialogProps) {
  const [detail, setDetail] = useState<ChannelCleaningDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (photoCursor: string | null = null) => {
    if (!task) return;
    setLoading(true);
    setError("");
    try {
      const page = await getChannelCleaningDetail({ assignmentId: task.assignmentId, jobId: task.jobId, photoCursor, limit: 50 });
      setDetail(previous => photoCursor && previous ? { ...page, photos: [...previous.photos, ...page.photos] } : page);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Photos indisponibles.");
    } finally {
      setLoading(false);
    }
  }, [task]);

  useEffect(() => {
    if (open && task) {
      setDetail(null);
      void load();
    }
    if (!open) {
      setDetail(null);
      setError("");
    }
  }, [open, task, load]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détail du ménage Cadence</DialogTitle>
          <DialogDescription>Photos avant/après avec liens temporaires, jamais stockés localement.</DialogDescription>
        </DialogHeader>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        {loading && !detail && <p className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement du détail…</p>}
        {detail && (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{task?.room} · {displayDate(detail.intervention.scheduled_date)}</p>
              <p className="text-muted-foreground">{detail.intervention.rooms.join(" · ")}</p>
              <p className="mt-1 text-xs text-muted-foreground">Début {displayDateTime(detail.intervention.started_at)} · fin {displayDateTime(detail.intervention.completed_at)} · URL valables environ {detail.photos_url_expires_in} secondes.</p>
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
              {detail.next_photo_cursor && <Button variant="outline" onClick={() => void load(detail.next_photo_cursor)} disabled={loading}>Afficher plus de photos</Button>}
              <Button variant="outline" onClick={() => void load()} disabled={loading}>Régénérer les liens temporaires</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
