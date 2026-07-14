"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  eachMonthOfInterval,
  endOfMonth,
  format,
  getDaysInMonth,
  getDaysInYear,
  isAfter,
  isBefore,
  isSameDay,
  isValid,
  parse,
  parseISO,
  startOfMonth,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  BedDouble,
  CalendarClock,
  CalendarDays,
  Landmark,
  PercentCircle,
  RotateCcw,
  Star,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";

import MainLayout from "@/components/MainLayout";
import BannedUserMessage from "@/components/BannedUserMessage";
import DashboardV3Reveal from "@/components/DashboardV3Reveal";
import AnnouncementsBanner from "@/components/AnnouncementsBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/SessionContextProvider";
import { getMyStatements } from "@/lib/statements-api";
import { SavedInvoice } from "@/lib/admin-api";
import { getUserRooms, UserRoom } from "@/lib/user-room-api";
import { getReviews } from "@/lib/reviews-api";
import {
  fetchKrossbookingReservations,
  KrossbookingReservation,
} from "@/lib/krossbooking";
import CustomChartTooltip from "@/components/CustomChartTooltip";

const CHANNELS = [
  { name: "Airbnb", color: "#FF5A5F" },
  { name: "Booking", color: "#003580" },
  { name: "Abritel", color: "#2D60E0" },
  { name: "Hello Keys", color: "#00A699" },
  { name: "Proprio", color: "#4f46e5" },
  { name: "Autre", color: "#6b7280" },
];

const MONTH_FALLBACK: Record<string, number> = {
  janvier: 0, février: 1, fevrier: 1, mars: 2, avril: 3, mai: 4,
  juin: 5, juillet: 6, août: 7, aout: 7, septembre: 8, octobre: 9,
  novembre: 10, décembre: 11, decembre: 11,
};

// Palette alignée sur l'identité Hello Keys (tokens de marque)
const REVEAL_STORAGE_KEY = "dashboard_v3_reveal_seen";

const COMPARE_COLOR = "hsl(var(--muted-foreground))";
const CA_COLOR = "hsl(var(--primary))";
const BENEF_COLOR = "hsl(var(--accent))";
const OCC_COLOR = "hsl(var(--accent))";
const RES_COLOR = "hsl(var(--sidebar-foreground))";

type MonthRow = {
  name: string;
  ca: number;
  benef: number;
  reservations: number;
  occupation: number;
};

type YearMetrics = {
  totalCA: number;
  totalNet: number;
  totalNights: number;
  totalGuests: number;
  totalReservations: number;
  occupancyRate: number;
  netPricePerNight: number;
  monthly: MonthRow[];
  channels: { name: string; color: string; value: number }[];
  bestMonth: { name: string; benef: number; ca: number; reservations: number } | null;
};

const extractAvailableYears = (statements: SavedInvoice[]): number[] => {
  const years = new Set<number>();
  statements.forEach((s) => {
    const match = s.period.match(/(20\d{2})/);
    if (match) years.add(parseInt(match[1], 10));
  });
  return Array.from(years).sort((a, b) => b - a);
};

