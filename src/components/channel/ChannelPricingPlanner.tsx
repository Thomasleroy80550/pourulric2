import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
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
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ChannelPricingEditor, { type DraftPeriod } from "./ChannelPricingEditor";
import ChannelPricingPeriodsSheet from "./ChannelPricingPeriodsSheet";
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
const MOBILE_DAY_WIDTH = 72;
const DESKTOP_LABEL_WIDTH = 230;
const MOBILE_LABEL_WIDTH = 130;
const ROW_MIN_HEIGHT = 78;

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
  cadence: "bg-muted/20",
  beyond: "bg-muted/20",
  default: "bg-white dark:bg-gray-950",
};

const OTA_MARKUPS = [
  { name: "Airbnb", multiplier: 1.17, color: "#ff385c" },
  { name: "Booking.com", multiplier: 1.19, color: "#016ce4" },
  { name: "Abritel / Vrbo", multiplier: 1.17, color: "#0067db" },
] as const;

function otaPrice(price: number, multiplier: number) {
  return Math.round(price * multiplier);
}

function otaPriceRange(price: number | null, currency: string, compact = false) {
  if (price === null || !Number.isFinite(price)) return null;
  const prices = OTA_MARKUPS.map(channel => otaPrice(price, channel.multiplier));
  const range = `${Math.min(...prices)}–${Math.max(...prices)}`;
  return compact ? `${range} ${currency === "EUR" ? "€" : currency}` : `${range} ${currency}`;
}

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
  if (!period.price.trim() || !Number.isFinite(price) || price < 0 || price > 100000) return { error: `${name} : prix entre 0 et 100 000.` };
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

