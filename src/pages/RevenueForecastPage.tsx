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
  BarChart3,
  CalendarClock,
  Euro,
  Home,
  Info,
  Percent,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const EXCLUDED_STATUSES = new Set(['CANC', 'PROPRI', 'PROP0']);

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

function RevenueStatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
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
    const revenueReservations = reservations.filter((reservation) => {
      if (EXCLUDED_STATUSES.has(reservation.status)) {
        return false;
      }

      const checkIn = parseISO(reservation.check_in_date);
      return !Number.isNaN(checkIn.getTime()) && checkIn.getFullYear() === currentYear;
    });

    const securedRevenue = revenueReservations.reduce(
      (sum, reservation) => sum + parseAmount(reservation.amount),
      0
    );

    const revenueToDate = revenueReservations.reduce((sum, reservation) => {
      const checkIn = parseISO(reservation.check_in_date);
      return checkIn <= today ? sum + parseAmount(reservation.amount) : sum;
    }, 0);

    const futureSecuredRevenue = Math.max(0, securedRevenue - revenueToDate);

    const bookedPastNights = revenueReservations.reduce(
      (sum, reservation) =>
        sum + getOverlapNights(reservation.check_in_date, reservation.check_out_date, yearStart, today),
      0
    );

    const futureBookedNights = revenueReservations.reduce(
      (sum, reservation) =>
        sum + getOverlapNights(reservation.check_in_date, reservation.check_out_date, today, nextYearStart),
      0
    );

    const elapsedCapacityNights =
      userRooms.length > 0 ? userRooms.length * Math.max(0, differenceInCalendarDays(today, yearStart)) : 0;
    const remainingCapacityNights =
      userRooms.length > 0 ? userRooms.length * Math.max(0, differenceInCalendarDays(nextYearStart, today)) : 0;

    const observedOccupancyRate =
      elapsedCapacityNights > 0 ? Math.min(1, bookedPastNights / elapsedCapacityNights) : 0;
    const observedAdr = bookedPastNights > 0 ? revenueToDate / bookedPastNights : 0;

    const remainingUnbookedNights = Math.max(0, remainingCapacityNights - futureBookedNights);
    const additionalProjectedRevenue = remainingUnbookedNights * observedOccupancyRate * observedAdr;
    const yearEndForecast = securedRevenue + additionalProjectedRevenue;
    const securedShare = yearEndForecast > 0 ? securedRevenue / yearEndForecast : 0;

    const monthlyData = eachMonthOfInterval({
      start: yearStart,
      end: endOfMonth(new Date(currentYear, 11, 1)),
    }).map((monthDate) => {
      const monthStart = startOfMonth(monthDate);
      const monthIndex = monthStart.getMonth();
      const reservationsForMonth = revenueReservations.filter((reservation) => {
        const checkIn = parseISO(reservation.check_in_date);
        return !Number.isNaN(checkIn.getTime()) && checkIn.getMonth() === monthIndex;
      });

      return {
        month: format(monthDate, 'MMM', { locale: fr }),
        ca: reservationsForMonth.reduce((sum, reservation) => sum + parseAmount(reservation.amount), 0),
        reservations: reservationsForMonth.length,
      };
    });

    const roomBreakdown = userRooms
      .map((room) => {
        const roomReservations = revenueReservations.filter(
          (reservation) => reservation.krossbooking_room_id === room.room_id
        );

        return {
          roomName: room.room_name,
          reservations: roomReservations.length,
          securedRevenue: roomReservations.reduce(
            (sum, reservation) => sum + parseAmount(reservation.amount),
            0
          ),
        };
      })
      .filter((room) => room.reservations > 0 || room.securedRevenue > 0)
      .sort((a, b) => b.securedRevenue - a.securedRevenue);

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
      monthlyData,
      roomBreakdown,
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
        <div className="space-y-2">
          <Badge variant="outline">Krossbooking</Badge>
          <h1 className="text-3xl font-bold tracking-tight">Prévision de CA {currentYear}</h1>
          <p className="text-muted-foreground">
            Projection construite à partir des réservations téléchargées via l'API Krossbooking, sans modifier le reste de l'application.
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Méthode de calcul</AlertTitle>
          <AlertDescription>
            La prévision = <strong>CA déjà sécurisé</strong> par les réservations présentes dans Krossbooking
            {' '}+ un <strong>complément estimé</strong> sur les nuits encore libres, calculé à partir du taux
            d'occupation observé et du revenu moyen par nuit. Les réservations annulées et les blocs propriétaire ne sont pas comptés.
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-36 w-full" />
              ))}
            </div>
            <Skeleton className="h-[340px] w-full" />
            <Skeleton className="h-[320px] w-full" />
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
              <CardDescription>
                Ajoutez d'abord vos logements pour pouvoir calculer une prévision de chiffre d'affaires.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : forecastData.reservationCount === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Aucune réservation exploitable</CardTitle>
              <CardDescription>
                Aucune réservation générant du CA n'a été trouvée pour {currentYear} dans les données Krossbooking.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <RevenueStatCard
                title="Prévision fin d'année"
                value={currencyFormatter.format(forecastData.yearEndForecast)}
                description="CA sécurisé + potentiel estimé sur les nuits encore libres."
                icon={TrendingUp}
              />
              <RevenueStatCard
                title="CA déjà sécurisé"
                value={currencyFormatter.format(forecastData.securedRevenue)}
                description={`${forecastData.reservationCount} réservation(s) déjà présentes dans Krossbooking.`}
                icon={Wallet}
              />
              <RevenueStatCard
                title="CA à date"
                value={currencyFormatter.format(forecastData.revenueToDate)}
                description="Réservations dont l'arrivée est déjà passée ou en cours aujourd'hui."
                icon={Euro}
              />
              <RevenueStatCard
                title="CA restant sécurisé"
                value={currencyFormatter.format(forecastData.futureSecuredRevenue)}
                description="Montant déjà dans le pipe sur le reste de l'année."
                icon={CalendarClock}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <RevenueStatCard
                title="Taux d'occupation observé"
                value={percentFormatter.format(forecastData.observedOccupancyRate)}
                description="Calculé sur les nuitées écoulées depuis le 1er janvier."
                icon={Percent}
              />
              <RevenueStatCard
                title="ADR observé"
                value={currencyFormatter.format(forecastData.observedAdr)}
                description="Revenu moyen constaté par nuit vendue à date."
                icon={BarChart3}
              />
              <RevenueStatCard
                title="Nuits restantes non réservées"
                value={forecastData.remainingUnbookedNights.toLocaleString('fr-FR')}
                description={`Sur ${forecastData.remainingCapacityNights.toLocaleString('fr-FR')} nuitées encore disponibles cette année.`}
                icon={Home}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>CA réservé par mois</CardTitle>
                  <CardDescription>
                    Répartition du chiffre d'affaires sécurisé par mois d'arrivée.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={forecastData.monthlyData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k€`} />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          name === 'ca'
                            ? currencyFormatter.format(value)
                            : `${value.toLocaleString('fr-FR')} réservation(s)`,
                          name === 'ca' ? 'CA sécurisé' : 'Réservations',
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="ca" name="CA sécurisé" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="reservations" name="Réservations" fill="#94a3b8" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Lecture rapide</CardTitle>
                  <CardDescription>Les 3 chiffres à retenir.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="rounded-lg border p-4">
                    <div className="text-muted-foreground">Part déjà sécurisée</div>
                    <div className="mt-1 text-2xl font-bold">
                      {percentFormatter.format(forecastData.securedShare)}
                    </div>
                    <p className="mt-2 text-muted-foreground">
                      Portion de la prévision déjà couverte par des réservations existantes.
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="text-muted-foreground">CA additionnel estimé</div>
                    <div className="mt-1 text-2xl font-bold">
                      {currencyFormatter.format(forecastData.additionalProjectedRevenue)}
                    </div>
                    <p className="mt-2 text-muted-foreground">
                      Potentiel calculé sur les nuits encore libres au rythme actuel.
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="text-muted-foreground">Nuits déjà réservées à venir</div>
                    <div className="mt-1 text-2xl font-bold">
                      {forecastData.futureBookedNights.toLocaleString('fr-FR')}
                    </div>
                    <p className="mt-2 text-muted-foreground">
                      Nuits déjà captées entre aujourd'hui et la fin d'année.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Contribution par logement</CardTitle>
                <CardDescription>
                  Vue simple du CA sécurisé par logement à partir des réservations Krossbooking.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Logement</TableHead>
                      <TableHead className="text-right">Réservations</TableHead>
                      <TableHead className="text-right">CA sécurisé</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forecastData.roomBreakdown.map((room) => (
                      <TableRow key={room.roomName}>
                        <TableCell className="font-medium">{room.roomName}</TableCell>
                        <TableCell className="text-right">{room.reservations}</TableCell>
                        <TableCell className="text-right">{currencyFormatter.format(room.securedRevenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default RevenueForecastPage;
