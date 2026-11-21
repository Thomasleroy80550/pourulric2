import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2, MousePointerClick, RefreshCcw, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  getChannelPricing,
  replaceChannelPricing,
  type ChannelPricingPeriodInput,
  type ChannelPricingRead,
  type ChannelPricingReadPeriod,
  type ChannelPricingReplaceResult,
  type ChannelPricingSource,
} from "@/lib/channel-features-api";

interface DraftPeriod {
  key: string;
  start_date: string;
  end_date: string;
  price: string;
  min_stay: string;
  max_stay: string;
  label: string;
}

interface PlannerPeriod {
  key: string;
  source: ChannelPricingSource;
  label: string | null;
  start_date: string;
  end_date: string;
  price: number | null;
  min_stay: number | null;
  max_stay: number | null;
}

interface ChannelPricingPeriodsPanelProps {
  assignmentId: string;
  onSaved: () => void;
}

const sourceLabels: Record<ChannelPricingSource, string> = {
  owner: "Vos prix",
  cadence: "Gestionnaire",
  beyond: "Beyond",
  default: "Repli",
};

const sourceBadgeVariants: Record<ChannelPricingSource, "default" | "secondary" | "outline" | "destructive"> = {
  owner: "default",
  cadence: "secondary",
  beyond: "outline",
  default: "outline",
};

const sourceDotClasses: Record<ChannelPricingSource, string> = {
  owner: "bg-primary",
  cadence: "bg-amber-500",
  beyond: "bg-sky-500",
  default: "bg-slate-400",
};

const weekDays = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

function newDraft(): DraftPeriod {
  return { key: crypto.randomUUID(), start_date: "", end_date: "", price: "", min_stay: "1", max_stay: "", label: "" };
}

