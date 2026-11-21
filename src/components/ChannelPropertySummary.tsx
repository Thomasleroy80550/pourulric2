import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowDown, ArrowUp, Check, ImageOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ChannelProperty, ChannelPropertyPhoto } from "@/lib/owner-channel-api";
import {
  channelPhotoKey,
  channelPropertyDescription,
  channelPropertyEquipments,
  channelPropertyPhotos,
  channelPropertyTitle,
} from "@/lib/channel-property-display";
import { saveChannelPhotoOrder } from "@/lib/channel-photo-order-api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ChannelPropertySummaryProps {
  property?: ChannelProperty;
  compact?: boolean;
  allowPhotoReorder?: boolean;
}

function sameOrder(a: ChannelPropertyPhoto[], b: ChannelPropertyPhoto[]) {
  return a.length === b.length && a.every((photo, index) => channelPhotoKey(photo) === channelPhotoKey(b[index]));
}

export default function ChannelPropertySummary({ property, compact = false, allowPhotoReorder = false }: ChannelPropertySummaryProps) {
  const queryClient = useQueryClient();
  const basePhotos = useMemo(() => property ? channelPropertyPhotos(property) : [], [property]);
  const [currentPhotos, setCurrentPhotos] = useState<ChannelPropertyPhoto[]>(basePhotos);
  const [draftPhotos, setDraftPhotos] = useState<ChannelPropertyPhoto[] | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const photos = draftPhotos ?? currentPhotos;
  const equipments = useMemo(() => property ? channelPropertyEquipments(property) : [], [property]);
  const orderChanged = draftPhotos !== null && !sameOrder(draftPhotos, currentPhotos);

  useEffect(() => {
    setCurrentPhotos(basePhotos);
    setDraftPhotos(null);
  }, [basePhotos, property?.id]);

  if (!property) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Ce logement local n’est pas encore lié explicitement à un logement Cadence. Un administrateur doit compléter le lien dans les attributions.
        </AlertDescription>
      </Alert>
    );
  }

  const title = channelPropertyTitle(property);
  const description = channelPropertyDescription(property);
  const movePhoto = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= photos.length) return;
    const next = [...photos];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setDraftPhotos(next);
  };
  const saveOrder = async () => {
    if (!draftPhotos || !orderChanged) return;
    setSavingOrder(true);
    try {
      const result = await saveChannelPhotoOrder(property, draftPhotos.map(photo => photo.url));
      const byUrl = new Map(draftPhotos.map(photo => [photo.url, photo]));
      const applied = result.images.map(url => byUrl.get(url)).filter((photo): photo is ChannelPropertyPhoto => Boolean(photo));
      setCurrentPhotos(applied);
      setDraftPhotos(null);
      await queryClient.invalidateQueries({ queryKey: ["myChannelProperties"] });
      toast.success("Ordre des photos appliqué dans Cadence et propagé aux canaux.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d’enregistrer l’ordre des photos.");
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Données Cadence</p>
          <h3 className="mt-1 text-xl font-semibold">{title}</h3>
        </div>
        {allowPhotoReorder && photos.length > 1 && (
          <Button type="button" size="sm" onClick={() => void saveOrder()} disabled={!orderChanged || savingOrder}>
            {savingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Enregistrer l’ordre
          </Button>
        )}
      </div>

      {description ? (
        <p className={compact ? "line-clamp-4 whitespace-pre-line text-sm leading-6 text-muted-foreground" : "whitespace-pre-line text-sm leading-6 text-muted-foreground"}>
          {description}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Aucune description Cadence disponible pour ce logement.</p>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">Équipements Cadence</p>
        {equipments.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {equipments.map(equipment => <Badge key={equipment} variant="secondary">{equipment}</Badge>)}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">L’API Cadence actuelle ne renvoie pas les équipements de ce logement.</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Photos</p>
          {allowPhotoReorder && photos.length > 1 && <p className="text-xs text-muted-foreground">Utilisez les flèches puis enregistrez l’ordre.</p>}
        </div>
        {photos.length > 0 ? (
          <div className={compact ? "grid grid-cols-3 gap-2" : "grid grid-cols-2 gap-3 md:grid-cols-3"}>
            {(allowPhotoReorder ? photos : photos.slice(0, compact ? 3 : 9)).map((photo, index) => (
              <figure key={channelPhotoKey(photo)} className="relative overflow-hidden rounded-lg border bg-background">
                <img
                  src={photo.url}
                  alt={photo.caption || `${title} — photo ${index + 1}`}
                  loading="lazy"
                  className={compact ? "h-24 w-full object-cover" : "h-36 w-full object-cover"}
                />
                <figcaption className="flex items-center justify-between gap-2 p-2 text-xs">
                  <span className="truncate">{photo.caption || `Photo ${index + 1}`}</span>
                  {allowPhotoReorder ? (
                    <span className="flex shrink-0 items-center gap-1">
                      <Button type="button" variant="outline" size="icon" className="h-7 w-7" disabled={index === 0 || savingOrder} onClick={() => movePhoto(index, -1)} aria-label={`Monter la photo ${index + 1}`}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" variant="outline" size="icon" className="h-7 w-7" disabled={index === photos.length - 1 || savingOrder} onClick={() => movePhoto(index, 1)} aria-label={`Descendre la photo ${index + 1}`}>
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </span>
                  ) : (
                    <Badge variant="outline">{index + 1}</Badge>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <ImageOff className="h-4 w-4" />
            Aucune photo Cadence disponible.
          </div>
        )}
      </div>
    </section>
  );
}
