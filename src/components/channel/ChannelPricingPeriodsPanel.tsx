import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  differenceInDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, MousePointerClick, RefreshCcw, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  getChannelPricing,
  replaceChannelPricing,
  type ChannelPricingPeriodInput,
  type ChannelPricingRead,
  type ChannelPricingReadPeriod,
  type ChannelPricingReplaceResult,
  type ChannelPricingSource,
} from "@/lib/channel-features-api";

const COL_WIDTH = 36;
const ROW_HEIGHT = 64;
const LABEL_WIDTH = 220;
const BAR_HEIGHT = 36;
const HEADER_HEIGHT = 52;
const MONTH_BAND_HEIGHT = 28;

const COL_WIDTH_MOBILE = 30;
const ROW_HEIGHT_MOBILE = 56;
const LABEL_WIDTH_MOBILE = 132;
const BAR_HEIGHT_MOBILE = 30;
const HEADER_HEIGHT_MOBILE = 44;
const MONTH_BAND_HEIGHT_MOBILE = 24;

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

type PriceStyle = {
  label: string;
  bar: string;
  soft: string;
  dot: string;
  avatar: string;
};

const PRICE_STYLES: Record<ChannelPricingSource, PriceStyle> = {
  owner: {
    label: "Vos prix",
    bar: "bg-emerald-600",
    soft: "bg-emerald-50 dark:bg-emerald-950/30",
    dot: "bg-emerald-600",
    avatar: "bg-emerald-600",
  },
  cadence: {
    label: "Gestionnaire",
    bar: "bg-amber-500",
    soft: "bg-amber-50 dark:bg-amber-950/30",
    dot: "bg-amber-500",
    avatar: "bg-amber-500",
  },
  beyond: {
    label: "Beyond",
    bar: "bg-sky-700",
    soft: "bg-sky-50 dark:bg-sky-950/30",
    dot: "bg-sky-700",
    avatar: "bg-sky-700",
  },
  default: {
    label: "Repli technique",
    bar: "bg-slate-400",
    soft: "bg-slate-50 dark:bg-slate-900/40",
    dot: "bg-slate-400",
    avatar: "bg-slate-500",
  },
};

const ROW_DEFINITIONS: Array<{ source: ChannelPricingSource; title: string; subtitle: string }> = [
  { source: "owner", title: "Prix propriétaire", subtitle: "Plages modifiables" },
  { source: "cadence", title: "Gestionnaire", subtitle: "Prioritaire" },
  { source: "beyond", title: "Beyond", subtitle: "Tarification dynamique" },
  { source: "default", title: "Repli", subtitle: "Valeur technique" },
];

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

function isWeekend(date: Date) {
  return date.getDay() === 0 || date.getDay() === 6;
}

function initials(label: string) {
  return label.split(/\s+/).filter(Boolean).map(part => part[0]).join("").slice(0, 2).toUpperCase() || "PR";
}