function draftFromPeriod(period: ChannelPricingReadPeriod): DraftPeriod {
  return {
    key: period.id || crypto.randomUUID(),
    start_date: period.start_date,
    end_date: period.end_date,
    price: String(period.price),
    min_stay: period.min_stay == null ? "1" : String(period.min_stay),
    max_stay: period.max_stay == null ? "" : String(period.max_stay),
    label: period.label ?? "",
  };
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

function parseDraft(period: DraftPeriod, name = "Période"):
  | { row: ChannelPricingPeriodInput; error?: never }
  | { row?: never; error: string } {
  const label = period.label.trim();
  if (!period.start_date || !period.end_date) return { error: `${name} : les deux dates sont requises.` };
  if (period.start_date > period.end_date) return { error: `${name} : le début doit précéder la fin.` };
  const today = parisToday();
  const maxStart = parisMaxStart();
  if (period.end_date < today || period.start_date > maxStart) return { error: `${name} : seules les périodes à venir, débutant dans les 3 ans, sont acceptées.` };
  const price = Number(period.price);
  if (!Number.isFinite(price) || price < 0 || price > 100000) return { error: `${name} : prix entre 0 et 100 000.` };
  const minStay = Number(period.min_stay || "1");
  if (!Number.isInteger(minStay) || minStay < 1 || minStay > 365) return { error: `${name} : séjour minimum entre 1 et 365 nuits.` };
  const maxStay = period.max_stay.trim() ? Number(period.max_stay) : undefined;
  if (maxStay !== undefined && (!Number.isInteger(maxStay) || maxStay < minStay)) return { error: `${name} : séjour maximum invalide.` };
  if (label.length > 60) return { error: `${name} : libellé limité à 60 caractères.` };
  return {
    row: {
      start_date: period.start_date,
      end_date: period.end_date,
      price,
      min_stay: minStay,
      ...(maxStay !== undefined ? { max_stay: maxStay } : {}),
      ...(label ? { label } : {}),
    },
  };
}

function periodsOverlap(a: Pick<ChannelPricingPeriodInput, "start_date" | "end_date">, b: Pick<ChannelPricingPeriodInput, "start_date" | "end_date">) {
  return a.start_date <= b.end_date && b.start_date <= a.end_date;
}

function formatPrice(price: number | null, currency: string) {
  if (price === null || !Number.isFinite(price)) return "—";
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}

function periodTitle(period: PlannerPeriod, currency: string) {
  return `${period.start_date} → ${period.end_date}${period.label ? ` · ${period.label}` : ""} · ${formatPrice(period.price, currency)} / nuit`;
}

function draftToPlannerPeriod(period: DraftPeriod): PlannerPeriod | null {
  if (!period.start_date || !period.end_date || period.start_date > period.end_date) return null;
  const price = period.price.trim() ? Number(period.price) : null;
  const minStay = period.min_stay.trim() ? Number(period.min_stay) : null;
  const maxStay = period.max_stay.trim() ? Number(period.max_stay) : null;
  return {
    key: period.key,
    source: "owner",
    label: period.label.trim() || null,
    start_date: period.start_date,
    end_date: period.end_date,
    price: price !== null && Number.isFinite(price) ? price : null,
    min_stay: minStay !== null && Number.isInteger(minStay) ? minStay : null,
    max_stay: maxStay !== null && Number.isInteger(maxStay) ? maxStay : null,
  };
}

export default function ChannelPricingPeriodsPanel({ assignmentId, onSaved }: ChannelPricingPeriodsPanelProps) {
  const [pricing, setPricing] = useState<ChannelPricingRead | null>(null);
  const [periods, setPeriods] = useState<DraftPeriod[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<string | null>(null);
  const [editor, setEditor] = useState<DraftPeriod | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [applied, setApplied] = useState<ChannelPricingReplaceResult | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setLoadError("");
    try {
      const result = await getChannelPricing(assignmentId);
      setPricing(result);
      setPeriods(result.periods.filter(period => period.source === "owner").map(draftFromPeriod));
      setConfirmed(false);
      setEditor(null);
      setEditingKey(null);
      setSelectionStart(null);
      setSelectionEnd(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Impossible de lire les périodes tarifaires Cadence.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const normalized = useMemo(() => {
    const rows: ChannelPricingPeriodInput[] = [];
    for (const [index, period] of periods.entries()) {
      const parsed = parseDraft(period, `Période ${index + 1}`);
      if ("error" in parsed) return { error: parsed.error };
      rows.push(parsed.row);
    }
    const sorted = [...rows].sort((a, b) => a.start_date.localeCompare(b.start_date) || a.end_date.localeCompare(b.end_date));
    for (let index = 1; index < sorted.length; index += 1) {
      if (periodsOverlap(sorted[index], sorted[index - 1])) return { error: "Deux périodes propriétaire se chevauchent. Ajustez les plages sur le planning." };
    }
    return { rows: sorted };
  }, [periods]);

  const plannerPeriods = useMemo(() => {
    const ownerPeriods = periods.map(draftToPlannerPeriod).filter((period): period is PlannerPeriod => Boolean(period));
    const readonlyPeriods = (pricing?.periods ?? [])
      .filter(period => period.source !== "owner")
      .map(period => ({
        key: `${period.source}-${period.id}`,
        source: period.source,
        label: period.label,
        start_date: period.start_date,
        end_date: period.end_date,
        price: period.price,
        min_stay: period.min_stay,
        max_stay: period.max_stay,
      }));
    return [...readonlyPeriods, ...ownerPeriods];
  }, [periods, pricing]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
  });
  const monthStartIso = format(monthStart, "yyyy-MM-dd");
  const monthEndIso = format(monthEnd, "yyyy-MM-dd");
  const visiblePeriods = plannerPeriods.filter(period => period.start_date <= monthEndIso && period.end_date >= monthStartIso);
  const visibleOwnerPeriods = visiblePeriods.filter(period => period.source === "owner");
  const visibleReadonlyPeriods = visiblePeriods.filter(period => period.source !== "owner");
  const priority: Record<ChannelPricingSource, number> = { cadence: 0, owner: 1, beyond: 2, default: 3 };

  const periodsForDay = (dateIso: string) =>
    plannerPeriods
      .filter(period => period.start_date <= dateIso && period.end_date >= dateIso)
      .sort((a, b) => priority[a.source] - priority[b.source] || a.start_date.localeCompare(b.start_date));

  const isSelectedDay = (dateIso: string) => {
    if (!selectionStart) return false;
    if (!selectionEnd) return dateIso === selectionStart;
    return dateIso >= selectionStart && dateIso <= selectionEnd;
  };

  const handleDayClick = (date: Date) => {
    if (!pricing || pricing.beyond_linked || saving) return;
    const dateIso = format(date, "yyyy-MM-dd");
    if (dateIso < parisToday()) {
      setFormError("Les périodes tarifaires commencent aujourd’hui ou plus tard.");
      return;
    }
    setFormError("");
    setApplied(null);
    if (!selectionStart || selectionEnd) {
      setSelectionStart(dateIso);
      setSelectionEnd(null);
      setEditingKey(null);
      setEditor({ ...newDraft(), start_date: dateIso, end_date: dateIso });
      return;
    }
    const start = dateIso < selectionStart ? dateIso : selectionStart;
    const end = dateIso < selectionStart ? selectionStart : dateIso;
    setSelectionStart(start);
    setSelectionEnd(end);
    setEditor(previous => ({ ...(previous ?? newDraft()), start_date: start, end_date: end }));
  };

  const editPeriod = (period: DraftPeriod) => {
    if (saving) return;
    setEditingKey(period.key);
    setEditor({ ...period });
    setSelectionStart(null);
    setSelectionEnd(null);
    setApplied(null);
    setFormError("");
    const start = parseISO(period.start_date);
    if (!Number.isNaN(start.getTime())) setCurrentMonth(startOfMonth(start));
  };

  const closeEditor = () => {
    setEditor(null);
    setEditingKey(null);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const applyEditor = () => {
    if (!editor) return;
    const parsed = parseDraft(editor, editingKey ? "La période modifiée" : "La nouvelle période");
    if ("error" in parsed) {
      setFormError(parsed.error);
      return;
    }
    for (const period of periods) {
      if (period.key === editingKey) continue;
      const other = parseDraft(period, "Une période existante");
      if ("error" in other) {
        setFormError(other.error);
        return;
      }
      if (periodsOverlap(parsed.row, other.row)) {
        setFormError(`Chevauchement avec la période ${other.row.start_date} → ${other.row.end_date}.`);
        return;
      }
    }
    if (editingKey) {
      setPeriods(previous => previous.map(period => period.key === editingKey ? { ...editor } : period));
    } else {
      setPeriods(previous => [...previous, { ...editor, key: crypto.randomUUID() }].sort((a, b) => a.start_date.localeCompare(b.start_date)));
    }
    closeEditor();
    setFormError("");
  };

  const removePeriod = (key: string) => {
    setPeriods(previous => previous.filter(period => period.key !== key));
    if (editingKey === key) closeEditor();
    setApplied(null);
    setFormError("");
  };

  const submit = async () => {
    setFormError("");
    if (!pricing) {
      setFormError("La lecture Cadence des périodes existantes doit aboutir avant tout envoi.");
      return;
    }
    if (pricing.beyond_linked) {
      setFormError("Ce logement est lié à Beyond : ses prix et restrictions viennent de Beyond.");
      return;
    }
    if (editor) {
      setFormError("Ajoutez ou annulez la plage en cours d’édition avant l’envoi.");
      return;
    }
    if (!confirmed) {
      setFormError("Confirmez que le planning affiché remplace toutes vos périodes propriétaire existantes.");
      return;
    }
    if ("error" in normalized) {
      setFormError(normalized.error);
      return;
    }
    setSaving(true);
    try {
      const result = await replaceChannelPricing(assignmentId, normalized.rows);
      setApplied(result);
      setConfirmed(false);
      toast.success(`${result.periods_applied} période(s) appliquée(s) et envoyée(s) vers NextPax.`);
      onSaved();
      await load(true);
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "Impossible d’envoyer les prix à Cadence.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Planning des prix propriétaire</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Cliquez sur le premier jour puis sur le dernier jour, renseignez le prix, puis envoyez le planning complet à Cadence.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => void load()} disabled={loading || saving}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Relire Cadence
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Lecture du planning de prix…
          </div>
        ) : loadError && !pricing ? (
          <Alert variant="destructive">
            <AlertTitle>Lecture des prix impossible</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{loadError}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
                <RefreshCcw className="mr-2 h-4 w-4" /> Réessayer
              </Button>
            </AlertDescription>
          </Alert>
        ) : pricing ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">Devise {pricing.currency}</Badge>
              <span>Dernière mise à jour : {new Date(pricing.periods_updated_at).toLocaleString("fr-FR")}</span>
            </div>

            {loadError && <Alert variant="destructive"><AlertDescription>{loadError}</AlertDescription></Alert>}
            {formError && <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert>}
            {pricing.beyond_linked && (
              <Alert variant="destructive">
                <AlertTitle>Tarification gérée par Beyond</AlertTitle>
                <AlertDescription>Les prix et restrictions viennent de Beyond : le planning est consultable mais non modifiable.</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-2">
                  <Button type="button" variant="ghost" size="icon" onClick={() => setCurrentMonth(month => subMonths(month, 1))} aria-label="Mois précédent">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-center">
                    <p className="font-semibold capitalize">{format(currentMonth, "MMMM yyyy", { locale: fr })}</p>
                    <p className="text-xs text-muted-foreground">Sélection par plage inclusive</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setCurrentMonth(month => addMonths(month, 1))} aria-label="Mois suivant">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                  <div className="min-w-[760px]">
                    <div className="grid grid-cols-7 border-b bg-muted/40">
                      {weekDays.map(day => <div key={day} className="px-2 py-2 text-center text-xs font-medium uppercase text-muted-foreground">{day}</div>)}
                    </div>
                    <div className="grid grid-cols-7">
                      {calendarDays.map(day => {
                        const dateIso = format(day, "yyyy-MM-dd");
                        const dayPeriods = periodsForDay(dateIso);
                        const visiblePeriod = dayPeriods[0];
                        const selected = isSelectedDay(dateIso);
                        const editableDay = isSameMonth(day, currentMonth) && !pricing.beyond_linked;
                        return (
                          <button
                            key={dateIso}
                            type="button"
                            onClick={() => handleDayClick(day)}
                            disabled={!editableDay || saving}
                            className={cn(
                              "min-h-28 border-b border-r p-2 text-left transition-colors [&:nth-child(7n)]:border-r-0",
                              !isSameMonth(day, currentMonth) && "bg-muted/20 text-muted-foreground/50",
                              editableDay && "hover:bg-primary/5",
                              selected && "bg-primary/15 ring-2 ring-inset ring-primary",
                              editingKey && dayPeriods.some(period => period.key === editingKey) && "bg-primary/10 ring-2 ring-inset ring-primary/60",
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className={cn("text-sm font-medium", isToday(day) && "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground")}>{format(day, "d")}</span>
                              {isSameDay(day, monthStart) && <span className="text-[10px] capitalize text-muted-foreground">{format(day, "MMM", { locale: fr })}</span>}
                            </div>
                            {visiblePeriod && isSameMonth(day, currentMonth) && (
                              <div className="mt-2 space-y-1">
                                <p className="text-sm font-semibold">{formatPrice(visiblePeriod.price, pricing.currency)}</p>
                                <p className="truncate text-[11px] text-muted-foreground">{visiblePeriod.label || sourceLabels[visiblePeriod.source]}</p>
                              </div>
                            )}
                            {dayPeriods.length > 0 && isSameMonth(day, currentMonth) && (
                              <div className="mt-2 flex gap-1">
                                {dayPeriods.slice(0, 4).map(period => <span key={period.key} className={cn("h-1.5 flex-1 rounded-full", sourceDotClasses[period.source])} />)}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  {(["owner", "cadence", "beyond", "default"] as ChannelPricingSource[]).map(source => (
                    <Badge key={source} variant={sourceBadgeVariants[source]} className="gap-1">
                      <span className={cn("h-2 w-2 rounded-full", sourceDotClasses[source])} /> {sourceLabels[source]}
                    </Badge>
                  ))}
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="mb-2 text-sm font-medium">Vos périodes visibles ce mois</p>
                    <div className="space-y-2">
                      {visibleOwnerPeriods.map(period => (
                        <div key={period.key} className={cn("flex items-center gap-2 rounded-md border p-2", editingKey === period.key && "border-primary bg-primary/5")}>
                          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => {
                            const draft = periods.find(item => item.key === period.key);
                            if (draft) editPeriod(draft);
                          }} disabled={pricing.beyond_linked || saving}>
                            <span className="block truncate text-sm font-medium">{period.label || "Prix propriétaire"}</span>
                            <span className="block text-xs text-muted-foreground">{periodTitle(period, pricing.currency)}</span>
                          </button>
                          {!pricing.beyond_linked && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => removePeriod(period.key)} disabled={saving} aria-label="Supprimer cette période">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {visibleOwnerPeriods.length === 0 && <p className="text-sm text-muted-foreground">Aucune période propriétaire sur ce mois.</p>}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="mb-2 text-sm font-medium">Périodes gestionnaire / channel</p>
                    <div className="space-y-2">
                      {visibleReadonlyPeriods.map(period => (
                        <div key={period.key} className="rounded-md border bg-muted/20 p-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={sourceBadgeVariants[period.source]}>{sourceLabels[period.source]}</Badge>
                            <span className="truncate text-sm font-medium">{period.label || "Période"}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{periodTitle(period, pricing.currency)}</p>
                        </div>
                      ))}
                      {visibleReadonlyPeriods.length === 0 && <p className="text-sm text-muted-foreground">Aucune autre période sur ce mois.</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {!pricing.beyond_linked ? (
                  <div className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="mb-4 flex items-start gap-2">
                      <MousePointerClick className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className="font-medium">{editor ? (editingKey ? "Modifier la période" : "Nouvelle plage de prix") : "Sélectionnez une plage"}</p>
                        <p className="text-sm text-muted-foreground">
                          {editor ? `${editor.start_date} → ${editor.end_date}` : "Cliquez sur le planning pour choisir le début puis la fin."}
                        </p>
                      </div>
                    </div>
                    {editor && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2"><Label>Début inclus</Label><Input type="date" value={editor.start_date} min={parisToday()} onChange={event => setEditor(previous => previous ? { ...previous, start_date: event.target.value } : previous)} /></div>
                          <div className="space-y-2"><Label>Fin incluse</Label><Input type="date" value={editor.end_date} min={editor.start_date} onChange={event => setEditor(previous => previous ? { ...previous, end_date: event.target.value } : previous)} /></div>
                        </div>
                        <div className="space-y-2"><Label>Prix / nuit ({pricing.currency})</Label><Input type="number" min="0" max="100000" step="1" value={editor.price} onChange={event => setEditor(previous => previous ? { ...previous, price: event.target.value } : previous)} placeholder="120" /></div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2"><Label>Séjour min.</Label><Input type="number" min="1" max="365" step="1" value={editor.min_stay} onChange={event => setEditor(previous => previous ? { ...previous, min_stay: event.target.value } : previous)} /></div>
                          <div className="space-y-2"><Label>Séjour max.</Label><Input type="number" min={editor.min_stay || "1"} step="1" value={editor.max_stay} onChange={event => setEditor(previous => previous ? { ...previous, max_stay: event.target.value } : previous)} placeholder="Optionnel" /></div>
                        </div>
                        <div className="space-y-2"><Label>Libellé</Label><Input maxLength={60} value={editor.label} onChange={event => setEditor(previous => previous ? { ...previous, label: event.target.value } : previous)} placeholder="Été 2027" /></div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" onClick={applyEditor} disabled={saving}>{editingKey ? "Mettre à jour" : "Ajouter au planning"}</Button>
                          <Button type="button" variant="outline" onClick={closeEditor} disabled={saving}>Annuler</Button>
                          {editingKey && <Button type="button" variant="destructive" onClick={() => removePeriod(editingKey)} disabled={saving}>Supprimer</Button>}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Alert><AlertDescription>Modification impossible : ce logement est lié à Beyond.</AlertDescription></Alert>
                )}

                {!pricing.beyond_linked && (
                  <>
                    <Alert>
                      <AlertTitle>Envoi en remplacement complet</AlertTitle>
                      <AlertDescription>
                        Le planning visible contient toutes vos périodes `owner`. Les périodes gestionnaire affichées ne sont pas remplacées : elles priment et peuvent découper vos plages.
                      </AlertDescription>
                    </Alert>
                    <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                      <Checkbox checked={confirmed} onCheckedChange={value => setConfirmed(value === true)} disabled={saving} />
                      <span>Je confirme que le planning actuel remplace toutes mes périodes tarifaires propriétaire existantes.</span>
                    </label>
                    <Button type="button" className="w-full" onClick={() => void submit()} disabled={saving || loading || !confirmed || !pricing}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      {periods.length ? "Envoyer le planning vers NextPax" : "Retirer mes périodes propriétaire"}
                    </Button>
                  </>
                )}

                {applied && (
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Appliqué par Cadence</p>
                      <Badge variant="secondary">{applied.periods_applied} · NextPax {applied.pushed_to_nextpax ? "OK" : "non poussé"}</Badge>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {applied.periods.map(period => <p key={period.id}>{period.start_date} → {period.end_date}{period.label ? ` · ${period.label}` : ""} · {formatPrice(period.price, pricing.currency)}</p>)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