function replaceWarning(result: ChannelPricingReplaceResult) {
  const received = result.periods_received ?? result.periods_applied;
  const ignored = result.periods_ignored ?? Math.max(0, received - result.periods_applied);
  if (ignored <= 0 && result.periods_applied >= received) return null;
  return result.warning?.trim() || "Certaines périodes sont couvertes par des prix saisis par la conciergerie, qui priment — seules les plages libres ont été appliquées";
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
  const [status, setStatus] = useState<{ type: "loading" | "success" | "warning" | "error"; message: string } | null>({ type: "loading", message: "Chargement des logements et des prix…" });
  const [search, setSearch] = useState("");
  const [showPeriods, setShowPeriods] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DraftPeriod | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<DraftPeriod | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<string | null>(null);
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
        setStatus(null);
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
    const period = [...(plan?.pricing?.periods ?? [])]
      .filter(item => item.start_date <= dateIso && item.end_date >= dateIso)
      .sort((a, b) => sourcePriority(a.source) - sourcePriority(b.source) || a.start_date.localeCompare(b.start_date))[0];
    if (period) {
      return { price: period.price, min_stay: period.min_stay, max_stay: period.max_stay, source: period.source, label: period.label };
    }
    return { price: plan?.pricing?.base_price ?? null, min_stay: null, max_stay: null, source: "default", label: null };
  }, [plans]);

  const selectAssignment = (assignmentId: string) => {
    if (saving || assignmentId === selectedAssignmentId) return;
    setSelectedAssignmentId(assignmentId);
    setEditor(null);
    setEditingKey(null);
    setSelectionStart(null);
    setSelectionEnd(null);
    setShowPeriods(false);
    setDeleteTarget(null);
    setStatus(null);
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
    setFormError("");
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (assignmentChanged || !selectionStart || selectionEnd) {
      setSelectionStart(dateIso);
      setSelectionEnd(null);
      setEditingKey(null);
      const current = dailyPrice(source, dateIso);
      setEditor({ ...newDraft(), start_date: dateIso, end_date: dateIso, price: current.price === null ? "" : String(current.price), min_stay: String(current.min_stay || 1), max_stay: current.max_stay === null ? "" : String(current.max_stay) });
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
    setShowPeriods(false);
    setFormError("");
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const closeEditor = () => {
    setEditor(null);
    setEditingKey(null);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const buildCandidate = (): { candidateDrafts: DraftPeriod[] } | { error: string } => {
    if (!editor) return { error: "Choisissez vos dates et votre prix." };
    const parsed = parseDraft(editor, "Votre prix");
    if ("error" in parsed) return { error: parsed.error };
    const candidateDrafts: DraftPeriod[] = [];
    for (const draft of selectedDrafts) {
      if (draft.key === editingKey || draft.end_date < todayIso) continue;
      if (draft.end_date < editor.start_date || draft.start_date > editor.end_date) {
        candidateDrafts.push(draft);
        continue;
      }
      if (draft.start_date < editor.start_date) {
        const date = new Date(editor.start_date + "T00:00:00Z");
        date.setUTCDate(date.getUTCDate() - 1);
        candidateDrafts.push({ ...draft, end_date: date.toISOString().slice(0, 10) });
      }
      if (draft.end_date > editor.end_date) {
        const date = new Date(editor.end_date + "T00:00:00Z");
        date.setUTCDate(date.getUTCDate() + 1);
        candidateDrafts.push({ ...draft, key: crypto.randomUUID(), start_date: date.toISOString().slice(0, 10) });
      }
    }
    candidateDrafts.push({ ...editor });
    return { candidateDrafts };
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

  const persist = async (candidateDrafts: DraftPeriod[], deletionConfirmed = false) => {
    if (saving || !selectedAssignmentId || !selectedPricing || selectedPricing.beyond_linked || selectedPlan?.pricingError) return false;
    const normalized = normalizeDrafts(candidateDrafts.filter(draft => draft.end_date >= todayIso));
    if ("error" in normalized) {
      setFormError(normalized.error);
      return false;
    }
    if (!normalized.rows.length && !deletionConfirmed) {
      setFormError("Choisissez vos dates et votre prix avant d’enregistrer.");
      return false;
    }
    const assignmentId = selectedAssignmentId;
    setFormError("");
    setSaving(true);
    setStatus(null);
    console.info("[ChannelPricingPlanner] Envoi des prix à Cadence", { periods: normalized.rows.length });
    try {
      const result = await replaceChannelPricing(assignmentId, normalized.rows);
      setAppliedByAssignment(previous => ({ ...previous, [assignmentId]: result }));
      const appliedDrafts: DraftPeriod[] = result.periods.map(period => ({
        key: period.id,
        start_date: period.start_date,
        end_date: period.end_date,
        price: String(period.price),
        min_stay: String(period.min_stay),
        max_stay: period.max_stay == null ? "" : String(period.max_stay),
        label: period.label ?? "",
      }));
      setDrafts(previous => ({ ...previous, [assignmentId]: appliedDrafts }));
      closeEditor();
      await refreshAssignment(assignmentId);
      const warning = replaceWarning(result) || (!result.pushed_to_nextpax ? "Vos prix sont enregistrés, mais leur diffusion sur les plateformes n’est pas encore confirmée." : null);
      const message = warning || (deletionConfirmed ? "La période a été supprimée." : "Vos prix sont enregistrés.");
      setStatus({ type: warning ? "warning" : "success", message });
      if (warning) toast.warning(message);
      else toast.success(message);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d’enregistrer vos prix. Réessayez.";
      setFormError(message);
      setStatus({ type: "error", message });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (saving) return;
    const candidate = buildCandidate();
    if ("error" in candidate) {
      setFormError(candidate.error);
      return;
    }
    await persist(candidate.candidateDrafts);
  };

  const deletePeriod = async () => {
    if (!deleteTarget || saving) return;
    const success = await persist(selectedDrafts.filter(draft => draft.key !== deleteTarget.key), true);
    if (success) setDeleteTarget(null);
    else {
      setDeleteTarget(null);
      setShowPeriods(false);
    }
  };

  const selectedCurrency = selectedPricing?.currency ?? "EUR";
  const selectedAppliedWarning = selectedApplied ? replaceWarning(selectedApplied) : null;
  const selectedSource = sources.find(source => source.id === selectedAssignmentId);
  const otaPrices = editor?.price.trim() && Number.isFinite(Number(editor.price)) && Number(editor.price) >= 0
    ? OTA_MARKUPS.map(channel => ({ name: channel.name, price: formatPrice(otaPrice(Number(editor.price), channel.multiplier), selectedCurrency), markup: Math.round((channel.multiplier - 1) * 100) }))
    : [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Mes prix</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choisissez vos dates, indiquez votre prix. C’est tout.</p>
      </div>

      {status && status.type !== "success" && (
        <Alert className={cn(status.type === "warning" && "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100")} variant={status.type === "error" ? "destructive" : "default"}>
          {status.type === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      <div ref={editorRef}>
        <ChannelPricingEditor
          properties={sources.map(source => ({ id: source.id, name: propertyName(source) }))}
          selectedId={selectedAssignmentId}
          onSelect={selectAssignment}
          draft={editor}
          onChange={patch => {
            setEditor(previous => ({ ...(previous ?? newDraft()), ...patch }));
            setFormError("");
            setStatus(null);
          }}
          onSave={() => void submit()}
          onCancel={() => { closeEditor(); setFormError(""); }}
          onShowPeriods={() => setShowPeriods(true)}
          minDate={todayIso}
          currency={selectedCurrency}
          disabled={!selectedPricing || Boolean(selectedPlan?.pricingError) || baseLoading}
          readOnly={Boolean(selectedPricing?.beyond_linked)}
          saving={saving}
          error={formError || selectedPlan?.pricingError || ""}
          otaPrices={otaPrices}
        />
      </div>

      {selectedApplied && !editor && (
        <details key={selectedAssignmentId + JSON.stringify(selectedApplied)} open={Boolean(selectedAppliedWarning)} className="rounded-xl border bg-card px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2"><CheckCircle2 className={cn("h-4 w-4", selectedAppliedWarning ? "text-amber-500" : "text-emerald-600")} />{selectedAppliedWarning ? "Voir les dates appliquées" : "Prix enregistrés"}</span>
            <span className="text-xs text-muted-foreground">Détails</span>
          </summary>
          <div className="mt-3 space-y-2 border-t pt-3 text-sm">
            <p className="text-xs text-muted-foreground">{selectedApplied.periods_received} reçue(s) · {selectedApplied.periods_applied} appliquée(s) · {selectedApplied.periods_ignored} non appliquée(s)</p>
            {selectedAppliedWarning && <p className="text-sm text-amber-700 dark:text-amber-300">{selectedAppliedWarning}</p>}
            {selectedApplied.periods.length ? selectedApplied.periods.map(period => (
              <div key={period.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/20 p-3">
                <div><p>{format(new Date(period.start_date + "T00:00:00"), "d MMM yyyy", { locale: fr })} → {format(new Date(period.end_date + "T00:00:00"), "d MMM yyyy", { locale: fr })}</p><p className="mt-1 text-xs text-muted-foreground">Plateformes : {otaPriceRange(period.price, selectedCurrency, true)} estimés · {period.min_stay} nuit(s) minimum</p></div>
                <p className="font-semibold">{formatPrice(period.price, selectedCurrency)} / nuit</p>
              </div>
            )) : <p className="text-muted-foreground">Aucune date n’a été appliquée. Les prix de la conciergerie sont conservés.</p>}
          </div>
        </details>
      )}

      <ChannelPricingPeriodsSheet
        open={showPeriods}
        onOpenChange={setShowPeriods}
        propertyName={selectedSource ? propertyName(selectedSource) : "Mon logement"}
        drafts={selectedDrafts}
        managedPeriods={selectedPricing?.periods.filter(period => period.source === "cadence" || period.source === "beyond") ?? []}
        canEdit={Boolean(selectedPricing && !selectedPricing.beyond_linked && !selectedPlan?.pricingError)}
        saving={saving}
        onEdit={draft => editDraft(selectedAssignmentId, draft)}
        onDelete={setDeleteTarget}
        formatPrice={price => formatPrice(price, selectedCurrency)}
        otaRange={price => otaPriceRange(price, selectedCurrency, true)}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={open => { if (!open && !saving) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce prix personnalisé ?</AlertDialogTitle>
            <AlertDialogDescription>Le prix personnalisé sera retiré sur ces dates. Vos autres périodes et les prix de la conciergerie seront conservés.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Annuler</AlertDialogCancel>
            <AlertDialogAction disabled={saving} onClick={event => { event.preventDefault(); void deletePeriod(); }} className="bg-red-600 text-white hover:bg-red-700">{saving ? "Suppression…" : "Supprimer"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-medium"><CalendarDays className="h-4 w-4 text-muted-foreground" /> Mon calendrier</div>
        <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/30 p-1">
          <Button type="button" variant="ghost" size="icon" onClick={() => setCurrentMonth(month => subMonths(month, 1))} aria-label="Mois précédent"><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-[140px] text-center text-sm font-medium">{capitalize(format(currentMonth, "MMMM yyyy", { locale: fr }))}</span>
          <Button type="button" variant="ghost" size="icon" onClick={() => setCurrentMonth(month => addMonths(month, 1))} aria-label="Mois suivant"><ChevronRight className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>Aujourd’hui</Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Touchez une date pour modifier son prix. La ligne du dessous estime le prix sur les plateformes.</p>
        {sources.length > 1 && <div className="relative w-full sm:w-56"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Rechercher un logement" value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher un logement" className="rounded-xl pl-9" /></div>}
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
                const beyondLinked = Boolean(plan.pricing?.beyond_linked);
                return (
                  <div key={source.id} className={cn("flex border-b border-slate-100 dark:border-slate-800", selectedAssignmentId === source.id && "bg-emerald-50/40 dark:bg-emerald-950/10")} style={{ minHeight: ROW_MIN_HEIGHT }}>
                    <div className={cn("sticky left-0 z-20 flex items-center gap-3 border-r border-slate-200 px-3 dark:border-slate-700", selectedAssignmentId === source.id ? "bg-emerald-50 dark:bg-emerald-950/30" : sourceIndex % 2 === 0 ? "bg-white dark:bg-gray-950" : "bg-slate-50/80 dark:bg-gray-900/50")} style={{ width: labelWidth, minWidth: labelWidth }}>
                      <div className="hidden h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground sm:flex">{initials(name)}</div>
                      <div className="min-w-0">
                        <button type="button" disabled={saving} onClick={() => selectAssignment(source.id)} className="block max-w-full truncate text-left text-sm font-semibold text-slate-800 hover:text-emerald-700 dark:text-slate-100">{name}</button>
                        {beyondLinked && <p className="mt-1 text-xs text-muted-foreground">Prix automatiques</p>}
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
                        const otaRange = otaPriceRange(daily.price, plan.pricing?.currency ?? "EUR", true);
                        const title = unavailable
                          ? `${name} · ${format(day, "d MMMM", { locale: fr })} · ${label}`
                          : `${name} · ${format(day, "d MMMM", { locale: fr })} · ${fullPrice(daily.price, plan.pricing?.currency ?? "EUR")}${otaRange ? ` · OTA ${otaRange}` : ""} · ${daily.min_stay ?? "—"} nuits min. · ${sourceLabels[daily.source]}`;
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
                                <span className={cn("text-sm font-semibold", daily.source === "owner" && "text-emerald-700 dark:text-emerald-300", daily.source === "cadence" && "text-foreground", daily.source === "beyond" && "text-foreground")}>{formatPrice(daily.price, plan.pricing?.currency ?? "EUR")}</span>
                                {otaRange && <span className="mt-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">≈ {otaRange}</span>}
                                <span className="mt-0.5 text-[10px] text-muted-foreground">{daily.min_stay ? `${daily.min_stay} nuits min.` : "—"}</span>
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

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Mes prix</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-400" /> Prix habituels</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-400" /> Réservé / bloqué</span>
      </div>
      {calendarLoading && <p className="flex items-center text-xs text-muted-foreground"><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Mise à jour des disponibilités…</p>}
      {Object.values(plans).some(plan => plan.calendarError) && (
        <Alert variant="destructive">
          <AlertDescription>Le prix reste lisible, mais le statut réservé/bloqué n’a pas pu être chargé pour au moins un logement.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
