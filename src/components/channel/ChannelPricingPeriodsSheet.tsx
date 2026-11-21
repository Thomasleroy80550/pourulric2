import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ChannelPricingReadPeriod } from "@/lib/channel-features-api";
import type { DraftPeriod } from "./ChannelPricingEditor";

interface ChannelPricingPeriodsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyName: string;
  drafts: DraftPeriod[];
  managedPeriods: ChannelPricingReadPeriod[];
  canEdit: boolean;
  saving: boolean;
  onEdit: (draft: DraftPeriod) => void;
  onDelete: (draft: DraftPeriod) => void;
  formatPrice: (price: number) => string;
  otaRange: (price: number) => string | null;
}

function dates(from: string, to: string) {
  const start = format(parseISO(from), "d MMM yyyy", { locale: fr });
  return from === to ? start : `${start} → ${format(parseISO(to), "d MMM yyyy", { locale: fr })}`;
}

export default function ChannelPricingPeriodsSheet({
  open, onOpenChange, propertyName, drafts, managedPeriods, canEdit, saving, onEdit, onDelete, formatPrice, otaRange,
}: ChannelPricingPeriodsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="mb-6 text-left">
          <SheetTitle>Mes périodes</SheetTitle>
          <SheetDescription>{propertyName}</SheetDescription>
        </SheetHeader>
        <div className="space-y-6">
          <section>
            <h3 className="mb-3 text-sm font-semibold">Mes prix personnalisés</h3>
            {drafts.length === 0 ? <p className="rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground">Vous n’avez pas encore ajouté de prix personnalisé.</p> : (
              <div className="space-y-3">
                {drafts.map(draft => (
                  <div key={draft.key} className="rounded-xl border p-4">
                    {draft.label && <p className="mb-1 text-sm font-medium">{draft.label}</p>}
                    <p className="text-sm">{dates(draft.start_date, draft.end_date)}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-lg font-semibold">{formatPrice(Number(draft.price))}<span className="ml-1 text-xs font-normal text-muted-foreground">/ nuit</span></p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Plateformes : {otaRange(Number(draft.price))} estimés</p>
                        <p className="mt-1 text-xs text-muted-foreground">{draft.min_stay || "1"} nuit(s) minimum</p>
                      </div>
                      {canEdit && (
                        <div className="flex gap-1">
                          <Button type="button" variant="ghost" size="icon" aria-label="Modifier cette période" disabled={saving} onClick={() => onEdit(draft)}><Pencil className="h-4 w-4" /></Button>
                          <Button type="button" variant="ghost" size="icon" aria-label="Supprimer cette période" className="text-muted-foreground hover:text-red-600" disabled={saving} onClick={() => onDelete(draft)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          {managedPeriods.length > 0 && (
            <section>
              <h3 className="mb-1 text-sm font-semibold">Prix gérés pour vous</h3>
              <p className="mb-3 text-xs text-muted-foreground">Les prix de la conciergerie sont prioritaires et ne sont pas modifiables ici.</p>
              <div className="space-y-2">
                {managedPeriods.map(period => (
                  <div key={period.id} className="rounded-xl bg-muted/30 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">{period.source === "beyond" ? "Beyond" : "Conciergerie"}{period.label ? ` · ${period.label}` : ""}</p>
                      <p className="text-sm font-semibold">{formatPrice(period.price)}</p>
                    </div>
                    <p className="mt-1 text-sm">{dates(period.start_date, period.end_date)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Plateformes : {otaRange(period.price)} estimés</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
