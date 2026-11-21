import { useMemo, useState } from "react";
import { Loader2, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { replaceChannelPricing, type ChannelPricingPeriodInput, type ChannelPricingReplaceResult } from "@/lib/channel-features-api";

interface DraftPeriod {
  key: string;
  start_date: string;
  end_date: string;
  price: string;
  min_stay: string;
  max_stay: string;
  label: string;
}

interface ChannelPricingPeriodsPanelProps {
  assignmentId: string;
  onSaved: () => void;
}

function newDraft(): DraftPeriod {
  return { key: crypto.randomUUID(), start_date: "", end_date: "", price: "", min_stay: "1", max_stay: "", label: "" };
}

function parisToday() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function parisMaxStart() {
  const [year, month, day] = parisToday().split("-").map(Number);
  return new Date(Date.UTC(year + 3, month - 1, day)).toISOString().slice(0, 10);
}

function displayPeriod(period: { start_date: string; end_date: string; label?: string | null }) {
  return `${period.start_date} → ${period.end_date}${period.label ? ` · ${period.label}` : ""}`;
}

export default function ChannelPricingPeriodsPanel({ assignmentId, onSaved }: ChannelPricingPeriodsPanelProps) {
  const [periods, setPeriods] = useState<DraftPeriod[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState<ChannelPricingReplaceResult | null>(null);

  const normalized = useMemo(() => {
    const rows: ChannelPricingPeriodInput[] = [];
    const today = parisToday();
    const maxStart = parisMaxStart();
    for (const [index, period] of periods.entries()) {
      const label = period.label.trim();
      if (!period.start_date || !period.end_date) return { error: `Période ${index + 1} : les deux dates sont requises.` };
      if (period.start_date > period.end_date) return { error: `Période ${index + 1} : le début doit précéder la fin.` };
      if (period.end_date < today || period.start_date > maxStart) return { error: `Période ${index + 1} : seules les périodes à venir, débutant dans les 3 ans, sont acceptées.` };
      const price = Number(period.price);
      if (!Number.isFinite(price) || price < 0 || price > 100000) return { error: `Période ${index + 1} : prix entre 0 et 100 000.` };
      const minStay = Number(period.min_stay || "1");
      if (!Number.isInteger(minStay) || minStay < 1 || minStay > 365) return { error: `Période ${index + 1} : séjour minimum entre 1 et 365 nuits.` };
      const maxStay = period.max_stay.trim() ? Number(period.max_stay) : undefined;
      if (maxStay !== undefined && (!Number.isInteger(maxStay) || maxStay < minStay)) return { error: `Période ${index + 1} : séjour maximum invalide.` };
      if (label.length > 60) return { error: `Période ${index + 1} : libellé limité à 60 caractères.` };
      rows.push({ start_date: period.start_date, end_date: period.end_date, price, min_stay: minStay, ...(maxStay !== undefined ? { max_stay: maxStay } : {}), ...(label ? { label } : {}) });
    }
    const sorted = [...rows].sort((a, b) => a.start_date.localeCompare(b.start_date) || a.end_date.localeCompare(b.end_date));
    for (let index = 1; index < sorted.length; index += 1) {
      if (sorted[index].start_date <= sorted[index - 1].end_date) return { error: "Deux périodes se chevauchent. Corrigez-les avant l’envoi." };
    }
    return { rows: sorted };
  }, [periods]);

  const updatePeriod = (key: string, patch: Partial<DraftPeriod>) => {
    setPeriods(previous => previous.map(period => period.key === key ? { ...period, ...patch } : period));
    setApplied(null);
  };
  const removePeriod = (key: string) => {
    setPeriods(previous => previous.filter(period => period.key !== key));
    setApplied(null);
  };
  const submit = async () => {
    setError("");
    if (!confirmed) {
      setError("Confirmez que cette liste complète remplace toutes vos périodes existantes.");
      return;
    }
    if ("error" in normalized) {
      setError(normalized.error);
      return;
    }
    setSaving(true);
    try {
      const result = await replaceChannelPricing(assignmentId, normalized.rows);
      setApplied(result);
      toast.success(`${result.periods_applied} période(s) appliquée(s) et envoyée(s) vers NextPax.`);
      onSaved();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Impossible d’envoyer les prix à Cadence.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Périodes tarifaires propriétaire</CardTitle>
        <p className="text-sm text-muted-foreground">Remplacement complet des périodes propriétaire, puis push vers NextPax. Les périodes du gestionnaire Cadence restent prioritaires.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTitle>Action de remplacement complet</AlertTitle>
          <AlertDescription>
            L’API Cadence ne fournit pas de lecture de la liste existante. Re-saisissez toutes les périodes à conserver. Envoyer une liste vide retire toutes vos périodes propriétaire.
          </AlertDescription>
        </Alert>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

        <div className="space-y-3">
          {periods.map((period, index) => (
            <div key={period.key} className="rounded-lg border p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <Badge variant="secondary">Période {index + 1}</Badge>
                <Button type="button" variant="ghost" size="icon" onClick={() => removePeriod(period.key)} disabled={saving} aria-label={`Supprimer la période ${index + 1}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2"><Label>Début inclus</Label><Input type="date" value={period.start_date} onChange={event => updatePeriod(period.key, { start_date: event.target.value })} /></div>
                <div className="space-y-2"><Label>Fin incluse</Label><Input type="date" value={period.end_date} min={period.start_date} onChange={event => updatePeriod(period.key, { end_date: event.target.value })} /></div>
                <div className="space-y-2"><Label>Prix / nuit</Label><Input type="number" min="0" max="100000" step="0.01" value={period.price} onChange={event => updatePeriod(period.key, { price: event.target.value })} /></div>
                <div className="space-y-2"><Label>Séjour min.</Label><Input type="number" min="1" max="365" step="1" value={period.min_stay} onChange={event => updatePeriod(period.key, { min_stay: event.target.value })} /></div>
                <div className="space-y-2"><Label>Séjour max. (optionnel)</Label><Input type="number" min={period.min_stay || "1"} step="1" value={period.max_stay} onChange={event => updatePeriod(period.key, { max_stay: event.target.value })} /></div>
                <div className="space-y-2"><Label>Libellé (optionnel)</Label><Input maxLength={60} value={period.label} onChange={event => updatePeriod(period.key, { label: event.target.value })} /></div>
              </div>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" onClick={() => setPeriods(previous => [...previous, newDraft()])} disabled={saving}>
          <Plus className="mr-2 h-4 w-4" /> Ajouter une période
        </Button>

        <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
          <Checkbox checked={confirmed} onCheckedChange={value => setConfirmed(value === true)} disabled={saving} />
          <span>Je confirme que cette liste est complète et qu’elle remplace toutes mes périodes tarifaires existantes pour ce logement.</span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => void submit()} disabled={saving || !confirmed}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {periods.length ? "Remplacer et pousser vers NextPax" : "Retirer mes périodes propriétaire"}
          </Button>
          {applied && <Badge variant="secondary">{applied.periods_applied} appliquée(s) · NextPax {applied.pushed_to_nextpax ? "OK" : "non poussé"}</Badge>}
        </div>

        {applied && (
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="mb-2 text-sm font-medium">Périodes réellement appliquées par Cadence</p>
            <div className="space-y-1 text-sm text-muted-foreground">
              {applied.periods.map(period => <p key={period.id}>{displayPeriod(period)} · {period.price} / nuit · min {period.min_stay} nuit(s){period.max_stay ? ` · max ${period.max_stay}` : ""}</p>)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
