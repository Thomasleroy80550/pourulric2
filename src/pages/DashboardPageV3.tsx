"use client";

import React, { useCallback, useEffect, useState } from "react";
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
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  CalendarClock,
  CalendarDays,
  Landmark,
  LayoutDashboard,
  PercentCircle,
  Sparkles,
  Star,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";

import MainLayout from "@/components/MainLayout";
import BannedUserMessage from "@/components/BannedUserMessage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  totalFrais: number;
  totalNights: number;
  totalGuests: number;
  totalReservations: number;
  occupancyRate: number;
  netPricePerNight: number;
  monthly: MonthRow[];
  channels: { name: string; color: string; value: number }[];
  bestMonth: { name: string; benef: number; ca: number; reservations: number } | null;
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
  let totalFrais = 0;
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
    totalFrais += frais;
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
    totalFrais,
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

const VersionSwitcher = () => (
  <div className="inline-flex w-full items-center gap-1 rounded-full border border-border bg-background/80 p-1 backdrop-blur sm:w-auto">
    <Button asChild size="sm" variant="ghost" className="flex-1 rounded-full sm:flex-none">
      <Link to="/">
        <LayoutDashboard className="mr-2 h-4 w-4" />
        <span className="truncate">Dashboard actuel</span>
      </Link>
    </Button>
    <Button size="sm" variant="default" className="pointer-events-none flex-1 rounded-full sm:flex-none">
      <Sparkles className="mr-2 h-4 w-4" />
      <span className="truncate">Proposition V3</span>
    </Button>
  </div>
);

