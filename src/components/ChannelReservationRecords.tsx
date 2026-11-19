import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ImportedChannelReservation } from "@/lib/channel-reservations-api";

function renderValue(value: unknown) {
  if (value === null) return "Non renseigné";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export default function ChannelReservationRecords({ reservations }: { reservations: ImportedChannelReservation[] }) {
  return <Accordion type="multiple" className="space-y-3">
    {reservations.map(reservation => {
      const record = reservation.channel_reservations.payload;
      const source = reservation.reservation_id.startsWith("np_") ? "NextPax" : reservation.reservation_id.startsWith("hist_") ? "Historique" : "Directe";
      return <AccordionItem key={reservation.reservation_id} value={reservation.reservation_id} className="rounded-lg border px-4">
        <AccordionTrigger className="gap-3 text-left hover:no-underline">
          <div className="min-w-0 space-y-2">
            <p className="break-all text-sm font-medium">{reservation.reservation_id}</p>
            <div className="flex flex-wrap gap-2"><Badge variant="secondary">{source}</Badge>{!reservation.is_active && <Badge variant="outline">Disparue de ce périmètre</Badge>}</div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <dl className="grid gap-3 sm:grid-cols-2">
            {Object.entries(record).filter(([key]) => key !== "id").map(([key, value]) => <div key={key} className="min-w-0 rounded-md bg-muted/50 p-3">
              <dt className="mb-1 break-all text-xs font-medium text-muted-foreground">{key.replace(/_/g, " ")}</dt>
              <dd className="whitespace-pre-wrap break-all text-sm">{renderValue(value)}</dd>
            </div>)}
          </dl>
        </AccordionContent>
      </AccordionItem>;
    })}
  </Accordion>;
}
