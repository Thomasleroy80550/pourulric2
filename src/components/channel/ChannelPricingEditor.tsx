import { useState } from "react";
import { ArrowRight, Check, ChevronDown, Loader2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface DraftPeriod {
  key: string;
  start_date: string;
  end_date: string;
  price: string;
  min_stay: string;
  max_stay: string;
  label: string;
}

interface ChannelPricingEditorProps {
  properties: { id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  draft: DraftPeriod | null;
  onChange: (patch: Partial<DraftPeriod>) => void;
  onSave: () => void;
  onCancel: () => void;
  onShowPeriods: () => void;
  minDate: string;
  currency: string;
  disabled: boolean;
  readOnly: boolean;
  saving: boolean;
  error: string;
  otaPrices: { name: string; price: string; markup: number }[];
}

export default function ChannelPricingEditor({
  properties, selectedId, onSelect, draft, onChange, onSave, onCancel,
  onShowPeriods, minDate, currency, disabled, readOnly, saving, error, otaPrices,
}: ChannelPricingEditorProps) {
  const [showOta, setShowOta] = useState(false);
  const property = properties.find(item => item.id === selectedId);

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {properties.length > 1 ? (
          <Select value={selectedId} onValueChange={onSelect} disabled={saving}>
            <SelectTrigger aria-label="Choisir un logement" className="h-10 w-full max-w-xs rounded-xl border-0 bg-muted/50 font-medium">
              <SelectValue placeholder="Choisir un logement" />
            </SelectTrigger>
            <SelectContent>
              {properties.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : <p className="font-semibold">{property?.name || "Mon logement"}</p>}
        <Button type="button" variant="ghost" size="sm" className="rounded-full text-muted-foreground" onClick={onShowPeriods} disabled={!property || saving}>
          Voir mes périodes <ArrowRight className="ml-2 h-3.5 w-3.5" />
        </Button>
      </div>

      {readOnly ? (
        <div className="rounded-xl bg-muted/40 p-4">
          <p className="font-medium">Vos prix sont gérés automatiquement</p>
          <p className="mt-1 text-sm text-muted-foreground">Beyond s’occupe de vos tarifs. Vous pouvez les consulter dans le calendrier.</p>
        </div>
      ) : (
        <form onSubmit={event => { event.preventDefault(); onSave(); }}>
          <div className="grid items-start gap-6 md:grid-cols-[1.5fr_1fr_auto]">
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-semibold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs">1</span> Mes dates</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="simple-price-from" className="text-xs text-muted-foreground">Du</Label>
                  <Input id="simple-price-from" type="date" min={minDate} required value={draft?.start_date ?? ""} onChange={event => onChange({ start_date: event.target.value, ...(!draft?.end_date || draft.end_date < event.target.value ? { end_date: event.target.value } : {}) })} disabled={disabled || saving} className="h-12 min-w-0 rounded-xl bg-muted/20 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="simple-price-to" className="text-xs text-muted-foreground">Au (inclus)</Label>
                  <Input id="simple-price-to" type="date" min={draft?.start_date || minDate} required value={draft?.end_date ?? ""} onChange={event => onChange({ end_date: event.target.value, ...(!draft?.start_date ? { start_date: event.target.value } : {}) })} disabled={disabled || saving} className="h-12 min-w-0 rounded-xl bg-muted/20 text-sm" />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-semibold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs">2</span> Mon prix par nuit</p>
              <div className="space-y-1.5">
                <Label htmlFor="simple-nightly-price" className="text-xs text-muted-foreground">Hors majoration des plateformes</Label>
                <div className="relative">
                  <Input id="simple-nightly-price" type="number" min="0" max="100000" step="0.01" inputMode="decimal" required placeholder="Ex. 125" value={draft?.price ?? ""} onChange={event => onChange({ price: event.target.value })} disabled={disabled || saving} className="h-12 rounded-xl bg-muted/20 pr-16 text-xl font-semibold" />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{currency === "EUR" ? "€" : currency}</span>
                </div>
              </div>
            </div>
            <div className="md:pt-[58px]">
              <Button type="submit" disabled={disabled || saving || !draft?.start_date || !draft?.end_date || !draft?.price.trim()} className="h-12 w-full rounded-xl bg-emerald-600 px-6 text-white hover:bg-emerald-700">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </div>

          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

          {otaPrices.length > 0 && (
            <div className="mt-3 text-xs text-muted-foreground">
              <button type="button" onClick={() => setShowOta(previous => !previous)} aria-expanded={showOta} className="flex items-center gap-1.5 hover:text-foreground">
                Prix estimés sur les plateformes <ChevronDown className={`h-3 w-3 transition-transform ${showOta ? "rotate-180" : ""}`} />
              </button>
              {showOta && <div className="mt-2 space-y-1.5">{otaPrices.map(channel => <p key={channel.name}>{channel.name} +{channel.markup} % <span className="ml-2 font-semibold text-foreground">{channel.price}</span></p>)}</div>}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-start justify-between gap-3 border-t pt-4">
            <details className="group w-full sm:w-auto">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><SlidersHorizontal className="h-3.5 w-3.5" /> Durée du séjour et autres options <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" /></summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5"><Label htmlFor="simple-min-stay" className="text-xs">Nuits minimum</Label><Input id="simple-min-stay" type="number" min="1" max="365" step="1" value={draft?.min_stay ?? "1"} onChange={event => onChange({ min_stay: event.target.value })} disabled={disabled || saving} /></div>
                <div className="space-y-1.5"><Label htmlFor="simple-max-stay" className="text-xs">Nuits maximum</Label><Input id="simple-max-stay" type="number" min={draft?.min_stay || "1"} step="1" value={draft?.max_stay ?? ""} placeholder="Sans limite" onChange={event => onChange({ max_stay: event.target.value })} disabled={disabled || saving} /></div>
                <div className="space-y-1.5"><Label htmlFor="simple-price-label" className="text-xs">Nom (facultatif)</Label><Input id="simple-price-label" maxLength={60} value={draft?.label ?? ""} placeholder="Ex. Vacances" onChange={event => onChange({ label: event.target.value })} disabled={disabled || saving} /></div>
              </div>
            </details>
            {draft && <button type="button" onClick={onCancel} disabled={saving} className="text-xs text-muted-foreground hover:text-foreground">Annuler la saisie</button>}
          </div>
        </form>
      )}
    </section>
  );
}
