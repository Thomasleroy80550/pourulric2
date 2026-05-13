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

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'percent',
  maximumFractionDigits: 1,
});

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
  if (raw.includes('ABRITEL') || raw.includes('VRBO')) return 'Abritel / Vrbo';
  if (raw.includes('EXPEDIA')) return 'Expedia';
  if (raw.includes('DIRECT') || raw.includes('HELLOKEYS')) return 'Direct';
  return raw;
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
        setUserRooms(fetchedRooms);

        const fetchedReservations = await fetchKrossbookingReservations(fetchedRooms);
        setReservations(fetchedReservations);
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
    const yearEndForecast = securedRevenue + additionalProjectedRevenue;
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
      color: CHART_COLORS[index % CHART_COLORS.length],
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
      yearEndForecast,
      securedShare,
      averageBookingValue,
      monthlyData,
      otaBreakdown,
      otaTrendBase,
      otaTrendData,
      roomBreakdown,
      topRooms,
      roomTrendData,
    };
  }, [currentYear, nextYearStart, reservations, today, userRooms, yearStart]);

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
        <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-900 p-6 text-white shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.22),transparent_30%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[1.7fr,1fr]">
            <div className="space-y-4">
              <Badge className="w-fit border-white/20 bg-white/10 text-white hover:bg-white/10">Krossbooking • Prévision {currentYear}</Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Prévision de CA premium</h1>
                <p className="max-w-2xl text-sm text-slate-200 md:text-base">
                  Lecture visuelle du chiffre d'affaires basé sur les réservations dont la date de départ est dans l'année en cours, avec zoom OTA et multi-logements.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-slate-200">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Date de départ</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">OTA inclus</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Courbes par logement</span>
              </div>
            </div>

            {!loading && !error && forecastData.reservationCount > 0 && (
              <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <div>
                  <div className="text-xs uppercase tracking-[0.25em] text-cyan-200">Prévision fin d'année</div>
                  <div className="mt-2 text-4xl font-bold">{currencyFormatter.format(forecastData.yearEndForecast)}</div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-200">
                    <span>Part déjà sécurisée</span>
                    <span>{percentFormatter.format(forecastData.securedShare)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-400"
                      style={{ width: `${Math.min(100, Math.max(4, forecastData.securedShare * 100))}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-white/10 bg-black/10 p-3">
                    <div className="text-slate-300">CA sécurisé</div>
                    <div className="mt-1 font-semibold text-white">{currencyFormatter.format(forecastData.securedRevenue)}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/10 p-3">
                    <div className="text-slate-300">Upside estimé</div>
                    <div className="mt-1 font-semibold text-white">{currencyFormatter.format(forecastData.additionalProjectedRevenue)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Méthode de calcul</AlertTitle>
          <AlertDescription>
            Le CA est rattaché à la <strong>date de départ</strong>. Les annulations et les blocs propriétaire sont exclus. La prévision additionnelle repose sur le taux d'occupation observé et le revenu moyen par nuit déjà constaté.
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
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <RevenueStatCard
                title="Prévision fin d'année"
                value={currencyFormatter.format(forecastData.yearEndForecast)}
                description="CA sécurisé + potentiel encore monétisable sur les nuits libres."
                icon={TrendingUp}
                accent="bg-gradient-to-r from-cyan-500 to-blue-600"
              />
              <RevenueStatCard
                title="CA sécurisé"
                value={currencyFormatter.format(forecastData.securedRevenue)}
                description={`${forecastData.reservationCount} réservation(s) déjà dans le pipe.`}
                icon={Wallet}
                accent="bg-gradient-to-r from-emerald-500 to-teal-600"
              />
              <RevenueStatCard
                title="CA à date"
                value={currencyFormatter.format(forecastData.revenueToDate)}
                description="Réservations terminées ou sortant aujourd'hui."
                icon={Euro}
                accent="bg-gradient-to-r from-fuchsia-500 to-purple-600"
              />
              <RevenueStatCard
                title="Panier moyen"
                value={currencyFormatter.format(forecastData.averageBookingValue)}
                description="Montant moyen par réservation à date de départ dans l'année."
                icon={Sparkles}
                accent="bg-gradient-to-r from-amber-500 to-orange-600"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <RevenueStatCard
                title="Taux d'occupation observé"
                value={percentFormatter.format(forecastData.observedOccupancyRate)}
                description="Calculé sur les nuitées écoulées depuis le 1er janvier."
                icon={Percent}
                accent="bg-gradient-to-r from-blue-500 to-indigo-600"
              />
              <RevenueStatCard
                title="ADR observé"
                value={currencyFormatter.format(forecastData.observedAdr)}
                description="Revenu moyen constaté par nuit vendue."
                icon={BarChart3}
                accent="bg-gradient-to-r from-violet-500 to-purple-600"
              />
              <RevenueStatCard
                title="CA restant sécurisé"
                value={currencyFormatter.format(forecastData.futureSecuredRevenue)}
                description="Montant déjà signé sur le reste de l'année."
                icon={CalendarClock}
                accent="bg-gradient-to-r from-cyan-500 to-sky-600"
              />
              <RevenueStatCard
                title="Nuits encore libres"
                value={forecastData.remainingUnbookedNights.toLocaleString('fr-FR')}
                description={`Sur ${forecastData.remainingCapacityNights.toLocaleString('fr-FR')} nuitées restantes.`}
                icon={Home}
                accent="bg-gradient-to-r from-rose-500 to-pink-600"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.8fr,1fr]">
              <Card className="overflow-hidden border-white/60 bg-white/80 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/60">
                <CardHeader>
                  <CardTitle>Trajectoire du CA</CardTitle>
                  <CardDescription>
                    Évolution mensuelle du CA sécurisé et du cumul annuel rattaché aux dates de départ.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forecastData.monthlyData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="caGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k€`} />
                      <Tooltip formatter={(value: number, name: string) => [currencyFormatter.format(value), name === 'ca' ? 'CA mensuel' : 'Cumul']} />
                      <Legend />
                      <Area type="monotone" dataKey="ca" name="CA mensuel" stroke="#2563eb" fill="url(#caGradient)" strokeWidth={2.5} />
                      <Line type="monotone" dataKey="cumulativeRevenue" name="Cumul annuel" stroke="#14b8a6" strokeWidth={3} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-white/60 bg-white/80 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/60">
                <CardHeader>
                  <CardTitle>Mix OTA</CardTitle>
                  <CardDescription>Répartition du CA sécurisé par canal.</CardDescription>
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
                        {forecastData.otaBreakdown.map((entry, index) => (
                          <Cell key={entry.channel} fill={CHART_COLORS[index % CHART_COLORS.length]} />
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
                <TabsTrigger value="ota">OTA</TabsTrigger>
                <TabsTrigger value="logements">Logements</TabsTrigger>
              </TabsList>

              <TabsContent value="ota" className="space-y-6">
                <div className="grid gap-6 xl:grid-cols-[1.4fr,1fr]">
                  <Card className="overflow-hidden border-white/60 bg-white/80 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/60">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><PieChartIcon className="h-4 w-4" />Performance OTA</CardTitle>
                      <CardDescription>CA par canal et dynamique mensuelle.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[360px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={forecastData.otaTrendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="month" />
                          <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k€`} />
                          <Tooltip formatter={(value: number) => currencyFormatter.format(value)} />
                          <Legend />
                          {forecastData.otaTrendBase.map((ota) => (
                            <Bar key={ota.key} dataKey={ota.key} name={ota.channel} fill={ota.color} radius={[6, 6, 0, 0]} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="border-white/60 bg-white/80 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/60">
                    <CardHeader>
                      <CardTitle>Classement OTA</CardTitle>
                      <CardDescription>Canaux qui portent le plus le CA.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {forecastData.otaBreakdown.map((ota, index) => (
                        <div key={ota.channel} className="space-y-2 rounded-2xl border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
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
                              style={{ width: `${Math.max(4, ota.share * 100)}%`, backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
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
                      <CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" />Courbe par logement</CardTitle>
                      <CardDescription>
                        {forecastData.topRooms.length > 1
                          ? 'Comparaison mensuelle du CA sécurisé pour vos logements principaux.'
                          : 'Le graphique apparaîtra dès que plusieurs logements auront du CA sur l\'année.'}
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
                      <CardTitle>Top logements</CardTitle>
                      <CardDescription>Ceux qui contribuent le plus au CA sécurisé.</CardDescription>
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