const buildYearMetrics = (
  statements: SavedInvoice[],
  year: number,
  rooms: UserRoom[],
): YearMetrics => {
  const statementsForYear = statements.filter((s) => s.period.includes(String(year)));

  const months = eachMonthOfInterval({
    start: startOfMonth(new Date(year, 0, 1)),
    end: endOfMonth(new Date(year, 11, 1)),
  });

  const monthly: MonthRow[] = months.map((m) => ({
    name: format(m, "MMM", { locale: fr }),
    ca: 0,
    benef: 0,
    reservations: 0,
    occupation: 0,
  }));
  const monthlyNights = Array(12).fill(0);

  let totalCA = 0;
  let totalNet = 0;
  let totalNights = 0;
  let totalGuests = 0;
  let totalReservations = 0;

  const channelCounts: Record<string, number> = {};
  CHANNELS.forEach((c) => (channelCounts[c.name.toLowerCase()] = 0));

  statementsForYear.forEach((s) => {
    const invoiceData = Array.isArray(s.invoice_data) ? s.invoice_data : [];
    const ca =
      s.totals.totalCA ??
      invoiceData.reduce(
        (acc: number, item: any) =>
          acc + (item.prixSejour || 0) + (item.fraisMenage || 0) + (item.taxeDeSejour || 0),
        0,
      );
    const frais = s.totals.totalFacture || 0;
    const moneyIn = s.totals.totalMontantVerse || 0;
    const net = moneyIn - frais;
    const reservations = s.totals.totalReservations ?? invoiceData.length;

    totalCA += ca;
    totalNet += net;
    totalNights += s.totals.totalNuits || 0;
    totalGuests += s.totals.totalVoyageurs || 0;
    totalReservations += reservations;

    let monthIndex: number | undefined;
    let parsed = parse(s.period, "MMMM yyyy", new Date(), { locale: fr });
    if (!isValid(parsed)) parsed = parse(s.period, "MMM yyyy", new Date(), { locale: fr });
    if (isValid(parsed)) {
      monthIndex = parsed.getMonth();
    } else {
      monthIndex = MONTH_FALLBACK[s.period.toLowerCase().split(" ")[0].replace(".", "")];
    }

    if (monthIndex !== undefined) {
      monthly[monthIndex].ca += ca;
      monthly[monthIndex].benef += net;
      monthly[monthIndex].reservations += reservations;
      monthlyNights[monthIndex] += s.totals.totalNuits || 0;
    }

    invoiceData.forEach((resa: any) => {
      const portail = (resa.portail || "").toLowerCase();
      if (portail.includes("airbnb")) channelCounts["airbnb"]++;
      else if (portail.includes("booking")) channelCounts["booking"]++;
      else if (portail.includes("abritel")) channelCounts["abritel"]++;
      else if (portail.includes("hello keys")) channelCounts["hello keys"]++;
      else if (portail.includes("proprio")) channelCounts["proprio"]++;
      else channelCounts["autre"]++;
    });
  });

  months.forEach((m, i) => {
    const available = rooms.length * getDaysInMonth(m);
    monthly[i].occupation = available > 0 ? (monthlyNights[i] / available) * 100 : 0;
  });

  const totalAvailable = rooms.length * getDaysInYear(new Date(year, 0, 1));
  const occupancyRate = totalAvailable > 0 ? (totalNights / totalAvailable) * 100 : 0;

  let bestMonth: YearMetrics["bestMonth"] = null;
  monthly.forEach((m) => {
    if (m.benef > 0 && (!bestMonth || m.benef > bestMonth.benef)) {
      bestMonth = { name: m.name, benef: m.benef, ca: m.ca, reservations: m.reservations };
    }
  });

  return {
    totalCA,
    totalNet,
    totalNights,
    totalGuests,
    totalReservations,
    occupancyRate,
    netPricePerNight: totalNights > 0 ? totalNet / totalNights : 0,
    monthly,
    channels: CHANNELS.map((c) => ({ ...c, value: channelCounts[c.name.toLowerCase()] || 0 })),
    bestMonth,
  };
};

const formatEuro = (value: number) =>
  value.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " €";

const computeDelta = (current: number, previous?: number | null): number | null => {
  if (previous === undefined || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
};

// Conteneur bulletproof : le graphique est en position absolue et ne peut
// donc JAMAIS élargir la page ni déborder de sa carte.
const ChartFrame = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <div className={cn("relative w-full overflow-hidden", className)}>
    <div className="absolute inset-0">{children}</div>
  </div>
);

const DeltaBadge = ({ delta }: { delta: number | null }) => {
  if (delta === null) return null;
  const positive = delta >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
        positive
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : "bg-red-500/15 text-red-600 dark:text-red-400",
      )}
    >
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(delta).toFixed(0)}%
    </span>
  );
};