export default function ChannelPricingPeriodsPanel({ assignmentId, onSaved }: ChannelPricingPeriodsPanelProps) {
  const isMobile = useIsMobile();
  const colWidth = isMobile ? COL_WIDTH_MOBILE : COL_WIDTH;
  const rowHeight = isMobile ? ROW_HEIGHT_MOBILE : ROW_HEIGHT;
  const labelWidth = isMobile ? LABEL_WIDTH_MOBILE : LABEL_WIDTH;
  const barHeight = isMobile ? BAR_HEIGHT_MOBILE : BAR_HEIGHT;
  const headerHeight = isMobile ? HEADER_HEIGHT_MOBILE : HEADER_HEIGHT;
  const monthBandHeight = isMobile ? MONTH_BAND_HEIGHT_MOBILE : MONTH_BAND_HEIGHT;

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
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setContainerWidth(element.clientWidth));
    observer.observe(element);
    setContainerWidth(element.clientWidth);
    return () => observer.disconnect();
  }, [loading]);

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
      if (periodsOverlap(sorted[index], sorted[index - 1])) return { error: "Deux périodes propriétaire se chevauchent. Ajustez les barres du planning." };
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

  const monthDays = useMemo(() => eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }), [currentMonth]);
  const overflowDays = useMemo(() => {
    const available = Math.max(0, containerWidth - labelWidth);
    const needed = Math.ceil(available / colWidth);
    const extra = Math.max(0, needed - monthDays.length);
    if (!extra) return [];
    const nextMonthStart = startOfMonth(addMonths(currentMonth, 1));
    return Array.from({ length: extra }, (_, index) => addDays(nextMonthStart, index));
  }, [containerWidth, labelWidth, colWidth, monthDays.length, currentMonth]);
  const allDays = useMemo(() => [...monthDays, ...overflowDays], [monthDays, overflowDays]);
  const gridStart = allDays[0];
  const today = startOfDay(new Date());
  const todayIndex = allDays.findIndex(day => isSameDay(day, today));
  const gridContentWidth = labelWidth + allDays.length * colWidth;

  const stats = useMemo(() => {
    const ownerPeriods = plannerPeriods.filter(period => period.source === "owner");
    const prices = ownerPeriods.map(period => period.price).filter((price): price is number => price !== null);
    const nights = ownerPeriods.reduce((total, period) => total + differenceInDays(parseISO(period.end_date), parseISO(period.start_date)) + 1, 0);
    return {
      periods: ownerPeriods.length,
      nights,
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
    };
  }, [plannerPeriods]);

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
    if (saving || pricing?.beyond_linked) return;
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

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement du planning de prix…
        </div>
      </Card>
    );
  }

  if (loadError && !pricing) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Lecture des prix impossible</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{loadError}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Réessayer
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!pricing) return null;

  const goPrev = () => setCurrentMonth(month => subMonths(month, 1));
  const goNext = () => setCurrentMonth(month => addMonths(month, 1));
  const goToday = () => setCurrentMonth(new Date());

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
            <CalendarDays className="h-5 w-5 text-emerald-600 sm:h-6 sm:w-6" />
            Planning des prix
          </h3>
          <p className="text-sm text-muted-foreground">
            Cliquez sur la ligne « Prix propriétaire » pour créer une plage, puis sur une barre pour la modifier.
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => void load()} disabled={saving}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Actualiser
          </Button>
          <Button variant="outline" size="icon" onClick={goPrev} aria-label="Mois précédent"><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-[126px] text-center text-sm font-semibold capitalize sm:min-w-[150px] sm:text-base">
            {format(currentMonth, isMobile ? "MMM yyyy" : "MMMM yyyy", { locale: fr })}
          </span>
          <Button variant="outline" size="icon" onClick={goNext} aria-label="Mois suivant"><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="secondary" size="sm" onClick={goToday}>Auj.</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <PlannerStat label="Périodes" value={stats.periods} color="text-emerald-600" />
        <PlannerStat label="Nuits tarifées" value={stats.nights} color="text-blue-600" />
        <PlannerStat label="Prix min." value={formatPrice(stats.minPrice, pricing.currency)} color="text-violet-600" />
        <PlannerStat label="Prix max." value={formatPrice(stats.maxPrice, pricing.currency)} color="text-orange-500" />
      </div>

      {loadError && <Alert variant="destructive"><AlertDescription>{loadError}</AlertDescription></Alert>}
      {formError && <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert>}
      {pricing.beyond_linked && (
        <Alert variant="destructive">
          <AlertTitle>Tarification gérée par Beyond</AlertTitle>
          <AlertDescription>Les prix et restrictions viennent de Beyond : ce planning est consultable mais non modifiable.</AlertDescription>
        </Alert>
      )}
      {isMobile && <p className="-mb-1 px-1 text-[11px] text-muted-foreground">Faites glisser horizontalement pour naviguer dans le planning →</p>}

      <Card className="overflow-hidden border-slate-200 dark:border-slate-700">
        <div ref={wrapperRef} className="w-full overflow-x-auto">
          <div style={{ width: gridContentWidth, minWidth: "100%" }}>
            <div className="flex" style={{ height: monthBandHeight }}>
              <div
                className="sticky left-0 z-20 flex items-center border-b border-r border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-gray-950"
                style={{ width: labelWidth, minWidth: labelWidth }}
              >
                <span className="text-xs font-semibold text-muted-foreground">Sources de prix</span>
              </div>
              <div
                className="flex items-center justify-center border-b border-r-2 border-slate-300 bg-slate-50 text-xs font-semibold capitalize text-slate-700 dark:border-slate-600 dark:bg-gray-900 dark:text-slate-200"
                style={{ width: monthDays.length * colWidth }}
              >
                {format(currentMonth, "MMMM yyyy", { locale: fr })}
              </div>
              {overflowDays.length > 0 && (
                <div
                  className="flex items-center justify-center overflow-hidden border-b border-slate-200 bg-slate-100/60 text-xs font-semibold capitalize text-slate-500 dark:border-slate-700 dark:bg-gray-900/60 dark:text-slate-400"
                  style={{ width: overflowDays.length * colWidth }}
                >
                  {format(addMonths(currentMonth, 1), "MMM", { locale: fr })}
                </div>
              )}
            </div>

            <div className="flex" style={{ height: headerHeight }}>
              <div
                className="sticky left-0 z-20 flex items-center border-b border-r border-slate-200 bg-white px-3 text-xs font-semibold text-muted-foreground dark:border-slate-700 dark:bg-gray-950"
                style={{ width: labelWidth, minWidth: labelWidth }}
              >
                Source
              </div>
              {allDays.map((day, index) => {
                const weekend = isWeekend(day);
                const dayIsToday = todayIndex === index;
                const monthBoundary = index === monthDays.length;
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "flex flex-col items-center justify-center border-b border-r border-slate-100 text-center dark:border-slate-800",
                      weekend && "bg-slate-50 dark:bg-gray-900/50",
                      dayIsToday && "bg-emerald-50 dark:bg-emerald-950/40",
                      monthBoundary && "border-l-2 border-l-slate-300 dark:border-l-slate-600",
                    )}
                    style={{ width: colWidth, minWidth: colWidth }}
                  >
                    <span className={cn("text-[10px] uppercase", dayIsToday ? "font-semibold text-emerald-600" : "text-muted-foreground")}>{format(day, "EEEEE", { locale: fr })}</span>
                    <span className={cn("text-xs sm:text-sm", dayIsToday ? "font-bold text-emerald-600" : "font-medium text-slate-700 dark:text-slate-200")}>{format(day, "d")}</span>
                  </div>
                );
              })}
            </div>

            {ROW_DEFINITIONS.map((row, rowIndex) => {
              const style = PRICE_STYLES[row.source];
              const rowPeriods = plannerPeriods.filter(period => period.source === row.source);
              const selectedStartIndex = selectionStart ? allDays.findIndex(day => format(day, "yyyy-MM-dd") === selectionStart) : -1;
              const selectedEndIndex = selectionEnd ? allDays.findIndex(day => format(day, "yyyy-MM-dd") === selectionEnd) : selectedStartIndex;
              return (
                <div key={row.source} className="flex" style={{ height: rowHeight }}>
                  <div
                    className={cn(
                      "sticky left-0 z-20 flex items-center gap-2 border-b border-r border-slate-200 px-2 dark:border-slate-700 sm:gap-2.5 sm:px-3",
                      rowIndex % 2 === 0 ? "bg-white dark:bg-gray-950" : "bg-slate-50/70 dark:bg-gray-900/40",
                    )}
                    style={{ width: labelWidth, minWidth: labelWidth }}
                  >
                    <div className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm", style.avatar)}>
                      {initials(row.title)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold leading-tight text-slate-800 dark:text-slate-100 sm:text-sm">{row.title}</div>
                      <div className="truncate text-[10px] text-muted-foreground sm:text-[11px]">{pricing.beyond_linked && row.source === "owner" ? "Lecture seule" : row.subtitle}</div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "relative border-b border-slate-100 dark:border-slate-800",
                      rowIndex % 2 === 0 ? "bg-white dark:bg-gray-950" : "bg-slate-50/40 dark:bg-gray-900/30",
                    )}
                    style={{ width: allDays.length * colWidth }}
                  >
                    {allDays.map((day, index) => {
                      const dateIso = format(day, "yyyy-MM-dd");
                      const weekend = isWeekend(day);
                      const dayIsToday = todayIndex === index;
                      const monthBoundary = index === monthDays.length;
                      const content = (
                        <>
                          {dayIsToday && <span className="absolute inset-y-0 left-0 w-0.5 bg-emerald-500" />}
                          <span className="sr-only">{dateIso}</span>
                        </>
                      );
                      const className = cn(
                        "absolute top-0 bottom-0 border-r border-slate-100 dark:border-slate-800",
                        weekend && "bg-slate-100/60 dark:bg-gray-800/40",
                        dayIsToday && "bg-emerald-50/70 dark:bg-emerald-950/30",
                        monthBoundary && "border-l-2 border-l-slate-300 dark:border-l-slate-600",
                      );
                      const position = { left: index * colWidth, width: colWidth };
                      return row.source === "owner" && !pricing.beyond_linked ? (
                        <button
                          key={dateIso}
                          type="button"
                          onClick={() => handleDayClick(day)}
                          disabled={saving}
                          className={cn(className, "transition-colors hover:bg-emerald-100/70 dark:hover:bg-emerald-900/30")}
                          style={position}
                          aria-label={`Créer ou prolonger une période au ${dateIso}`}
                        >{content}</button>
                      ) : (
                        <div key={dateIso} className={className} style={position}>{content}</div>
                      );
                    })}

                    {row.source === "owner" && selectedStartIndex >= 0 && selectedEndIndex >= 0 && (
                      <div
                        className="pointer-events-none absolute z-[5] rounded-md border-2 border-emerald-500 bg-emerald-400/20"
                        style={{
                          left: Math.min(selectedStartIndex, selectedEndIndex) * colWidth + 2,
                          width: (Math.abs(selectedEndIndex - selectedStartIndex) + 1) * colWidth - 4,
                          top: 5,
                          bottom: 5,
                        }}
                      />
                    )}

                    {rowPeriods.map(period => {
                      if (!gridStart) return null;
                      const start = parseISO(period.start_date);
                      const end = parseISO(period.end_date);
                      const startOffset = differenceInDays(start, gridStart);
                      const endOffsetExclusive = differenceInDays(end, gridStart) + 1;
                      const visibleStart = Math.max(0, startOffset);
                      const visibleEnd = Math.min(allDays.length, endOffsetExclusive);
                      if (visibleEnd <= visibleStart) return null;
                      const left = visibleStart * colWidth + 2;
                      const width = Math.max(12, (visibleEnd - visibleStart) * colWidth - 4);
                      const canEdit = row.source === "owner" && !pricing.beyond_linked;
                      return (
                        <button
                          key={period.key}
                          type="button"
                          disabled={!canEdit || saving}
                          onClick={() => {
                            if (!canEdit) return;
                            const draft = periods.find(item => item.key === period.key);
                            if (draft) editPeriod(draft);
                          }}
                          className={cn(
                            "absolute z-10 flex items-center overflow-hidden px-2 text-left text-[10px] font-medium text-white shadow-sm transition-all sm:text-[11px]",
                            style.bar,
                            canEdit && "hover:z-20 hover:brightness-105",
                            editingKey === period.key && "ring-2 ring-white dark:ring-gray-950",
                            startOffset >= 0 ? "rounded-l-full" : "rounded-l-sm",
                            endOffsetExclusive <= allDays.length ? "rounded-r-full" : "rounded-r-sm",
                          )}
                          style={{ left, width, top: (rowHeight - barHeight) / 2, height: barHeight }}
                          title={periodTitle(period, pricing.currency)}
                        >
                          <span className="truncate">
                            {formatPrice(period.price, pricing.currency)}{period.label ? ` · ${period.label}` : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <Card className="p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-6 sm:gap-y-3">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 sm:text-sm">Légende :</span>
              {ROW_DEFINITIONS.map(row => (
                <div key={row.source} className="flex items-center gap-1.5 text-[11px] text-muted-foreground sm:gap-2 sm:text-xs">
                  <span className={cn("h-3 w-3 rounded-full", PRICE_STYLES[row.source].dot)} />
                  {PRICE_STYLES[row.source].label}
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground sm:gap-2 sm:text-xs">
                <span className="h-3 w-6 rounded-sm border-2 border-emerald-500 bg-emerald-400/20" />
                Plage en cours de saisie
              </div>
            </div>
          </Card>

          <Alert>
            <AlertTitle>Remplacement complet à l’envoi</AlertTitle>
            <AlertDescription>
              Les barres vertes constituent la liste complète de vos périodes `owner`. Les barres gestionnaire ne sont pas remplacées : elles priment et peuvent découper vos plages après validation Cadence.
            </AlertDescription>
          </Alert>

          {applied && (
            <Card className="p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">Périodes réellement appliquées</p>
                <Badge variant="secondary">{applied.periods_applied} · NextPax {applied.pushed_to_nextpax ? "OK" : "non poussé"}</Badge>
              </div>
              <div className="grid gap-1 text-sm text-muted-foreground">
                {applied.periods.map(period => (
                  <p key={period.id}>{period.start_date} → {period.end_date}{period.label ? ` · ${period.label}` : ""} · {formatPrice(period.price, pricing.currency)} / nuit</p>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {!pricing.beyond_linked ? (
            <Card className="p-4 shadow-sm">
              <div className="mb-4 flex items-start gap-2">
                <MousePointerClick className="mt-0.5 h-4 w-4 text-emerald-600" />
                <div>
                  <p className="font-medium">{editor ? (editingKey ? "Modifier la barre" : "Nouvelle barre de prix") : "Sélectionnez une plage"}</p>
                  <p className="text-sm text-muted-foreground">
                    {editor ? `${editor.start_date} → ${editor.end_date}` : "Cliquez sur le premier jour puis sur le dernier jour dans la ligne verte."}
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
                    {editingKey && <Button type="button" variant="destructive" onClick={() => removePeriod(editingKey)} disabled={saving}><Trash2 className="mr-2 h-4 w-4" />Supprimer</Button>}
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Alert><AlertDescription>Modification impossible : ce logement est lié à Beyond.</AlertDescription></Alert>
          )}

          {!pricing.beyond_linked && (
            <Card className="space-y-3 p-4">
              <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                <Checkbox checked={confirmed} onCheckedChange={value => setConfirmed(value === true)} disabled={saving} />
                <span>Je confirme que les barres vertes remplacent toutes mes périodes tarifaires propriétaire existantes.</span>
              </label>
              <Button type="button" className="w-full" onClick={() => void submit()} disabled={saving || loading || !confirmed || !pricing}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {periods.length ? "Envoyer le planning vers NextPax" : "Retirer mes périodes propriétaire"}
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function PlannerStat({ label, value, color }: { label: string; value: React.ReactNode; color: string }) {
  return (
    <Card className="p-3 sm:p-4">
      <div className="truncate text-[11px] text-muted-foreground sm:text-xs">{label}</div>
      <div className={cn("mt-0.5 text-xl font-bold sm:mt-1 sm:text-2xl", color)}>{value}</div>
    </Card>
  );
}
