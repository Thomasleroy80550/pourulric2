import { AlertCircle, ImageOff } from "lucide-react";
import type { ChannelProperty } from "@/lib/owner-channel-api";
import { channelPropertyDescription, channelPropertyPhotos, channelPropertyTitle } from "@/lib/channel-property-display";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ChannelPropertySummaryProps {
  property?: ChannelProperty;
  compact?: boolean;
}

export default function ChannelPropertySummary({ property, compact = false }: ChannelPropertySummaryProps) {
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
  const photos = channelPropertyPhotos(property);

  return (
    <section className="space-y-4 rounded-xl border bg-muted/20 p-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Données Cadence</p>
        <h3 className="mt-1 text-xl font-semibold">{title}</h3>
      </div>

      {description ? (
        <p className={compact ? "line-clamp-4 whitespace-pre-line text-sm leading-6 text-muted-foreground" : "whitespace-pre-line text-sm leading-6 text-muted-foreground"}>
          {description}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Aucune description Cadence disponible pour ce logement.</p>
      )}

      {photos.length > 0 ? (
        <div className={compact ? "grid grid-cols-3 gap-2" : "grid grid-cols-2 gap-3 md:grid-cols-3"}>
          {photos.slice(0, compact ? 3 : 9).map((photo, index) => (
            <img
              key={photo.url}
              src={photo.url}
              alt={photo.caption || `${title} — photo ${index + 1}`}
              loading="lazy"
              className={compact ? "h-24 w-full rounded-lg object-cover" : "h-36 w-full rounded-lg object-cover"}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          <ImageOff className="h-4 w-4" />
          Aucune photo Cadence disponible.
        </div>
      )}
    </section>
  );
}