const DashboardPageV3: React.FC = () => {
  const { profile } = useSession();
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<YearMetrics | null>(null);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [nextArrival, setNextArrival] = useState<KrossbookingReservation | null>(null);
  const [roomCount, setRoomCount] = useState(0);

  const yearLabel = selectedYear === currentYear ? `Année en cours (${currentYear})` : String(selectedYear);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statements, rooms, reviews] = await Promise.all([
        getMyStatements(),
        getUserRooms(),
        getReviews(),
      ]);

      setRoomCount(rooms.length);
      setMetrics(buildYearMetrics(statements, selectedYear, rooms));

      if (reviews && reviews.length > 0) {
        setAverageRating(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length);
      } else {
        setAverageRating(null);
      }

      setLoading(false);

      // Prochaine arrivée (chargée en arrière-plan, non bloquante)
      try {
        const reservations =
          rooms.length > 0 ? await fetchKrossbookingReservations(rooms) : [];
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
  }, [selectedYear]);

  useEffect(() => {
    if (!profile?.is_banned) {
      fetchData();
    }
  }, [fetchData, profile]);

  if (profile?.is_banned) {
    return (
      <MainLayout>
        <BannedUserMessage />
      </MainLayout>
    );
  }

  const kpis = metrics
    ? [
        {
          label: "Chiffre d'affaires",
          value: formatEuro(metrics.totalCA),
          icon: Landmark,
          accent: "from-blue-500/15 to-blue-500/5 text-blue-600 dark:text-blue-400",
        },
        {
          label: "Résultat net",
          value: formatEuro(metrics.totalNet),
          icon: Wallet,
          accent: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
        },
        {
          label: "Réservations",
          value: String(metrics.totalReservations),
          icon: CalendarDays,
          accent: "from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400",
        },
        {
          label: "Nuits",
          value: String(metrics.totalNights),
          icon: BedDouble,
          accent: "from-indigo-500/15 to-indigo-500/5 text-indigo-600 dark:text-indigo-400",
        },
        {
          label: "Occupation",
          value: `${metrics.occupancyRate.toFixed(1)} %`,
          icon: PercentCircle,
          accent: "from-teal-500/15 to-teal-500/5 text-teal-600 dark:text-teal-400",
        },
        {
          label: "Voyageurs",
          value: String(metrics.totalGuests),
          icon: Users,
          accent: "from-orange-500/15 to-orange-500/5 text-orange-600 dark:text-orange-400",
        },
      ]
    : [];

  return (
    <MainLayout>
      <div className="w-full max-w-full overflow-x-hidden">
        {/* ── En-tête ─────────────────────────────────────── */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-gradient-to-r from-indigo-600 to-sky-500 text-white hover:from-indigo-600 hover:to-sky-500">
                Proposition V3
              </Badge>
              <Badge variant="outline" className="capitalize">
                {format(new Date(), "EEEE dd MMMM yyyy", { locale: fr })}
              </Badge>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-4xl">
              Bonjour{profile?.first_name ? ` ${profile.first_name}` : ""} 👋
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Vue d'ensemble de votre activité — {yearLabel}
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
            <Tabs
              value={selectedYear === currentYear ? "current" : "2025"}
              onValueChange={(val) => setSelectedYear(val === "current" ? currentYear : 2025)}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid w-full grid-cols-2 rounded-full sm:flex sm:w-auto">
                <TabsTrigger value="2025" className="rounded-full text-xs">
                  2025
                </TabsTrigger>
                <TabsTrigger value="current" className="rounded-full text-xs">
                  {currentYear}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <VersionSwitcher />
          </div>
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
                  className={`rounded-2xl border bg-gradient-to-br p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-4 ${kpi.accent}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-background/50 p-1.5">
                      <kpi.icon className="h-4 w-4" />
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-40" />
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
                <CardTitle className="text-base font-semibold sm:text-lg">Revenus mensuels</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Chiffre d'affaires et bénéfice net — {yearLabel}
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
            <CardContent className="h-64 pt-4 sm:h-80">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics?.monthly ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="v3-ca" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="v3-benef" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis dataKey="name" className="text-xs" tickLine={false} axisLine={false} />
                    <YAxis className="text-xs" tickLine={false} axisLine={false} tickFormatter={(v) => `${v}€`} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v.toFixed(2)}€`} />} />
                    <Area type="monotone" dataKey="ca" name="CA" stroke="#6366f1" strokeWidth={2.5} fill="url(#v3-ca)" animationDuration={1200} />
                    <Area type="monotone" dataKey="benef" name="Bénéfice" stroke="#10b981" strokeWidth={2.5} fill="url(#v3-benef)" animationDuration={1200} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Colonne droite : prochaine arrivée + note + prix/nuit */}
          <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-indigo-600 via-indigo-500 to-sky-500 text-white shadow-md">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-2 text-indigo-100">
                  <CalendarClock className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-widest">Prochaine arrivée</span>
                </div>
                {loading ? (
                  <Skeleton className="mt-4 h-10 w-2/3 bg-white/20" />
                ) : nextArrival ? (
                  <>
                    <p className="mt-3 text-3xl font-bold">
                      {format(parseISO(nextArrival.check_in_date), "dd MMMM", { locale: fr })}
                    </p>
                    <p className="mt-1 truncate text-sm text-indigo-100">
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
              <Card className="shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-amber-500">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="text-xs font-medium text-muted-foreground">Votre note</span>
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
              <Card className="shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-sky-500">
                    <Wallet className="h-4 w-4" />
                    <span className="text-xs font-medium text-muted-foreground">Prix net / nuit</span>
                  </div>
                  {loading ? (
                    <Skeleton className="mt-3 h-8 w-16" />
                  ) : (
                    <p className="mt-2 text-2xl font-bold">
                      {(metrics?.netPricePerNight ?? 0).toFixed(0)}€
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {roomCount} logement{roomCount > 1 ? "s" : ""}
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
            <CardContent className="h-52">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics?.monthly ?? []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <XAxis dataKey="name" className="text-[10px]" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} className="text-[10px]" tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                    <Bar dataKey="reservations" name="Réservations" fill="#8b5cf6" radius={[4, 4, 0, 0]} animationDuration={1200} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Taux d'occupation</CardTitle>
            </CardHeader>
            <CardContent className="h-52">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics?.monthly ?? []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="v3-occ" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <XAxis dataKey="name" className="text-[10px]" tickLine={false} axisLine={false} />
                    <YAxis unit="%" className="text-[10px]" tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v.toFixed(1)}%`} />} />
                    <Area type="monotone" dataKey="occupation" name="Occupation" stroke="#14b8a6" strokeWidth={2.5} fill="url(#v3-occ)" animationDuration={1200} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Plateformes</CardTitle>
            </CardHeader>
            <CardContent className="flex h-52 items-center gap-3">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <>
                  <div className="h-full w-1/2 min-w-0">
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
                  </div>
                  <div className="flex w-1/2 flex-col gap-1.5 text-xs">
                    {(metrics?.channels ?? [])
                      .filter((c) => c.value > 0)
                      .map((c) => (
                        <div key={c.name} className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                          <span className="truncate">{c.name}</span>
                          <span className="ml-auto font-semibold">{c.value}</span>
                        </div>
                      ))}
                    {(metrics?.channels ?? []).every((c) => c.value === 0) && (
                      <p className="text-muted-foreground">Aucune donnée</p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm dark:border-amber-900 dark:from-amber-950/30 dark:to-orange-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Trophy className="h-4 w-4 text-amber-500" />
                Meilleur mois
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-32 w-full" />
              ) : metrics?.bestMonth ? (
                <div className="space-y-3">
                  <p className="text-3xl font-bold capitalize text-amber-600 dark:text-amber-400">
                    {metrics.bestMonth.name}
                  </p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bénéfice net</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatEuro(metrics.bestMonth.benef)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CA</span>
                      <span className="font-semibold">{formatEuro(metrics.bestMonth.ca)}</span>
                    </div>
                    <div className="flex justify-between">
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
              className="group flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="rounded-xl bg-muted p-2.5 text-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
                <item.icon className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">{item.label}</span>
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default DashboardPageV3;
