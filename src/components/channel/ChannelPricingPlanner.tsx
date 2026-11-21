import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
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
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Euro,
  Loader2,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { getReservationSources, type ReservationSource } from "@/lib/channel-reservations-api";
import {
  getChannelCalendar,
  getChannelPricing,
  replaceChannelPricing,
  type ChannelCalendar,
  type ChannelPricingPeriodInput,
  type ChannelPricingRead,
  type ChannelPricingReadPeriod,
  type ChannelPricingReplaceResult,
  type ChannelPricingSource,
} from "@/lib/channel-features-api";

const DESKTOP_DAY_WIDTH = 82;
const MOBILE_DAY_WIDTH = 56;
const DESKTOP_LABEL_WIDTH = 230;
const MOBILE_LABEL_WIDTH = 160;
const ROW_MIN_HEIGHT = 78;

const AVATAR_COLORS = [
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-cyan-600",
  "bg-indigo-500",
];

interface DraftPeriod {
  key: string;
  start_date: string;
  end_date: string;
  price: string;
  min_stay: string;
  max_stay: string;
  label: string;
}

interface PlanEntry {
  pricing: ChannelPricingRead | null;
  calendar: ChannelCalendar | null;
  pricingError: string;
  calendarError: string;
}

interface DailyPrice {
  price: number | null;
  min_stay: number | null;
  max_stay: number | null;
  source: ChannelPricingSource;
  label: string | null;
}

type Plans = Record<string, PlanEntry>;
type DraftsByAssignment = Record<string, DraftPeriod[]>;

const emptyEntry: PlanEntry = { pricing: null, calendar: null, pricingError: "", calendarError: "" };

const sourceLabels: Record<ChannelPricingSource, string> = {
  owner: "Vos prix",
  cadence: "Gestionnaire",
  beyond: "Beyond",
  default: "Prix de base",
};

const sourceCellClasses: Record<ChannelPricingSource, string> = {
  owner: "bg-emerald-50 dark:bg-emerald-950/25",
  cadence: "bg-amber-50 dark:bg-amber-950/25",
  beyond: "bg-orange-50 dark:bg-orange-950/25",
  default: "bg-white dark:bg-gray-950",
};

const sourceDotClasses: Record<ChannelPricingSource, string> = {
  owner: "bg-emerald-500",
  cadence: "bg-amber-500",
  beyond: "bg-orange-500",
  default: "bg-slate-400",
};

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

function normalizeDrafts(periods: DraftPeriod[]) {
  const rows: ChannelPricingPeriodInput[] = [];
  for (const [index, period] of periods.entries()) {
    const parsed = parseDraft(period, `Période ${index + 1}`);
    if ("error" in parsed) return { error: parsed.error };
    rows.push(parsed.row);
  }
  const sorted = [...rows].sort((a, b) => a.start_date.localeCompare(b.start_date) || a.end_date.localeCompare(b.end_date));
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index].start_date <= sorted[index - 1].end_date) return { error: "Deux périodes propriétaire se chevauchent." };
  }
  return { rows: sorted };
}

function formatPrice(price: number | null, currency: string) {
  if (price === null || !Number.isFinite(price)) return "—";
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}

function fullPrice(price: number | null, currency: string) {
  if (price === null || !Number.isFinite(price)) return "prix non renseigné";
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 2 }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}

function propertyName(source: ReservationSource) {
  return source.user_rooms?.room_name || source.property_name || "Logement Cadence";
}

