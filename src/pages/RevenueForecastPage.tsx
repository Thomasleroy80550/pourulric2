import React, { useEffect, useMemo, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { useSession } from '@/components/SessionContextProvider';
import BannedUserMessage from '@/components/BannedUserMessage';
import SuspendedAccountMessage from '@/components/SuspendedAccountMessage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchKrossbookingReservations, KrossbookingReservation } from '@/lib/krossbooking';
import { getUserRooms, UserRoom } from '@/lib/user-room-api';
import {
  addYears,
  differenceInCalendarDays,
  eachMonthOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  Building2,
  CalendarClock,
  Euro,
  Home,
  Info,
  Percent,
  PieChartIcon,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';

const EXCLUDED_STATUSES = new Set(['PROPRI', 'PROP0']);
const CHART_COLORS = ['#2563eb', '#14b8a6', '#f97316', '#8b5cf6', '#ec4899', '#eab308', '#06b6d4', '#ef4444'];
const OTA_OFFICIAL_COLORS: Record<string, string> = {
  'Airbnb': '#ff0000',
  'Booking.com': '#013b94',
  'Abritel / Vrbo': '#1668e3',
  'Direct': '#255f85',
  'Hello Keys': '#255f85',
  'Autre': '#4b5563',
  'Expedia': '#4b5563',
};

const currencyFormatter = new Intl.NumberFormat('fr-FR', {

  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'percent',
  maximumFractionDigits: 1,
});

const FORECAST_CACHE_KEY = 'revenue_forecast_daily_cache_v1';

interface RevenueForecastCachePayload {
  dayKey: string;
  roomSignature: string;
  userRooms: UserRoom[];
  reservations: KrossbookingReservation[];
}

function getDayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function readForecastCache(dayKey: string, roomSignature: string): RevenueForecastCachePayload | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(FORECAST_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as RevenueForecastCachePayload;
    if (parsed.dayKey !== dayKey || parsed.roomSignature !== roomSignature) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeForecastCache(payload: RevenueForecastCachePayload) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(FORECAST_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
}

function parseAmount(amount: string): number {

  const normalized = (amount || '0').replace(',', '.').replace(/[^\d.-]/g, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getOverlapNights(
  checkInDate: string,
  checkOutDate: string,
  rangeStart: Date,
  rangeEndExclusive: Date
): number {
  const checkIn = parseISO(checkInDate);
  const checkOut = parseISO(checkOutDate);

  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    return 0;
  }

  const overlapStart = checkIn > rangeStart ? checkIn : rangeStart;
  const overlapEnd = checkOut < rangeEndExclusive ? checkOut : rangeEndExclusive;

  return Math.max(0, differenceInCalendarDays(overlapEnd, overlapStart));
}

function isRevenueReservation(reservation: KrossbookingReservation, yearStart: Date, nextYearStart: Date): boolean {
  const status = (reservation.status || '').toUpperCase();
  const checkOut = parseISO(reservation.check_out_date);

  if (Number.isNaN(checkOut.getTime())) {
    return false;
  }

  if (status.includes('CANC') || EXCLUDED_STATUSES.has(status)) {
    return false;
  }

  return checkOut >= yearStart && checkOut < nextYearStart;
}

function normalizeChannel(reservation: KrossbookingReservation): string {
  const raw = (reservation.cod_channel || reservation.channel_identifier || 'DIRECT').toUpperCase();

  if (raw.includes('AIRBNB')) return 'Airbnb';
  if (raw.includes('BOOKING')) return 'Booking.com';
  if (raw.includes('ABRITEL') || raw.includes('VRBO') || raw.includes('HOMEAWAY')) return 'Abritel / Vrbo';
  if (raw.includes('DIRECT') || raw.includes('HELLOKEYS')) return 'Direct';
  if (raw.includes('EXPEDIA')) return 'Autre';
  return 'Autre';
}

function getOtaColor(channel: string): string {
  return OTA_OFFICIAL_COLORS[channel] || OTA_OFFICIAL_COLORS.Autre;
}

function ScenarioTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length || !payload[0]?.payload) {
    return null;
  }

  const point = payload[0].payload;
  const entries = [
    { key: 'prudent', label: 'Prudent', color: '#f59e0b', value: Number(point.prudent || 0) },
    { key: 'central', label: 'Central', color: '#0ea5e9', value: Number(point.central || 0) },
    { key: 'ambitious', label: 'Ambitieux', color: '#10b981', value: Number(point.ambitious || 0) },
  ];

  return (
    <div className="rounded-2xl border border-sky-100 bg-white/95 p-4 shadow-2xl backdrop-blur-sm">
      <div className="mb-3 text-sm font-semibold text-slate-900">{label}</div>
      <div className="space-y-2">
        {entries.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-6 text-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
            </div>
            <span className="font-semibold text-slate-900">{currencyFormatter.format(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevenueStatCard({

  title,
  value,
  description,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <Card className="relative overflow-hidden border-white/60 bg-white/80 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/60">
      <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
          <span>{title}</span>
          <span className={`rounded-full p-2 ${accent} bg-opacity-10 text-white`}>
            <Icon className="h-4 w-4" />
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

const RevenueForecastPage: React.FC = () => {
  const { profile } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRooms, setUserRooms] = useState<UserRoom[]>([]);
  const [reservations, setReservations] = useState<KrossbookingReservation[]>([]);
  const [animatedSecuredShare, setAnimatedSecuredShare] = useState(0);

  const currentYear = new Date().getFullYear();
  const today = startOfDay(new Date());

  const yearStart = startOfYear(new Date(currentYear, 0, 1));
  const nextYearStart = startOfYear(addYears(yearStart, 1));

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const fetchedRooms = await getUserRooms();
        const dayKey = getDayKey(new Date());
        const roomSignature = fetchedRooms
          .map((room) => `${room.id}:${room.room_id}:${room.room_name}`)
          .sort()
          .join('|');

        const cached = readForecastCache(dayKey, roomSignature);
        if (cached) {
          setUserRooms(cached.userRooms);
          setReservations(cached.reservations);
          setLoading(false);
          return;
        }

        setUserRooms(fetchedRooms);

        const fetchedReservations = await fetchKrossbookingReservations(fetchedRooms);
        setReservations(fetchedReservations);

        writeForecastCache({
          dayKey,
          roomSignature,
          userRooms: fetchedRooms,
          reservations: fetchedReservations,
        });
      } catch (err: any) {
        setError(`Erreur lors du chargement des réservations Krossbooking : ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (!profile?.is_banned && !profile?.is_payment_suspended) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [profile]);

  const forecastData = useMemo(() => {
    const revenueReservations = reservations.filter((reservation) =>
      isRevenueReservation(reservation, yearStart, nextYearStart)
    );

    const securedRevenue = revenueReservations.reduce((sum, reservation) => sum + parseAmount(reservation.amount), 0);

    const revenueToDate = revenueReservations.reduce((sum, reservation) => {
      const checkOut = parseISO(reservation.check_out_date);
      return checkOut <= today ? sum + parseAmount(reservation.amount) : sum;
    }, 0);

    const futureSecuredRevenue = Math.max(0, securedRevenue - revenueToDate);

    const bookedPastNights = revenueReservations.reduce(
      (sum, reservation) => sum + getOverlapNights(reservation.check_in_date, reservation.check_out_date, yearStart, today),
      0
    );

    const futureBookedNights = revenueReservations.reduce(
      (sum, reservation) => sum + getOverlapNights(reservation.check_in_date, reservation.check_out_date, today, nextYearStart),
      0
    );

    const elapsedCapacityNights = userRooms.length > 0 ? userRooms.length * Math.max(0, differenceInCalendarDays(today, yearStart)) : 0;
    const remainingCapacityNights = userRooms.length > 0 ? userRooms.length * Math.max(0, differenceInCalendarDays(nextYearStart, today)) : 0;

    const observedOccupancyRate = elapsedCapacityNights > 0 ? Math.min(1, bookedPastNights / elapsedCapacityNights) : 0;
    const observedAdr = bookedPastNights > 0 ? revenueToDate / bookedPastNights : 0;
    const remainingUnbookedNights = Math.max(0, remainingCapacityNights - futureBookedNights);
    const additionalProjectedRevenue = remainingUnbookedNights * observedOccupancyRate * observedAdr;
    const prudentForecast = securedRevenue + additionalProjectedRevenue * 0.7;
    const yearEndForecast = securedRevenue + additionalProjectedRevenue;
    const ambitiousForecast = securedRevenue + additionalProjectedRevenue * 1.2;
    const securedShare = yearEndForecast > 0 ? securedRevenue / yearEndForecast : 0;

    const months = eachMonthOfInterval({

      start: yearStart,
      end: endOfMonth(new Date(currentYear, 11, 1)),
    });

    let cumulativeRevenue = 0;
    const monthlyData = months.map((monthDate) => {
      const monthIndex = monthDate.getMonth();
      const reservationsForMonth = revenueReservations.filter((reservation) => {
        const checkOut = parseISO(reservation.check_out_date);
        return !Number.isNaN(checkOut.getTime()) && checkOut.getMonth() === monthIndex;
      });

      const ca = reservationsForMonth.reduce((sum, reservation) => sum + parseAmount(reservation.amount), 0);
      const reservationsCount = reservationsForMonth.length;
      cumulativeRevenue += ca;

      return {
        month: format(monthDate, 'MMM', { locale: fr }),
        ca,
        reservations: reservationsCount,
        cumulativeRevenue,
      };
    });

    const scenarioProjectionData = [
      {
        month: "Aujourd'hui",
        prudent: revenueToDate,
        central: revenueToDate,
        ambitious: revenueToDate,
        scenarioBandBase: revenueToDate,
        scenarioBandRange: 0,
      },
    ];

    let prudentCumulative = revenueToDate;
    let centralCumulative = revenueToDate;
    let ambitiousCumulative = revenueToDate;

    months
      .filter((monthDate) => monthDate >= startOfMonth(today))
      .forEach((monthDate, index, remainingMonths) => {
        const monthIndex = monthDate.getMonth();
        const rangeStart = monthIndex === today.getMonth() ? today : startOfMonth(monthDate);
        const nextMonthStart = index === remainingMonths.length - 1 ? nextYearStart : startOfMonth(remainingMonths[index + 1]);

        const monthFutureSecuredRevenue = revenueReservations.reduce((sum, reservation) => {
          const checkOut = parseISO(reservation.check_out_date);
          if (Number.isNaN(checkOut.getTime()) || checkOut <= today || checkOut.getMonth() !== monthIndex) {
            return sum;
          }
          return sum + parseAmount(reservation.amount);
        }, 0);

        const monthCapacityNights = userRooms.length > 0 ? userRooms.length * Math.max(0, differenceInCalendarDays(nextMonthStart, rangeStart)) : 0;
        const monthFutureBookedNights = revenueReservations.reduce(
          (sum, reservation) => sum + getOverlapNights(reservation.check_in_date, reservation.check_out_date, rangeStart, nextMonthStart),
          0
        );
        const monthRemainingUnbookedNights = Math.max(0, monthCapacityNights - monthFutureBookedNights);
        const monthAdditionalProjectedRevenue = monthRemainingUnbookedNights * observedOccupancyRate * observedAdr;

        prudentCumulative += monthFutureSecuredRevenue + monthAdditionalProjectedRevenue * 0.7;
        centralCumulative += monthFutureSecuredRevenue + monthAdditionalProjectedRevenue;
        ambitiousCumulative += monthFutureSecuredRevenue + monthAdditionalProjectedRevenue * 1.2;

        scenarioProjectionData.push({
          month: format(monthDate, 'MMM', { locale: fr }),
          prudent: prudentCumulative,
          central: centralCumulative,
          ambitious: ambitiousCumulative,
          scenarioBandBase: prudentCumulative,
          scenarioBandRange: Math.max(0, ambitiousCumulative - prudentCumulative),
        });
      });

    const otaMap = new Map<string, { channel: string; revenue: number; reservations: number }>();

    revenueReservations.forEach((reservation) => {
      const channel = normalizeChannel(reservation);
      const current = otaMap.get(channel) || { channel, revenue: 0, reservations: 0 };
      current.revenue += parseAmount(reservation.amount);
      current.reservations += 1;
      otaMap.set(channel, current);
    });

    const otaBreakdown = Array.from(otaMap.values())
      .map((item) => ({
        ...item,
        color: getOtaColor(item.channel),
        share: securedRevenue > 0 ? item.revenue / securedRevenue : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const roomBase = userRooms.map((room) => ({
      roomId: room.room_id,
      roomName: room.room_name,
      reservations: 0,
      securedRevenue: 0,
      monthlyRevenue: Array.from({ length: 12 }, () => 0),
    }));

    const roomMap = new Map(roomBase.map((room) => [room.roomId, room]));
    revenueReservations.forEach((reservation) => {
      const room = roomMap.get(reservation.krossbooking_room_id);
      if (!room) return;
      const amount = parseAmount(reservation.amount);
      const month = parseISO(reservation.check_out_date).getMonth();
      room.reservations += 1;
      room.securedRevenue += amount;
      room.monthlyRevenue[month] += amount;
    });

    const roomBreakdown = Array.from(roomMap.values())
      .filter((room) => room.reservations > 0 || room.securedRevenue > 0)
      .sort((a, b) => b.securedRevenue - a.securedRevenue);

    const topRooms = roomBreakdown.slice(0, 6).map((room, index) => ({
      ...room,
      key: `room_${index}`,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));

    const roomTrendData = months.map((monthDate, monthIndex) => {
      const row: Record<string, string | number> = {
        month: format(monthDate, 'MMM', { locale: fr }),
      };

      topRooms.forEach((room) => {
        row[room.key] = room.monthlyRevenue[monthIndex];
      });

      return row;
    });

    const otaTrendBase = otaBreakdown.slice(0, 5).map((ota, index) => ({
      ...ota,
      key: `ota_${index}`,
      color: ota.color,
    }));

    const otaTrendData = months.map((monthDate, monthIndex) => {
      const row: Record<string, string | number> = {
        month: format(monthDate, 'MMM', { locale: fr }),
      };

      otaTrendBase.forEach((ota) => {
        row[ota.key] = revenueReservations
          .filter((reservation) => normalizeChannel(reservation) === ota.channel)
          .filter((reservation) => parseISO(reservation.check_out_date).getMonth() === monthIndex)
          .reduce((sum, reservation) => sum + parseAmount(reservation.amount), 0);
      });

      return row;
    });

    const averageBookingValue = revenueReservations.length > 0 ? securedRevenue / revenueReservations.length : 0;

    return {
      reservationCount: revenueReservations.length,
      securedRevenue,
      revenueToDate,
      futureSecuredRevenue,
      bookedPastNights,
      futureBookedNights,
      elapsedCapacityNights,
      remainingCapacityNights,
      remainingUnbookedNights,
      observedOccupancyRate,
      observedAdr,
      additionalProjectedRevenue,
      prudentForecast,
      yearEndForecast,
      ambitiousForecast,
      securedShare,
      averageBookingValue,
      monthlyData,
      scenarioProjectionData,
      otaBreakdown,
      otaTrendBase,
      otaTrendData,
      roomBreakdown,
      topRooms,
      roomTrendData,
    };

  }, [currentYear, nextYearStart, reservations, today, userRooms, yearStart]);

  const clientHighlights = useMemo(() => {
    const topChannel = forecastData.otaBreakdown[0];
    const topRoom = forecastData.roomBreakdown[0];
    const bestMonth = [...forecastData.monthlyData].sort((a, b) => b.ca - a.ca)[0];

    return {
      headline:
        forecastData.yearEndForecast > 0
          ? `Si le rythme actuel continue, vous pouvez viser environ ${currencyFormatter.format(forecastData.yearEndForecast)} de chiffre d'affaires sur ${currentYear}.`
          : `Aucune estimation fiable n'est encore disponible pour ${currentYear}.`,
      secured:
        forecastData.securedRevenue > 0
          ? `${percentFormatter.format(forecastData.securedShare)} de cette estimation est déjà réservé, soit ${currencyFormatter.format(forecastData.securedRevenue)}.`
          : 'Aucun chiffre d\'affaires sécurisé pour le moment.',
      remaining:
        forecastData.remainingUnbookedNights > 0
          ? `Il reste ${forecastData.remainingUnbookedNights.toLocaleString('fr-FR')} nuitées à vendre sur ${forecastData.remainingCapacityNights.toLocaleString('fr-FR')} nuitées restantes.`
          : 'Tout le stock restant est déjà vendu pour cette année.',
      topDriver: topChannel
        ? `${topChannel.channel} apporte actuellement la plus grosse part du chiffre d'affaires avec ${currencyFormatter.format(topChannel.revenue)}.`
        : 'Aucun canal de vente dominant à afficher pour le moment.',
      topRoom: topRoom
        ? `${topRoom.roomName} est le logement le plus contributeur avec ${currencyFormatter.format(topRoom.securedRevenue)} sécurisés.`
        : 'Aucun logement dominant à afficher pour le moment.',
      bestMonth: bestMonth && bestMonth.ca > 0
        ? `${bestMonth.month} est pour l'instant le meilleur mois avec ${currencyFormatter.format(bestMonth.ca)} de chiffre d'affaires.`
        : 'Aucun mois fort ne se dégage encore dans les données.',
    };
  }, [currentYear, forecastData]);

  const scenarioChartBounds = useMemo(() => {
    const values = forecastData.scenarioProjectionData.flatMap((point) => [point.prudent, point.central, point.ambitious]);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const padding = Math.max((maxValue - minValue) * 0.2, maxValue * 0.05, 1000);

    return {
      min: Math.max(0, minValue - padding),
      max: maxValue + padding,
    };
  }, [forecastData.scenarioProjectionData]);

  useEffect(() => {

    if (loading || error || forecastData.reservationCount === 0) {
      setAnimatedSecuredShare(0);
      return;
    }

    const targetWidth = Math.min(100, Math.max(4, forecastData.securedShare * 100));
    setAnimatedSecuredShare(0);

    const timer = window.setTimeout(() => {
      setAnimatedSecuredShare(targetWidth);
    }, 150);

    return () => window.clearTimeout(timer);
  }, [error, forecastData.reservationCount, forecastData.securedShare, loading]);

  if (profile?.is_banned) {

    return (
      <MainLayout>
        <BannedUserMessage />
      </MainLayout>
    );
  }

  if (profile?.is_payment_suspended) {
    return (
      <MainLayout>
        <SuspendedAccountMessage />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto space-y-6 py-6">
        <section className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-blue-100 p-6 text-slate-900 shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.28),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(191,219,254,0.35),transparent_35%)]" />
          <div className="relative space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="w-fit border-sky-200 bg-white/80 text-sky-800 hover:bg-white/80">Prévision {currentYear}</Badge>
              <span className="rounded-full border border-sky-200 bg-white/70 px-3 py-1 text-sm text-slate-700">Vue simplifiée</span>
              <span className="rounded-full border border-sky-200 bg-white/70 px-3 py-1 text-sm text-slate-700">Canaux de vente inclus</span>
              <span className="rounded-full border border-sky-200 bg-white/70 px-3 py-1 text-sm text-slate-700">Détail par logement</span>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr] lg:items-start">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Prévisions de chiffre d'affaires</h1>
                  <p className="max-w-2xl text-sm text-slate-600 md:text-base">
                    Cette page vous aide à voir rapidement où vous en êtes : ce qui est déjà réservé, ce qui est déjà réalisé et ce que vous pouvez encore viser d'ici la fin de l'année.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur-sm">
                    <div className="text-xs uppercase tracking-[0.2em] text-sky-700">Déjà réservé</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">{currencyFormatter.format(forecastData.securedRevenue)}</div>
                    <p className="mt-1 text-sm text-slate-600">Le montant déjà confirmé par les réservations existantes.</p>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur-sm">
                    <div className="text-xs uppercase tracking-[0.2em] text-sky-700">Déjà réalisé</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">{currencyFormatter.format(forecastData.revenueToDate)}</div>
                    <p className="mt-1 text-sm text-slate-600">Le montant lié aux séjours déjà terminés.</p>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur-sm">
                    <div className="text-xs uppercase tracking-[0.2em] text-sky-700">Encore à aller chercher</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">{currencyFormatter.format(forecastData.additionalProjectedRevenue)}</div>
                    <p className="mt-1 text-sm text-slate-600">Le potentiel restant pour atteindre l'estimation.</p>
                  </div>
                </div>
              </div>

              {!loading && !error && forecastData.reservationCount > 0 && (
                <div className="grid gap-4 rounded-2xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur-sm">
                  <div>
                    <div className="text-xs uppercase tracking-[0.25em] text-sky-700">Estimation de fin d'année</div>
                    <div className="mt-2 text-4xl font-bold text-slate-900">{currencyFormatter.format(forecastData.yearEndForecast)}</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Si l'année continue sur le même rythme, votre chiffre d'affaires total pourrait atteindre ce montant d'ici le 31 décembre.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/90 p-4 text-sm text-slate-700">
                    <div className="font-medium text-slate-900">Lecture simple</div>
                    <p className="mt-2 leading-6 text-slate-600">
                      Une partie de cette estimation est déjà dans la poche grâce aux réservations enregistrées. Le reste correspond au potentiel encore à vendre.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>Part déjà sécurisée</span>
                      <span className="font-medium text-slate-900">{percentFormatter.format(forecastData.securedShare)}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-sky-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-emerald-400 transition-all duration-1000 ease-out"
                        style={{ width: `${animatedSecuredShare}%` }}
                      />
                    </div>
                    <p className="text-xs leading-5 text-slate-500">
                      Plus la barre est remplie, plus votre estimation est déjà couverte par des réservations existantes.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Comment lire cette page</AlertTitle>
          <AlertDescription>
            Les chiffres sont calculés à partir des réservations dont la <strong>date de départ</strong> tombe sur l'année en cours. Les annulations et les séjours propriétaire sont retirés. La partie <strong>estimation</strong> projette ce qui pourrait encore être vendu en se basant sur votre rythme actuel. Les données sont conservées en cache <strong>sur la journée</strong> pour éviter des chargements trop fréquents.
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-36 w-full rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-[360px] w-full rounded-3xl" />
            <Skeleton className="h-[420px] w-full rounded-3xl" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : userRooms.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Aucun logement configuré</CardTitle>
              <CardDescription>Ajoutez d'abord vos logements pour calculer une prévision de chiffre d'affaires.</CardDescription>
            </CardHeader>
          </Card>
        ) : forecastData.reservationCount === 0 ? (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Aucune réservation exploitable</CardTitle>
              <CardDescription>
                Aucune réservation générant du CA n'a été trouvée pour {currentYear} avec une date de départ dans l'année en cours.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-[1.4fr,1fr]">
              <Card className="border-white/60 bg-white/85 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/60">
                <CardHeader>
                  <CardTitle>En résumé</CardTitle>
                  <CardDescription>Une lecture rapide pensée pour être comprise en quelques secondes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 dark:bg-slate-900/70">
                    <p className="font-semibold text-foreground">{clientHighlights.headline}</p>
                    <p className="mt-2 text-muted-foreground">{clientHighlights.secured}</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border bg-background/80 p-4">
                      <div className="text-sm font-medium">Ce qui reste à vendre</div>
                      <p className="mt-2 text-sm text-muted-foreground">{clientHighlights.remaining}</p>
                    </div>
                    <div className="rounded-2xl border bg-background/80 p-4">
                      <div className="text-sm font-medium">Canal principal</div>
                      <p className="mt-2 text-sm text-muted-foreground">{clientHighlights.topDriver}</p>
                    </div>
                    <div className="rounded-2xl border bg-background/80 p-4">
                      <div className="text-sm font-medium">Logement moteur</div>
                      <p className="mt-2 text-sm text-muted-foreground">{clientHighlights.topRoom}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/60 bg-white/85 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/60">
                <CardHeader>
                  <CardTitle>Glossaire rapide</CardTitle>
                  <CardDescription>Les 4 notions les plus importantes de la page.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">Estimation de fin d'année :</span> le total visé si votre rythme actuel continue.
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Montant déjà réservé :</span> ce qui est déjà signé sur les réservations existantes.
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Déjà réalisé :</span> le chiffre d'affaires lié aux séjours déjà terminés.
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Nuits encore à vendre :</span> les nuitées restantes qui peuvent encore générer du chiffre d'affaires.
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/70">
                    <span className="font-medium text-foreground">Point à retenir :</span> {clientHighlights.bestMonth}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-white/60 bg-white/85 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/60">
              <CardHeader>
                <CardTitle>Scénarios de fin d'année</CardTitle>
                <CardDescription>Des courbes pour visualiser la trajectoire possible jusqu'à décembre selon trois niveaux de prudence.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-slate-700">
                  <span className="font-medium text-slate-900">Légende :</span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1">
                    <span className="h-3 w-3 rounded-full bg-amber-500" />
                    Prudent
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1">
                    <span className="h-3 w-3 rounded-full bg-sky-500" />
                    Central
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1">
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                    Ambitieux
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1">
                    <span className="h-3 w-8 rounded-full bg-gradient-to-r from-sky-300/70 to-emerald-300/60" />
                    Zone de projection
                  </span>
                </div>
                <div className="h-[400px] rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/70 to-emerald-50/50 p-4 md:p-5">

                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forecastData.scenarioProjectionData} margin={{ top: 10, right: 24, left: 8, bottom: 10 }}>
                      <defs>
                        <linearGradient id="scenarioCentralStroke" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#38bdf8" />
                          <stop offset="100%" stopColor="#2563eb" />
                        </linearGradient>
                        <linearGradient id="scenarioRangeFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.18} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                        </linearGradient>
                        <filter id="scenarioGlowAmber" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                        <filter id="scenarioGlowBlue" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="7" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                        <filter id="scenarioGlowGreen" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.35} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis
                        domain={[scenarioChartBounds.min, scenarioChartBounds.max]}
                        tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k€`}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                      />
                      <Tooltip content={<ScenarioTooltip />} />

                      <Area type="natural" dataKey="scenarioBandBase" stackId="scenario-range" stroke="none" fill="transparent" isAnimationActive={false} />
                      <Area type="natural" dataKey="scenarioBandRange" stackId="scenario-range" stroke="none" fill="url(#scenarioRangeFill)" fillOpacity={1} isAnimationActive={false} />

                      <Line type="natural" dataKey="prudent" stroke="#f59e0b" strokeWidth={10} opacity={0.12} dot={false} activeDot={false} legendType="none" filter="url(#scenarioGlowAmber)" />
                      <Line type="natural" dataKey="central" stroke="#38bdf8" strokeWidth={12} opacity={0.14} dot={false} activeDot={false} legendType="none" filter="url(#scenarioGlowBlue)" />
                      <Line type="natural" dataKey="ambitious" stroke="#10b981" strokeWidth={10} opacity={0.12} dot={false} activeDot={false} legendType="none" filter="url(#scenarioGlowGreen)" />

                      <Line
                        type="natural"
                        dataKey="prudent"
                        name="Prudent"
                        stroke="#f59e0b"
                        strokeWidth={2.5}
                        strokeDasharray="4 8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        dot={false}
                        legendType="none"
                        activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                      />
                      <Line
                        type="natural"
                        dataKey="central"
                        name="Central"
                        stroke="url(#scenarioCentralStroke)"
                        strokeWidth={4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        dot={false}
                        legendType="none"
                        activeDot={{ r: 7, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2.5 }}
                      />
                      <Line
                        type="natural"
                        dataKey="ambitious"
                        name="Ambitieux"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        strokeDasharray="4 8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        dot={false}
                        legendType="none"
                        activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>

                </div>

                <div className="grid gap-3 md:grid-cols-3">

                  <div className="rounded-2xl border bg-background/80 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span className="h-3 w-3 rounded-full bg-amber-500" />
                      Prudent
                    </div>
                    <div className="mt-2 text-2xl font-bold text-foreground">{currencyFormatter.format(forecastData.prudentForecast)}</div>
                    <p className="mt-2 text-sm text-muted-foreground">Scénario plus prudent pour la fin d'année.</p>
                  </div>
                  <div className="rounded-2xl border bg-background/80 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span className="h-3 w-3 rounded-full bg-sky-500" />
                      Central
                    </div>
                    <div className="mt-2 text-2xl font-bold text-foreground">{currencyFormatter.format(forecastData.yearEndForecast)}</div>
                    <p className="mt-2 text-sm text-muted-foreground">Le scénario principal, basé sur la dynamique observée.</p>
                  </div>
                  <div className="rounded-2xl border bg-background/80 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span className="h-3 w-3 rounded-full bg-emerald-500" />
                      Ambitieux
                    </div>
                    <div className="mt-2 text-2xl font-bold text-foreground">{currencyFormatter.format(forecastData.ambitiousForecast)}</div>
                    <p className="mt-2 text-sm text-muted-foreground">Scénario plus offensif si la fin d'année accélère.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <RevenueStatCard
                title="Estimation de fin d'année"
                value={currencyFormatter.format(forecastData.yearEndForecast)}
                description="Le total que vous pouvez viser si la dynamique actuelle continue."
                icon={TrendingUp}
                accent="bg-gradient-to-r from-cyan-500 to-blue-600"
              />

              <RevenueStatCard
                title="Montant déjà réservé"
                value={currencyFormatter.format(forecastData.securedRevenue)}
                description={`${forecastData.reservationCount} réservation(s) sont déjà enregistrées.`}
                icon={Wallet}
                accent="bg-gradient-to-r from-emerald-500 to-teal-600"
              />
              <RevenueStatCard
                title="Déjà réalisé"
                value={currencyFormatter.format(forecastData.revenueToDate)}
                description="Correspond aux séjours déjà terminés ou se terminant aujourd'hui."
                icon={Euro}
                accent="bg-gradient-to-r from-fuchsia-500 to-purple-600"
              />
              <RevenueStatCard
                title="Montant moyen par réservation"
                value={currencyFormatter.format(forecastData.averageBookingValue)}
                description="C'est le revenu moyen généré par chaque réservation comptée cette année."
                icon={Sparkles}
                accent="bg-gradient-to-r from-amber-500 to-orange-600"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <RevenueStatCard
                title="Remplissage constaté"
                value={percentFormatter.format(forecastData.observedOccupancyRate)}
                description="Part des nuits déjà occupées depuis le 1er janvier."
                icon={Percent}
                accent="bg-gradient-to-r from-blue-500 to-indigo-600"
              />
              <RevenueStatCard
                title="Revenu moyen par nuit vendue"
                value={currencyFormatter.format(forecastData.observedAdr)}
                description="Prix moyen observé pour chaque nuit effectivement vendue."
                icon={BarChart3}
                accent="bg-gradient-to-r from-violet-500 to-purple-600"
              />
              <RevenueStatCard
                title="Déjà réservé sur la suite de l'année"
                value={currencyFormatter.format(forecastData.futureSecuredRevenue)}
                description="Montant déjà signé pour les séjours à venir."
                icon={CalendarClock}
                accent="bg-gradient-to-r from-cyan-500 to-sky-600"
              />
              <RevenueStatCard
                title="Nuits encore à vendre"
                value={forecastData.remainingUnbookedNights.toLocaleString('fr-FR')}
                description={`Sur ${forecastData.remainingCapacityNights.toLocaleString('fr-FR')} nuitées restantes au total.`}
                icon={Home}
                accent="bg-gradient-to-r from-rose-500 to-pink-600"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.8fr,1fr]">
              <Card className="overflow-hidden border-white/60 bg-white/80 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/60">
                <CardHeader>
                  <CardTitle>Évolution mois par mois</CardTitle>
                  <CardDescription>
                    En bleu, le chiffre d'affaires du mois. En vert, le cumul depuis le début de l'année.
                  </CardDescription>
                </CardHeader>

                <CardContent className="h-[380px] rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forecastData.monthlyData} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
                      <defs>
                        <linearGradient id="caGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity={0.32} />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k€`} tickLine={false} axisLine={false} tickMargin={10} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number, name: string) => [currencyFormatter.format(value), name === 'ca' ? 'CA mensuel' : 'Cumul annuel']}
                        contentStyle={{
                          borderRadius: '14px',
                          border: '1px solid #dbeafe',
                          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
                          background: 'rgba(255,255,255,0.98)',
                        }}
                      />
                      <Legend verticalAlign="top" align="left" height={30} iconType="circle" wrapperStyle={{ fontSize: '13px' }} />
                      <Area
                        type="monotone"
                        dataKey="ca"
                        name="CA mensuel"
                        stroke="#2563eb"
                        fill="url(#caGradient)"
                        strokeWidth={2.5}
                        activeDot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="cumulativeRevenue"
                        name="Cumul annuel"
                        stroke="#0f766e"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 5, fill: '#0f766e', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>

              </Card>

              <Card className="overflow-hidden border-white/60 bg-white/80 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/60">
                <CardHeader>
                  <CardTitle>D'où vient le chiffre d'affaires</CardTitle>
                  <CardDescription>Chaque part représente le poids d'un canal de vente dans le montant déjà réservé.</CardDescription>
                </CardHeader>

                <CardContent className="h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={forecastData.otaBreakdown}
                        dataKey="revenue"
                        nameKey="channel"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={3}
                      >
                        {forecastData.otaBreakdown.map((entry) => (
                          <Cell key={entry.channel} fill={entry.color} />
                        ))}

                      </Pie>
                      <Tooltip formatter={(value: number) => currencyFormatter.format(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="ota" className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="ota">Canaux de vente</TabsTrigger>
                <TabsTrigger value="logements">Par logement</TabsTrigger>
              </TabsList>

              <TabsContent value="ota" className="space-y-6">
                <div className="grid gap-6 xl:grid-cols-[1.4fr,1fr]">
                  <Card className="overflow-hidden border-white/60 bg-white/80 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/60">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><PieChartIcon className="h-4 w-4" />Canaux de vente mois par mois</CardTitle>
                      <CardDescription>Compare visuellement le chiffre d'affaires apporté par chaque canal selon les mois.</CardDescription>
                    </CardHeader>

                    <CardContent className="h-[380px] rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={forecastData.otaTrendData} margin={{ top: 12, right: 16, left: 0, bottom: 4 }} barGap={8} barCategoryGap="24%">
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} tick={{ fill: '#64748b', fontSize: 12 }} />
                          <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k€`} tickLine={false} axisLine={false} tickMargin={10} tick={{ fill: '#64748b', fontSize: 12 }} />
                          <Tooltip
                            formatter={(value: number) => currencyFormatter.format(value)}
                            contentStyle={{
                              borderRadius: '14px',
                              border: '1px solid #e0e7ff',
                              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
                              background: 'rgba(255,255,255,0.98)',
                            }}
                          />
                          <Legend verticalAlign="top" align="left" height={30} iconType="circle" wrapperStyle={{ fontSize: '13px' }} />
                          {forecastData.otaTrendBase.map((ota) => (
                            <Bar key={ota.key} dataKey={ota.key} name={ota.channel} fill={ota.color} radius={[8, 8, 0, 0]} maxBarSize={26} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>

                  </Card>

                  <Card className="border-white/60 bg-white/80 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/60">
                    <CardHeader>
                      <CardTitle>Canaux qui rapportent le plus</CardTitle>
                      <CardDescription>Classement simple des canaux qui apportent le plus de montant déjà réservé.</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {forecastData.otaBreakdown.map((ota) => (
                        <div key={ota.channel} className="space-y-2 rounded-2xl border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: ota.color }} />
                              <div>
                                <div className="font-medium">{ota.channel}</div>
                                <div className="text-sm text-muted-foreground">{ota.reservations} réservation(s)</div>
                              </div>
                            </div>
                            <div className="text-right font-semibold">{currencyFormatter.format(ota.revenue)}</div>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.max(4, ota.share * 100)}%`, backgroundColor: ota.color }}
                            />
                          </div>
                          <div className="text-right text-xs text-muted-foreground">{percentFormatter.format(ota.share)} du CA sécurisé</div>
                        </div>
                      ))}

                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="logements" className="space-y-6">
                <div className="grid gap-6 xl:grid-cols-[1.5fr,1fr]">
                  <Card className="overflow-hidden border-white/60 bg-white/80 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/60">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" />Vos logements mois par mois</CardTitle>
                      <CardDescription>
                        {forecastData.topRooms.length > 1
                          ? 'Permet de voir quels logements génèrent le plus de chiffre d\'affaires selon les mois.'
                          : 'Le graphique apparaîtra dès que plusieurs logements auront du chiffre d\'affaires sur l\'année.'}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="h-[360px]">
                      {forecastData.topRooms.length > 1 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={forecastData.roomTrendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" />
                            <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k€`} />
                            <Tooltip formatter={(value: number) => currencyFormatter.format(value)} />
                            <Legend />
                            {forecastData.topRooms.map((room) => (
                              <Line key={room.key} type="monotone" dataKey={room.key} name={room.roomName} stroke={room.color} strokeWidth={3} dot={false} />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
                          Pas assez de logements avec du CA pour afficher une comparaison multi-logements.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-white/60 bg-white/80 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/60">
                    <CardHeader>
                      <CardTitle>Logements qui rapportent le plus</CardTitle>
                      <CardDescription>Lecture simple du montant déjà réservé par logement.</CardDescription>
                    </CardHeader>

                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Logement</TableHead>
                            <TableHead className="text-right">Réservations</TableHead>
                            <TableHead className="text-right">CA</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {forecastData.roomBreakdown.map((room) => (
                            <TableRow key={room.roomId}>
                              <TableCell className="font-medium">{room.roomName}</TableCell>
                              <TableCell className="text-right">{room.reservations}</TableCell>
                              <TableCell className="text-right">{currencyFormatter.format(room.securedRevenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default RevenueForecastPage;