const DashboardPageV3: React.FC = () => {
  const { profile } = useSession();
  const currentYear = new Date().getFullYear();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statements, setStatements] = useState<SavedInvoice[]>([]);
  const [rooms, setRooms] = useState<UserRoom[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [nextArrival, setNextArrival] = useState<KrossbookingReservation | null>(null);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [compareYear, setCompareYear] = useState<number | null>(null);
  const [showReveal, setShowReveal] = useState(false);

  const availableYears = useMemo(() => {
    const years = extractAvailableYears(statements);
    if (years.length === 0) return [currentYear];
    return years;
  }, [statements, currentYear]);

  // Ajuste l'année sélectionnée si elle n'a pas de stats disponibles.
  useEffect(() => {
    if (availableYears.length && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const metrics = useMemo(
    () => (statements.length || rooms.length ? buildYearMetrics(statements, selectedYear, rooms) : null),
    [statements, rooms, selectedYear],
  );
  const compareMetrics = useMemo(
    () => (compareYear !== null ? buildYearMetrics(statements, compareYear, rooms) : null),
    [statements, rooms, compareYear],
  );

  const chartData = useMemo(() => {
    if (!metrics) return [];
    return metrics.monthly.map((m, i) => ({
      ...m,
      ca2: compareMetrics?.monthly[i]?.ca ?? null,
      benef2: compareMetrics?.monthly[i]?.benef ?? null,
      reservations2: compareMetrics?.monthly[i]?.reservations ?? null,
      occupation2: compareMetrics?.monthly[i]?.occupation ?? null,
    }));
  }, [metrics, compareMetrics]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedStatements, fetchedRooms, reviews] = await Promise.all([
        getMyStatements(),
        getUserRooms(),
        getReviews(),
      ]);

      setStatements(fetchedStatements);
      setRooms(fetchedRooms);

      if (reviews && reviews.length > 0) {
        setAverageRating(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length);
      } else {
        setAverageRating(null);
      }

      setLoading(false);

      // Prochaine arrivée (chargée en arrière-plan, non bloquante)
      try {
        const reservations =
          fetchedRooms.length > 0 ? await fetchKrossbookingReservations(fetchedRooms) : [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let candidate: KrossbookingReservation | null = null;
        reservations.forEach((res) => {
          const checkIn = isValid(parseISO(res.check_in_date)) ? parseISO(res.check_in_date) : null;
          if (
            checkIn &&
            (isSameDay(checkIn, today) || isAfter(checkIn, today)) &&
            (!candidate || isBefore(checkIn, parseISO(candidate.check_in_date)))
          ) {
            candidate = res;
          }
        });
        setNextArrival(candidate);
      } catch (err) {
        console.error("[dashboard-v3] Erreur réservations:", err);
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!profile?.is_banned) {
      fetchData();
    }
  }, [fetchData, profile]);

  // Affiche l'animation de révélation une seule fois par utilisateur.
  useEffect(() => {
    if (profile?.is_banned) return;
    if (!localStorage.getItem(REVEAL_STORAGE_KEY)) {
      setShowReveal(true);
    }
  }, [profile]);

  const handleFinishReveal = () => {
    setShowReveal(false);
    localStorage.setItem(REVEAL_STORAGE_KEY, "1");
  };

  if (profile?.is_banned) {
    return (
      <MainLayout>
        <BannedUserMessage />
      </MainLayout>
    );
  }

  const yearLabel = selectedYear === currentYear ? `${currentYear} (en cours)` : String(selectedYear);
  const isComparing = compareYear !== null;

  const kpis = metrics
    ? [
        {
          label: "Chiffre d'affaires",
          value: formatEuro(metrics.totalCA),
          delta: computeDelta(metrics.totalCA, compareMetrics?.totalCA),
          icon: Landmark,
        },
        {
          label: "Résultat net",
          value: formatEuro(metrics.totalNet),
          delta: computeDelta(metrics.totalNet, compareMetrics?.totalNet),
          icon: Wallet,
        },
        {
          label: "Réservations",
          value: String(metrics.totalReservations),
          delta: computeDelta(metrics.totalReservations, compareMetrics?.totalReservations),
          icon: CalendarDays,
        },
        {
          label: "Nuits",
          value: String(metrics.totalNights),
          delta: computeDelta(metrics.totalNights, compareMetrics?.totalNights),
          icon: BedDouble,
        },
        {
          label: "Occupation",
          value: `${metrics.occupancyRate.toFixed(1)} %`,
          delta: computeDelta(metrics.occupancyRate, compareMetrics?.occupancyRate),
          icon: PercentCircle,
        },
        {
          label: "Voyageurs",
          value: String(metrics.totalGuests),
          delta: computeDelta(metrics.totalGuests, compareMetrics?.totalGuests),
          icon: Users,
        },
      ]
    : [];

  return (
    <MainLayout>
      {showReveal && <DashboardV3Reveal onFinish={handleFinishReveal} />}
      <div className="w-full max-w-full overflow-x-hidden break-words">
        <AnnouncementsBanner />
        {/* ── En-tête ─────────────────────────────────────── */}
        <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))] capitalize text-[hsl(var(--sidebar-foreground))]"
              >
                {format(new Date(), "EEEE dd MMMM yyyy", { locale: fr })}
              </Badge>
            </div>
            <h1 className="mt-3 break-words text-2xl font-bold tracking-tight text-[hsl(var(--sidebar-foreground))] sm:text-4xl">
              Bonjour{profile?.first_name ? ` ${profile.first_name}` : ""} 👋
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Vue d'ensemble de votre activité — {yearLabel}
              {isComparing && ` vs ${compareYear}`}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => setShowReveal(true)}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Revoir l'intro
          </Button>
        </div>

        {/* ── Sélecteurs d'année ──────────────────────────── */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm font-medium text-muted-foreground">Année</span>
            <Select
              value={String(selectedYear)}
              onValueChange={(val) => {
                const year = parseInt(val, 10);
                setSelectedYear(year);
                if (compareYear === year) setCompareYear(null);
              }}
            >
              <SelectTrigger className="h-9 w-[150px] rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year === currentYear ? `${year} (en cours)` : year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm font-medium text-muted-foreground">Comparer à</span>
            <Select
              value={compareYear === null ? "none" : String(compareYear)}
              onValueChange={(val) => setCompareYear(val === "none" ? null : parseInt(val, 10))}
            >
              <SelectTrigger className="h-9 w-[150px] rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune</SelectItem>
                {availableYears
                  .filter((year) => year !== selectedYear)
                  .map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {isComparing && (
            <Badge className="rounded-full bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-background))]">
              Comparaison {selectedYear} vs {compareYear}
            </Badge>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertTitle>Erreur de chargement</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ── KPIs ────────────────────────────────────────── */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl sm:h-28" />
              ))
            : kpis.map((kpi) => (
                <div
                  key={kpi.label}
                  className="min-w-0 rounded-2xl border bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-4"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="rounded-lg bg-muted p-1.5 text-[hsl(var(--sidebar-foreground))]">
                      <kpi.icon className="h-4 w-4" />
                    </div>
                    {isComparing && <DeltaBadge delta={kpi.delta} />}
                  </div>
                  <p className="mt-2 truncate text-lg font-bold text-foreground sm:mt-3 sm:text-2xl">
                    {kpi.value}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground sm:text-xs">
                    {kpi.label}
                  </p>
                </div>
              ))}
        </div>

        {/* ── Bento grid principale ──────────────────────── */}
        <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-3">
          {/* Graphique CA / Bénéfice — large */}
          <Card className="min-w-0 shadow-sm xl:col-span-2">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
              <div className="min-w-0">
                <CardTitle className="text-base font-semibold text-[hsl(var(--sidebar-foreground))] sm:text-lg">
                  Revenus mensuels
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Chiffre d'affaires et bénéfice net — {yearLabel}
                  {isComparing && ` vs ${compareYear}`}
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link to="/finances">
                  <span className="hidden sm:inline">Mes finances</span>
                  <span className="sm:hidden">Finances</span>
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <Skeleton className="h-64 w-full sm:h-80" />
              ) : (
                <ChartFrame className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="v3-ca" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CA_COLOR} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={CA_COLOR} stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="v3-benef" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={BENEF_COLOR} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={BENEF_COLOR} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis dataKey="name" className="text-xs" tickLine={false} axisLine={false} />
                      <YAxis className="text-xs" tickLine={false} axisLine={false} tickFormatter={(v) => `${v}€`} />
                      <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v.toFixed(2)}€`} />} />
                      <Area type="monotone" dataKey="ca" name={`CA ${selectedYear}`} stroke={CA_COLOR} strokeWidth={2.5} fill="url(#v3-ca)" animationDuration={1200} />
                      <Area type="monotone" dataKey="benef" name={`Bénéfice ${selectedYear}`} stroke={BENEF_COLOR} strokeWidth={2.5} fill="url(#v3-benef)" animationDuration={1200} />
                      {isComparing && (
                        <Line type="monotone" dataKey="ca2" name={`CA ${compareYear}`} stroke={COMPARE_COLOR} strokeWidth={2} strokeDasharray="5 4" dot={false} animationDuration={1200} />
                      )}
                      {isComparing && (
                        <Line type="monotone" dataKey="benef2" name={`Bénéfice ${compareYear}`} stroke={RES_COLOR} strokeWidth={2} strokeDasharray="5 4" dot={false} animationDuration={1200} />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartFrame>
              )}
            </CardContent>
          </Card>

          {/* Colonne droite : prochaine arrivée + note + prix/nuit */}
          <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[hsl(var(--sidebar-foreground))] via-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white shadow-md">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-2 text-white/80">
                  <CalendarClock className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-medium uppercase tracking-widest">Prochaine arrivée</span>
                </div>
                {loading ? (
                  <Skeleton className="mt-4 h-10 w-2/3 bg-white/20" />
                ) : nextArrival ? (
                  <>
                    <p className="mt-3 text-3xl font-bold">
                      {format(parseISO(nextArrival.check_in_date), "dd MMMM", { locale: fr })}
                    </p>
                    <p className="mt-1 truncate text-sm text-white/80">
                      {nextArrival.guest_name} • {nextArrival.property_name}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-2xl font-bold">Aucune arrivée prévue</p>
                )}
                <Button
                  asChild
                  size="sm"
                  variant="secondary"
                  className="mt-4 rounded-full bg-white/15 text-white hover:bg-white/25"
                >
                  <Link to="/calendar">
                    Voir le calendrier
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <Card className="min-w-0 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-amber-500">
                    <Star className="h-4 w-4 shrink-0 fill-current" />
                    <span className="truncate text-xs font-medium text-muted-foreground">Votre note</span>
                  </div>
                  {loading ? (
                    <Skeleton className="mt-3 h-8 w-16" />
                  ) : (
                    <p className="mt-2 text-2xl font-bold">
                      {averageRating !== null ? `${averageRating.toFixed(1)}/5` : "N/A"}
                    </p>
                  )}
                  <Link to="/reviews" className="mt-1 inline-block text-xs text-primary hover:underline">
                    Voir mes avis
                  </Link>
                </CardContent>
              </Card>
              <Card className="min-w-0 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-[hsl(var(--sidebar-foreground))]">
                    <Wallet className="h-4 w-4 shrink-0" />
                    <span className="truncate text-xs font-medium text-muted-foreground">Prix net / nuit</span>
                  </div>
                  {loading ? (
                    <Skeleton className="mt-3 h-8 w-16" />
                  ) : (
                    <p className="mt-2 text-2xl font-bold">
                      {(metrics?.netPricePerNight ?? 0).toFixed(0)}€
                    </p>
                  )}
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {rooms.length} logement{rooms.length > 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* ── Ligne 2 : réservations / occupation / plateformes / meilleur mois ── */}
        <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:mt-6 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
          <Card className="min-w-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Réservations / mois</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-52 w-full" />
              ) : (
                <ChartFrame className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                      <XAxis dataKey="name" className="text-[10px]" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} className="text-[10px]" tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                      {isComparing && (
                        <Bar dataKey="reservations2" name={`Réservations ${compareYear}`} fill={COMPARE_COLOR} radius={[4, 4, 0, 0]} animationDuration={1200} />
                      )}
                      <Bar dataKey="reservations" name={`Réservations ${selectedYear}`} fill={RES_COLOR} radius={[4, 4, 0, 0]} animationDuration={1200} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartFrame>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Taux d'occupation</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-52 w-full" />
              ) : (
                <ChartFrame className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="v3-occ" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={OCC_COLOR} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={OCC_COLOR} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                      <XAxis dataKey="name" className="text-[10px]" tickLine={false} axisLine={false} />
                      <YAxis unit="%" className="text-[10px]" tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v.toFixed(1)}%`} />} />
                      <Area type="monotone" dataKey="occupation" name={`Occupation ${selectedYear}`} stroke={OCC_COLOR} strokeWidth={2.5} fill="url(#v3-occ)" animationDuration={1200} />
                      {isComparing && (
                        <Line type="monotone" dataKey="occupation2" name={`Occupation ${compareYear}`} stroke={COMPARE_COLOR} strokeWidth={2} strokeDasharray="5 4" dot={false} animationDuration={1200} />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartFrame>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Plateformes</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-52 w-full" />
              ) : (
                <div className="flex h-52 items-center gap-3">
                  <ChartFrame className="h-full w-1/2 min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metrics?.channels ?? []}
                          cx="50%"
                          cy="50%"
                          innerRadius={38}
                          outerRadius={65}
                          paddingAngle={4}
                          dataKey="value"
                          animationDuration={1200}
                        >
                          {(metrics?.channels ?? []).map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartFrame>
                  <div className="flex w-1/2 min-w-0 flex-col gap-1.5 text-xs">
                    {(metrics?.channels ?? [])
                      .filter((c) => c.value > 0)
                      .map((c) => (
                        <div key={c.name} className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                          <span className="truncate">{c.name}</span>
                          <span className="ml-auto shrink-0 font-semibold">{c.value}</span>
                        </div>
                      ))}
                    {(metrics?.channels ?? []).every((c) => c.value === 0) && (
                      <p className="text-muted-foreground">Aucune donnée</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0 border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))]/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-[hsl(var(--sidebar-foreground))]">
                <Trophy className="h-4 w-4 shrink-0 text-[hsl(var(--sidebar-foreground))]" />
                Meilleur mois
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-32 w-full" />
              ) : metrics?.bestMonth ? (
                <div className="space-y-3">
                  <p className="text-3xl font-bold capitalize text-[hsl(var(--sidebar-foreground))]">
                    {metrics.bestMonth.name}
                  </p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Bénéfice net</span>
                      <span className="font-semibold text-[hsl(var(--primary))]">
                        {formatEuro(metrics.bestMonth.benef)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">CA</span>
                      <span className="font-semibold">{formatEuro(metrics.bestMonth.ca)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Réservations</span>
                      <span className="font-semibold">{metrics.bestMonth.reservations}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Aucun mois avec bénéfice positif
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Accès rapides ──────────────────────────────── */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:grid-cols-4">
          {[
            { label: "Calendrier", to: "/calendar", icon: CalendarDays },
            { label: "Réservations", to: "/bookings", icon: BedDouble },
            { label: "Finances", to: "/finances", icon: Wallet },
            { label: "Mes avis", to: "/reviews", icon: Star },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="group flex min-w-0 items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="rounded-xl bg-muted p-2.5 text-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
                <item.icon className="h-4 w-4" />
              </div>
              <span className="truncate text-sm font-medium">{item.label}</span>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default DashboardPageV3;