function propertyCity(source: ReservationSource) {
  const raw = source.property_name || "";
  const parts = raw.split(",").map(part => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts.slice(1).join(", ") : "Logement attribué";
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map(part => part[0]).join("").slice(0, 2).toUpperCase() || "LG";
}

function draftAsPeriod(draft: DraftPeriod): ChannelPricingReadPeriod | null {
  if (!draft.start_date || !draft.end_date || draft.start_date > draft.end_date) return null;
  const price = draft.price.trim() ? Number(draft.price) : null;
  const minStay = draft.min_stay.trim() ? Number(draft.min_stay) : null;
  const maxStay = draft.max_stay.trim() ? Number(draft.max_stay) : null;
  return {
    id: draft.key,
    source: "owner",
    label: draft.label.trim() || null,
    start_date: draft.start_date,
    end_date: draft.end_date,
    price: price !== null && Number.isFinite(price) ? price : 0,
    min_stay: minStay !== null && Number.isInteger(minStay) ? minStay : null,
    max_stay: maxStay !== null && Number.isInteger(maxStay) ? maxStay : null,
  };
}

function isWeekend(date: Date) {
  return date.getDay() === 0 || date.getDay() === 6;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function sourcePriority(source: ChannelPricingSource) {
  if (source === "cadence") return 0;
  if (source === "owner") return 1;
  if (source === "beyond") return 2;
  return 3;
}

export default function ChannelPricingPlanner() {
  const isMobile = useIsMobile();
  const dayWidth = isMobile ? MOBILE_DAY_WIDTH : DESKTOP_DAY_WIDTH;
  const labelWidth = isMobile ? MOBILE_LABEL_WIDTH : DESKTOP_LABEL_WIDTH;
  const [sources, setSources] = useState<ReservationSource[]>([]);
  const [plans, setPlans] = useState<Plans>({});
  const [drafts, setDrafts] = useState<DraftsByAssignment>({});
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [baseLoading, setBaseLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "loading" | "success" | "error"; message: string } | null>({ type: "loading", message: "Chargement des logements et des prix…" });
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(true);
  const [editor, setEditor] = useState<DraftPeriod | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [allowEmptyReplace, setAllowEmptyReplace] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [appliedByAssignment, setAppliedByAssignment] = useState<Record<string, ChannelPricingReplaceResult>>({});

  const monthDays = useMemo(() => eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }), [currentMonth]);
  const monthFrom = format(monthDays[0], "yyyy-MM-dd");
  const monthTo = format(addDays(monthDays[monthDays.length - 1], 1), "yyyy-MM-dd");
  const today = startOfDay(new Date());
  const todayIso = parisToday();

  const loadCalendars = useCallback(async (assignments: ReservationSource[], from: string, to: string) => {
    if (!assignments.length) return;
    setCalendarLoading(true);
    const results = await Promise.all(assignments.map(async source => {
      try {
        return { id: source.id, calendar: await getChannelCalendar(source.id, from, to), error: "" };
      } catch (error) {
        return { id: source.id, calendar: null, error: error instanceof Error ? error.message : "Calendrier indisponible." };
      }
    }));
    setPlans(previous => {
      const next = { ...previous };
      for (const result of results) {
        next[result.id] = { ...(next[result.id] ?? emptyEntry), calendar: result.calendar, calendarError: result.error };
      }
      return next;
    });
    setCalendarLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    const loadBase = async () => {
      setBaseLoading(true);
      setStatus({ type: "loading", message: "Chargement des logements et des périodes tarifaires…" });
      try {
        const assignments: ReservationSource[] = [];
        let cursor: string | null = null;
        do {
          const page = await getReservationSources(cursor);
          assignments.push(...page.sources);
          cursor = page.next_cursor;
        } while (cursor);

        const pricingResults = await Promise.all(assignments.map(async source => {
          try {
            return { source, pricing: await getChannelPricing(source.id), error: "" };
          } catch (error) {
            return { source, pricing: null, error: error instanceof Error ? error.message : "Prix indisponibles." };
          }
        }));
        if (!active) return;

        const nextPlans: Plans = {};
        const nextDrafts: DraftsByAssignment = {};
        for (const result of pricingResults) {
          nextPlans[result.source.id] = { ...emptyEntry, pricing: result.pricing, pricingError: result.error };
          nextDrafts[result.source.id] = result.pricing?.periods.filter(period => period.source === "owner").map(draftFromPeriod) ?? [];
        }
        setSources(assignments);
        setPlans(nextPlans);
        setDrafts(nextDrafts);
        setSelectedAssignmentId(assignments.find(source => nextPlans[source.id]?.pricing)?.id ?? assignments[0]?.id ?? "");
        setStatus(assignments.length ? { type: "success", message: "Planning de prix chargé." } : null);
      } catch (error) {
        if (active) setStatus({ type: "error", message: error instanceof Error ? error.message : "Impossible de charger les logements Cadence." });
      } finally {
        if (active) setBaseLoading(false);
      }
    };
    void loadBase();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!sources.length) return;
    void loadCalendars(sources, monthFrom, monthTo);
  }, [sources, monthFrom, monthTo, loadCalendars]);

  const selectedPlan = selectedAssignmentId ? plans[selectedAssignmentId] : undefined;
  const selectedPricing = selectedPlan?.pricing ?? null;
  const selectedDrafts = selectedAssignmentId ? drafts[selectedAssignmentId] ?? [] : [];
  const selectedApplied = selectedAssignmentId ? appliedByAssignment[selectedAssignmentId] : undefined;

  const filteredSources = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sources;
    return sources.filter(source => `${propertyName(source)} ${propertyCity(source)}`.toLowerCase().includes(query));
  }, [sources, search]);

  const dailyPrice = useCallback((source: ReservationSource, dateIso: string): DailyPrice => {
    const plan = plans[source.id];
    const ownerDraftPeriods = (drafts[source.id] ?? []).map(draftAsPeriod).filter((period): period is ChannelPricingReadPeriod => Boolean(period));
    const savedPeriods = plan?.pricing?.periods.filter(period => period.source !== "owner") ?? [];
    const period = [...savedPeriods, ...ownerDraftPeriods]
      .filter(item => item.start_date <= dateIso && item.end_date >= dateIso)
      .sort((a, b) => sourcePriority(a.source) - sourcePriority(b.source) || a.start_date.localeCompare(b.start_date))[0];
    if (period) {
      return { price: period.price, min_stay: period.min_stay, max_stay: period.max_stay, source: period.source, label: period.label };
    }
    return { price: plan?.pricing?.base_price ?? null, min_stay: null, max_stay: null, source: "default", label: null };
  }, [plans, drafts]);

  const selectAssignment = (assignmentId: string) => {
    if (assignmentId === selectedAssignmentId) return;
    setSelectedAssignmentId(assignmentId);
    setEditor(null);
    setEditingKey(null);
    setSelectionStart(null);
    setSelectionEnd(null);
    setConfirmed(false);
    setAllowEmptyReplace(false);
    setFormError("");
  };

  const handleDayClick = (source: ReservationSource, date: Date) => {
    const plan = plans[source.id];
    if (!plan?.pricing || plan.pricing.beyond_linked || saving) return;
    const dateIso = format(date, "yyyy-MM-dd");
    if (dateIso < todayIso) {
      setFormError("Les périodes tarifaires commencent aujourd’hui ou plus tard.");
      return;
    }
    const assignmentChanged = selectedAssignmentId !== source.id;
    if (assignmentChanged) selectAssignment(source.id);
    setFormOpen(true);
    setFormError("");
    if (assignmentChanged || !selectionStart || selectionEnd) {
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

  const editDraft = (assignmentId: string, draft: DraftPeriod) => {
    if (saving || plans[assignmentId]?.pricing?.beyond_linked) return;
    selectAssignment(assignmentId);
    setEditingKey(draft.key);
    setEditor({ ...draft });
    setFormOpen(true);
    setFormError("");
  };

  const closeEditor = () => {
    setEditor(null);
    setEditingKey(null);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const buildCandidate = (): { candidateDrafts: DraftPeriod[]; rows: ChannelPricingPeriodInput[] } | { error: string } => {
    let candidateDrafts = selectedDrafts;
    if (editor) {
      const parsed = parseDraft(editor, editingKey ? "La période modifiée" : "La nouvelle période");
      if ("error" in parsed) return { error: parsed.error };
      const editorDraft = { ...editor, key: editingKey ?? crypto.randomUUID() };
      candidateDrafts = editingKey
        ? selectedDrafts.map(draft => draft.key === editingKey ? editorDraft : draft)
        : [...selectedDrafts, editorDraft];
    }
    candidateDrafts = [...candidateDrafts].sort((a, b) => a.start_date.localeCompare(b.start_date) || a.end_date.localeCompare(b.end_date));
    const normalizedCandidate = normalizeDrafts(candidateDrafts);
    if ("error" in normalizedCandidate) return { error: normalizedCandidate.error };
    return { candidateDrafts, rows: normalizedCandidate.rows };
  };

  const applyEditor = () => {
    if (!editor || !selectedAssignmentId) return;
    const candidate = buildCandidate();
    if ("error" in candidate) {
      setFormError(candidate.error);
      return;
    }
    setDrafts(previous => ({ ...previous, [selectedAssignmentId]: candidate.candidateDrafts }));
    closeEditor();
    setFormError("");
  };

  const removeDraft = (assignmentId: string, key: string) => {
    setDrafts(previous => ({ ...previous, [assignmentId]: (previous[assignmentId] ?? []).filter(draft => draft.key !== key) }));
    if (editingKey === key) closeEditor();
    setFormError("");
  };

  const refreshAssignment = async (assignmentId: string) => {
    const [pricingResult, calendarResult] = await Promise.allSettled([
      getChannelPricing(assignmentId),
      getChannelCalendar(assignmentId, monthFrom, monthTo),
    ]);
    if (pricingResult.status === "fulfilled") {
      setPlans(previous => ({ ...previous, [assignmentId]: { ...(previous[assignmentId] ?? emptyEntry), pricing: pricingResult.value, pricingError: "" } }));
      setDrafts(previous => ({ ...previous, [assignmentId]: pricingResult.value.periods.filter(period => period.source === "owner").map(draftFromPeriod) }));
    } else {
      setPlans(previous => ({ ...previous, [assignmentId]: { ...(previous[assignmentId] ?? emptyEntry), pricingError: pricingResult.reason instanceof Error ? pricingResult.reason.message : "Prix indisponibles." } }));
    }
    if (calendarResult.status === "fulfilled") {
      setPlans(previous => ({ ...previous, [assignmentId]: { ...(previous[assignmentId] ?? emptyEntry), calendar: calendarResult.value, calendarError: "" } }));
    } else {
      setPlans(previous => ({ ...previous, [assignmentId]: { ...(previous[assignmentId] ?? emptyEntry), calendarError: calendarResult.reason instanceof Error ? calendarResult.reason.message : "Calendrier indisponible." } }));
    }
  };

  const submit = async () => {
    setFormError("");
    if (!selectedAssignmentId || !selectedPricing) {
      setFormError("Sélectionnez un logement dont les prix ont été lus avant l’envoi.");
      return;
    }
    if (selectedPricing.beyond_linked) {
      setFormError("Ce logement est lié à Beyond : ses prix et restrictions viennent de Beyond.");
      return;
    }
    if (!confirmed) {
      setFormError("Confirmez que ce planning remplace toutes vos périodes propriétaire existantes.");
      return;
    }
    const candidate = buildCandidate();
    if ("error" in candidate) {
      setFormError(candidate.error);
      return;
    }
    if (candidate.rows.length === 0 && !allowEmptyReplace) {
      setFormError("Aucune période à envoyer. Ajoutez un prix ou confirmez explicitement la suppression de toutes vos périodes.");
      return;
    }
    console.info("[ChannelPricingPlanner] Envoi des prix à Cadence", {
      periods: candidate.rows.length,
      emptyReplaceConfirmed: allowEmptyReplace,
    });
    setSaving(true);
    setStatus({ type: "loading", message: "Envoi du planning à Cadence… Cadence transmettra ensuite à NextPax." });
    try {
      const result = await replaceChannelPricing(selectedAssignmentId, candidate.rows);
      setAppliedByAssignment(previous => ({ ...previous, [selectedAssignmentId]: result }));
      setDrafts(previous => ({ ...previous, [selectedAssignmentId]: candidate.candidateDrafts }));
      setConfirmed(false);
      setAllowEmptyReplace(false);
      closeEditor();
      await refreshAssignment(selectedAssignmentId);
      setStatus({ type: "success", message: `${result.periods_applied} période(s) appliquée(s) par Cadence.` });
      toast.success(`${result.periods_applied} période(s) appliquée(s) : Cadence les transmet maintenant à NextPax.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d’envoyer les prix à Cadence.";
      setFormError(message);
      setStatus({ type: "error", message });
    } finally {
      setSaving(false);
    }
  };

  const ownerChips = selectedDrafts;
  const cadencePeriods = selectedPricing?.periods.filter(period => period.source === "cadence") ?? [];
  const beyondPeriods = selectedPricing?.periods.filter(period => period.source === "beyond") ?? [];
  const beyondPrices = beyondPeriods.map(period => period.price);
  const selectedCurrency = selectedPricing?.currency ?? "EUR";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
            <Euro className="h-5 w-5 text-emerald-600 sm:h-6 sm:w-6" />
            Prix & restrictions
          </h2>
          <p className="text-sm text-muted-foreground">Assignez un prix/nuit et un séjour minimum par période — l’envoi est fait à Cadence, qui transmet ensuite à NextPax.</p>
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(month => subMonths(month, 1))} aria-label="Mois précédent"><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-[150px] text-center text-sm font-semibold sm:text-base">{capitalize(format(currentMonth, "MMMM yyyy", { locale: fr }))}</span>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(month => addMonths(month, 1))} aria-label="Mois suivant"><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="secondary" size="sm" onClick={() => setCurrentMonth(new Date())}>Aujourd'hui</Button>
        </div>
      </div>

      {status && (
        <Alert className={cn(status.type === "success" && "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100", status.type === "error" && "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30")}>
          {status.type === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : status.type === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      <details open={formOpen} onToggle={event => setFormOpen(event.currentTarget.open)} className="group rounded-xl border bg-card shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-medium">
          <span>Assigner une période tarifaire</span>
          <Badge variant="secondary">{selectedDrafts.length} période(s) propriétaire</Badge>
        </summary>
        <div className="space-y-4 border-t p-4">
          {selectedPricing?.beyond_linked && (
            <Alert variant="destructive">
              <AlertTitle>Tarification gérée par Beyond</AlertTitle>
              <AlertDescription>Les prix et restrictions de ce logement viennent de Beyond. La grille est en lecture seule.</AlertDescription>
            </Alert>
          )}
          {formError && <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert>}

          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
            <div className="space-y-2 xl:col-span-2">
              <Label>Logement</Label>
              <Select value={selectedAssignmentId} onValueChange={selectAssignment} disabled={!sources.length || saving}>
                <SelectTrigger><SelectValue placeholder="Choisir un logement" /></SelectTrigger>
                <SelectContent>
                  {sources.map(source => <SelectItem key={source.id} value={source.id}>{propertyName(source)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Début</Label><Input type="date" value={editor?.start_date ?? ""} min={todayIso} onChange={event => setEditor(previous => previous ? { ...previous, start_date: event.target.value } : { ...newDraft(), start_date: event.target.value, end_date: event.target.value })} disabled={!selectedPricing || selectedPricing.beyond_linked || saving} /></div>
            <div className="space-y-2"><Label>Fin</Label><Input type="date" value={editor?.end_date ?? ""} min={editor?.start_date || todayIso} onChange={event => setEditor(previous => previous ? { ...previous, end_date: event.target.value } : { ...newDraft(), start_date: event.target.value, end_date: event.target.value })} disabled={!selectedPricing || selectedPricing.beyond_linked || saving} /></div>
            <div className="space-y-2"><Label>Prix / nuit ({selectedCurrency})</Label><Input type="number" min="0" max="100000" step="1" value={editor?.price ?? ""} onChange={event => setEditor(previous => previous ? { ...previous, price: event.target.value } : { ...newDraft(), price: event.target.value })} disabled={!selectedPricing || selectedPricing.beyond_linked || saving} /></div>
            <div className="space-y-2"><Label>Nuits min.</Label><Input type="number" min="1" max="365" step="1" value={editor?.min_stay ?? "1"} onChange={event => setEditor(previous => previous ? { ...previous, min_stay: event.target.value } : { ...newDraft(), min_stay: event.target.value })} disabled={!selectedPricing || selectedPricing.beyond_linked || saving} /></div>
            <div className="space-y-2"><Label>Nuits max.</Label><Input type="number" min={editor?.min_stay || "1"} step="1" value={editor?.max_stay ?? ""} onChange={event => setEditor(previous => previous ? { ...previous, max_stay: event.target.value } : { ...newDraft(), max_stay: event.target.value })} disabled={!selectedPricing || selectedPricing.beyond_linked || saving} placeholder="Optionnel" /></div>
            <div className="space-y-2 md:col-span-2 xl:col-span-3"><Label>Nom période</Label><Input maxLength={60} value={editor?.label ?? ""} onChange={event => setEditor(previous => previous ? { ...previous, label: event.target.value } : { ...newDraft(), label: event.target.value })} disabled={!selectedPricing || selectedPricing.beyond_linked || saving} placeholder="Été 2027" /></div>
            <div className="flex items-end gap-2 md:col-span-1 xl:col-span-4">
              <Button type="button" onClick={applyEditor} disabled={!editor || !selectedPricing || selectedPricing.beyond_linked || saving}>{editingKey ? "Mettre à jour" : "Appliquer"}</Button>
              {editor && <Button type="button" variant="outline" onClick={closeEditor} disabled={saving}>Annuler</Button>}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {ownerChips.map(draft => (
                <div key={draft.key} className={cn("flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs shadow-sm dark:bg-gray-950", editingKey === draft.key && "border-emerald-500 ring-1 ring-emerald-500")}>
                  <button type="button" onClick={() => editDraft(selectedAssignmentId, draft)} className="min-w-0 text-left" disabled={selectedPricing?.beyond_linked || saving}>
                    <span className="font-medium">{draft.label || "Période propriétaire"}</span>
                    <span className="ml-2 text-muted-foreground">{draft.start_date} → {draft.end_date}</span>
                    <span className="ml-2 font-semibold text-emerald-600">{formatPrice(draft.price ? Number(draft.price) : null, selectedCurrency)}</span>
                    <span className="ml-2 font-medium text-amber-600">{draft.min_stay || "1"} nuits min.</span>
                  </button>
                  <button type="button" onClick={() => removeDraft(selectedAssignmentId, draft.key)} disabled={selectedPricing?.beyond_linked || saving} aria-label="Supprimer cette période" className="rounded-full p-0.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {cadencePeriods.map(period => (
                <span key={period.id} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                  {period.label || "Période gestionnaire"} · {period.start_date} → {period.end_date} · {formatPrice(period.price, selectedCurrency)} · Géré par votre conciergerie
                </span>
              ))}
              {beyondPeriods.length > 0 && (
                <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs text-orange-900 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-100">
                  Prix Beyond · {formatPrice(Math.min(...beyondPrices), selectedCurrency)}–{formatPrice(Math.max(...beyondPrices), selectedCurrency)} · {beyondPeriods.length} période(s)
                </span>
              )}
              {!ownerChips.length && !cadencePeriods.length && !beyondPeriods.length && <p className="text-sm text-muted-foreground">Aucune période active pour ce logement.</p>}
            </div>
            <p className="text-xs text-muted-foreground">Les périodes saisies par votre conciergerie priment et peuvent découper les plages propriétaire.</p>
          </div>

          {!selectedPricing?.beyond_linked && (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <label className="flex items-start gap-3 text-sm">
                <Checkbox checked={confirmed} onCheckedChange={value => setConfirmed(value === true)} disabled={saving || !selectedPricing} />
                <span>Je confirme que ce planning remplace toutes mes périodes propriétaire existantes pour ce logement.</span>
              </label>
              {editor && (
                <Alert>
                  <AlertDescription>La période en cours de saisie sera appliquée automatiquement avant l’envoi.</AlertDescription>
                </Alert>
              )}
              {!selectedDrafts.length && !editor && (
                <Alert variant="destructive">
                  <AlertDescription className="space-y-3">
                    <p>La liste propriétaire est vide : aucun prix ne sera envoyé sauf si vous confirmez la suppression de vos périodes existantes.</p>
                    <label className="flex items-start gap-3 text-sm font-normal">
                      <Checkbox checked={allowEmptyReplace} onCheckedChange={value => setAllowEmptyReplace(value === true)} disabled={saving || !selectedPricing} />
                      <span>Je veux supprimer toutes mes périodes propriétaire existantes pour ce logement.</span>
                    </label>
                  </AlertDescription>
                </Alert>
              )}
              <Button type="button" onClick={() => void submit()} disabled={saving || !confirmed || !selectedPricing}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {editor ? "Appliquer et envoyer à Cadence" : selectedDrafts.length ? "Envoyer à Cadence" : "Confirmer la suppression dans Cadence"}
              </Button>
            </div>
          )}

          {selectedApplied && (
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Périodes réellement appliquées</p>
                <Badge variant="secondary">{selectedApplied.periods_applied} · Cadence → NextPax {selectedApplied.pushed_to_nextpax ? "OK" : "non poussé"}</Badge>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                {selectedApplied.periods.map(period => <p key={period.id}>{period.start_date} → {period.end_date}{period.label ? ` · ${period.label}` : ""} · {fullPrice(period.price, selectedCurrency)}</p>)}
              </div>
            </div>
          )}
        </div>
      </details>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher un logement…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-emerald-500" /> Vos prix</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-amber-500" /> Gestionnaire</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-orange-500" /> Beyond</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-slate-400" /> Prix de base</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-indigo-500" /> Réservé / bloqué</span>
        </div>
      </div>

      <Card className="overflow-hidden border-slate-200 dark:border-slate-700">
        <div className="max-h-[72vh] overflow-auto">
          <div style={{ minWidth: labelWidth + monthDays.length * dayWidth }}>
            <div className="sticky top-0 z-30 flex border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-gray-950">
              <div className="sticky left-0 z-40 flex items-center border-r border-slate-200 bg-white px-3 py-3 text-xs font-semibold text-muted-foreground dark:border-slate-700 dark:bg-gray-950" style={{ width: labelWidth, minWidth: labelWidth }}>
                Logement
              </div>
              {monthDays.map(day => {
                const dayIso = format(day, "yyyy-MM-dd");
                const isToday = dayIso === todayIso;
                return (
                  <div key={dayIso} className={cn("flex min-h-[64px] flex-col items-center justify-center gap-1 border-r border-slate-100 dark:border-slate-800", isWeekend(day) && "bg-slate-50 dark:bg-gray-900/50")} style={{ width: dayWidth, minWidth: dayWidth }}>
                    <span className={cn("text-[10px] uppercase text-muted-foreground", isToday && "font-semibold text-primary")}>{format(day, "EEEEE", { locale: fr })}</span>
                    <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium", isToday ? "bg-primary text-primary-foreground" : "text-slate-700 dark:text-slate-200")}>{format(day, "d")}</span>
                  </div>
                );
              })}
            </div>

            {baseLoading ? (
              <div className="flex min-h-48 items-center justify-center gap-2 p-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement des prix…</div>
            ) : filteredSources.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Aucun logement ne correspond à cette recherche.</div>
            ) : (
              filteredSources.map((source, sourceIndex) => {
                const plan = plans[source.id] ?? emptyEntry;
                const name = propertyName(source);
                const city = propertyCity(source);
                const beyondLinked = Boolean(plan.pricing?.beyond_linked);
                return (
                  <div key={source.id} className={cn("flex border-b border-slate-100 dark:border-slate-800", selectedAssignmentId === source.id && "bg-emerald-50/40 dark:bg-emerald-950/10")} style={{ minHeight: ROW_MIN_HEIGHT }}>
                    <div className={cn("sticky left-0 z-20 flex items-center gap-3 border-r border-slate-200 px-3 dark:border-slate-700", selectedAssignmentId === source.id ? "bg-emerald-50 dark:bg-emerald-950/30" : sourceIndex % 2 === 0 ? "bg-white dark:bg-gray-950" : "bg-slate-50/80 dark:bg-gray-900/50")} style={{ width: labelWidth, minWidth: labelWidth }}>
                      <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm", AVATAR_COLORS[sourceIndex % AVATAR_COLORS.length])}>{initials(name)}</div>
                      <div className="min-w-0">
                        <button type="button" onClick={() => selectAssignment(source.id)} className="block max-w-full truncate text-left text-sm font-semibold text-slate-800 hover:text-emerald-700 dark:text-slate-100">{name}</button>
                        <p className="truncate text-xs text-muted-foreground">{city}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">base {formatPrice(plan.pricing?.base_price ?? null, plan.pricing?.currency ?? "EUR")}</p>
                      </div>
                    </div>

                    {plan.pricingError ? (
                      <div className="flex flex-1 items-center px-4 text-sm text-red-600">{plan.pricingError}</div>
                    ) : (
                      monthDays.map(day => {
                        const date = format(day, "yyyy-MM-dd");
                        const daily = dailyPrice(source, date);
                        const calendarDay = plan.calendar?.days.find(item => item.date === date);
                        const unavailable = calendarDay?.availability === "booked" || calendarDay?.availability === "blocked";
                        const selected = selectedAssignmentId === source.id && selectionStart && date >= selectionStart && date <= (selectionEnd ?? selectionStart);
                        const editingDraft = editingKey && selectedAssignmentId === source.id ? selectedDrafts.find(draft => draft.key === editingKey) : null;
                        const editing = Boolean(editingDraft && date >= editingDraft.start_date && date <= editingDraft.end_date);
                        const label = unavailable ? (calendarDay?.availability === "booked" ? "Réservé" : "Bloqué") : null;
                        const title = unavailable
                          ? `${name} · ${format(day, "d MMMM", { locale: fr })} · ${label}`
                          : `${name} · ${format(day, "d MMMM", { locale: fr })} · ${fullPrice(daily.price, plan.pricing?.currency ?? "EUR")} · ${daily.min_stay ?? "—"} nuits min. · ${sourceLabels[daily.source]}`;
                        return (
                          <button
                            key={date}
                            type="button"
                            disabled={beyondLinked || saving || !plan.pricing}
                            onClick={() => handleDayClick(source, day)}
                            title={title}
                            className={cn(
                              "flex min-h-[74px] flex-col items-center justify-center border-r border-slate-100 px-1 text-center transition-colors dark:border-slate-800",
                              unavailable ? "bg-indigo-50 text-indigo-900 dark:bg-indigo-950/35 dark:text-indigo-100" : sourceCellClasses[daily.source],
                              isWeekend(day) && !unavailable && daily.source === "default" && "bg-slate-50 dark:bg-gray-900/50",
                              isSameDay(day, today) && "shadow-[inset_0_0_0_2px_hsl(var(--primary))]",
                              (selected || editing) && "bg-emerald-100 shadow-[inset_0_0_0_2px_rgb(16,185,129)] dark:bg-emerald-900/40",
                              !beyondLinked && "hover:bg-emerald-100/70 dark:hover:bg-emerald-900/30",
                              beyondLinked && "cursor-not-allowed",
                            )}
                            style={{ width: dayWidth, minWidth: dayWidth }}
                          >
                            {label ? (
                              <span className="text-xs font-semibold">{label}</span>
                            ) : (
                              <>
                                <span className={cn("text-sm font-semibold", daily.source === "owner" && "text-emerald-700 dark:text-emerald-300", daily.source === "cadence" && "text-amber-700 dark:text-amber-300", daily.source === "beyond" && "text-orange-700 dark:text-orange-300")}>{formatPrice(daily.price, plan.pricing?.currency ?? "EUR")}</span>
                                <span className="mt-1 text-[10px] text-muted-foreground">{daily.min_stay ? `${daily.min_stay} nuits min.` : "—"}</span>
                              </>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Card>

      {calendarLoading && <p className="flex items-center text-xs text-muted-foreground"><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Mise à jour des disponibilités…</p>}
      {Object.values(plans).some(plan => plan.calendarError) && (
        <Alert variant="destructive">
          <AlertDescription>Le prix reste lisible, mais le statut réservé/bloqué n’a pas pu être chargé pour au moins un logement.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
