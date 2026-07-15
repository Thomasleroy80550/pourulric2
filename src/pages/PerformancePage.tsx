"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Line,
  AreaChart,
  Area,
  ComposedChart,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Terminal,
  TrendingUp,
  BedDouble,
  Users,
  CalendarDays,
  Landmark,
  Wallet,
  Star,
  PercentCircle,
  Euro,
  Maximize2,
  Gauge,
} from 'lucide-react';
import { getMyStatements } from '@/lib/statements-api';
import { getUserRooms } from '@/lib/user-room-api';
import { getReviews } from '@/lib/reviews-api';
import { getExpenses, getRecurringExpenses, generateRecurringInstances } from '@/lib/expenses-api';
import { format, eachMonthOfInterval, startOfMonth, endOfMonth, getDaysInMonth, getDaysInYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import ChartFullScreenDialog from '@/components/ChartFullScreenDialog';
import { Button } from '@/components/ui/button';
import CustomChartTooltip from '@/components/CustomChartTooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import StrategyTab from '@/components/StrategyTab';
import { cn } from '@/lib/utils';

const CA_COLOR = 'hsl(var(--primary))';
const BENEF_COLOR = 'hsl(var(--accent))';
const OCC_COLOR = 'hsl(var(--accent))';
const RES_COLOR = 'hsl(var(--sidebar-foreground))';

// Conteneur bulletproof : le graphique est en position absolue et ne peut
// donc jamais élargir la page ni déborder de sa carte.
const ChartFrame = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn('relative w-full overflow-hidden', className)}>
    <div className="absolute inset-0">{children}</div>
  </div>
);

const formatEuro = (value: number) =>
  value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';

type KpiTile = {
  label: string;
  value: string;
  hint: string;
  icon: React.ElementType;
};

const PerformanceDashboard = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // KPIs
  const [totalRevenues, setTotalRevenues] = useState(0);
  const [totalNetProfit, setTotalNetProfit] = useState(0);
  const [occupancyRateYear, setOccupancyRateYear] = useState(0);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [revPar, setRevPar] = useState(0);
  const [adr, setAdr] = useState(0);
  const [netRevenuePerNight, setNetRevenuePerNight] = useState(0);
  const [avgStayDuration, setAvgStayDuration] = useState(0);
  const [avgGuestsPerReservation, setAvgGuestsPerReservation] = useState(0);
  const [roomsCount, setRoomsCount] = useState(0);

  // Charts
  const [monthlyFinancialData, setMonthlyFinancialData] = useState<any[]>([]);
  const [monthlyReservationsData, setMonthlyReservationsData] = useState<any[]>([]);
  const [monthlyOccupancyData, setMonthlyOccupancyData] = useState<any[]>([]);

  // Dialog
  const [isChartDialogOpen, setIsChartDialogOpen] = useState(false);
  const [dialogChartData, setDialogChartData] = useState<any[]>([]);
  const [dialogChartType, setDialogChartType] = useState<'line' | 'bar'>('line');
  const [dialogChartTitle, setDialogChartTitle] = useState('');
  const [dialogChartDataKeys, setDialogChartDataKeys] = useState<{ key: string; name: string; color: string }[]>([]);
  const [dialogChartYAxisUnit, setDialogChartYAxisUnit] = useState<string | undefined>(undefined);

  const openChartDialog = (
    data: any[],
    type: 'line' | 'bar',
    title: string,
    dataKeys: { key: string; name: string; color: string }[],
    yAxisUnit?: string,
  ) => {
    setDialogChartData(data);
    setDialogChartType(type);
    setDialogChartTitle(title);
    setDialogChartDataKeys(dataKeys);
    setDialogChartYAxisUnit(yAxisUnit);
    setIsChartDialogOpen(true);
  };

  const fetchData = useCallback(async (year: number) => {
    setLoadingData(true);
    setError(null);
    try {
      const [statements, userRooms, singleExpenses, recurringExpensesRaw, reviews] = await Promise.all([
        getMyStatements(),
        getUserRooms(),
        getExpenses(year),
        getRecurringExpenses(),
        getReviews(),
      ]);

      // Années disponibles à partir des relevés
      const years = new Set<number>();
      statements.forEach((s) => {
        const match = s.period.match(/(20\d{2})/);
        if (match) years.add(parseInt(match[1], 10));
      });
      years.add(currentYear);
      setAvailableYears(Array.from(years).sort((a, b) => b - a));

      // Note moyenne
      if (reviews && reviews.length > 0) {
        setAverageRating(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length);
      } else {
        setAverageRating(null);
      }

      const recurringInstances = generateRecurringInstances(recurringExpensesRaw, year);
      const allExpenses = [...singleExpenses, ...recurringInstances];
      const totalOtherExpenses = allExpenses.reduce((acc, expense) => acc + expense.amount, 0);

      const statementsForYear = statements.filter((s) => s.period.includes(year.toString()));

      const monthsOfYear = eachMonthOfInterval({
        start: startOfMonth(new Date(year, 0, 1)),
        end: endOfMonth(new Date(year, 11, 1)),
      });
      const monthFrToNum: { [key: string]: number } = {
        janvier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
        juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11,
      };

      const newMonthlyFinancialData = monthsOfYear.map((m) => ({
        name: format(m, 'MMM', { locale: fr }),
        ca: 0, montantVerse: 0, frais: 0, depenses: 0, benef: 0,
      }));
      const newMonthlyReservationsData = monthsOfYear.map((m) => ({
        name: format(m, 'MMM', { locale: fr }),
        reservations: 0,
      }));
      const monthlyNights = Array(12).fill(0);
      const monthlyExpenses = Array(12).fill(0);

      allExpenses.forEach((expense) => {
        const expenseMonth = new Date(expense.expense_date).getUTCMonth();
        if (expenseMonth >= 0 && expenseMonth < 12) {
          monthlyExpenses[expenseMonth] += expense.amount;
        }
      });

      let totalCA = 0;
      let totalNetRevenueFromStatements = 0;
      let totalNightsSold = 0;
      let totalReservations = 0;
      let totalGuests = 0;

      statementsForYear.forEach((s) => {
        const invoiceData = Array.isArray(s.invoice_data) ? s.invoice_data : [];
        const statementCA = s.totals.totalCA ?? invoiceData.reduce(
          (itemAcc, item) => itemAcc + (item.prixSejour || 0) + (item.fraisMenage || 0) + (item.taxeDeSejour || 0), 0,
        );
        totalCA += statementCA;

        const statementNetToPay = (s.totals.totalMontantVerse || 0) - (s.totals.totalFacture || 0);
        totalNetRevenueFromStatements += statementNetToPay;
        const statementNights = s.totals.totalNuits || 0;
        totalNightsSold += statementNights;
        const statementReservations = s.totals.totalReservations ?? invoiceData.length;
        totalReservations += statementReservations;
        const statementGuests = invoiceData.reduce((acc, item) => acc + (item.voyageurs || 0), 0);
        totalGuests += statementGuests;

        const periodParts = s.period.toLowerCase().split(' ');
        const monthName = periodParts[0];
        const monthIndex = monthFrToNum[monthName];

        if (monthIndex !== undefined) {
          newMonthlyFinancialData[monthIndex].ca += statementCA;
          newMonthlyFinancialData[monthIndex].montantVerse += s.totals.totalMontantVerse || 0;
          newMonthlyFinancialData[monthIndex].frais += s.totals.totalFacture || 0;
          newMonthlyFinancialData[monthIndex].benef += statementNetToPay;

          newMonthlyReservationsData[monthIndex].reservations += statementReservations;
          monthlyNights[monthIndex] += statementNights;
        }
      });

      newMonthlyFinancialData.forEach((monthData, index) => {
        monthData.depenses = monthlyExpenses[index];
        monthData.benef -= monthlyExpenses[index];
      });

      setRoomsCount(userRooms.length);
      setTotalRevenues(totalCA);
      setTotalNetProfit(totalNetRevenueFromStatements - totalOtherExpenses);

      const totalDaysInYear = getDaysInYear(new Date(year, 0, 1));
      const totalAvailableNightsInYear = userRooms.length * totalDaysInYear;

      setOccupancyRateYear(totalAvailableNightsInYear > 0 ? (totalNightsSold / totalAvailableNightsInYear) * 100 : 0);
      setRevPar(totalAvailableNightsInYear > 0 ? totalCA / totalAvailableNightsInYear : 0);
      setAdr(totalNightsSold > 0 ? totalCA / totalNightsSold : 0);
      setNetRevenuePerNight(totalNightsSold > 0 ? totalNetRevenueFromStatements / totalNightsSold : 0);
      setAvgStayDuration(totalReservations > 0 ? totalNightsSold / totalReservations : 0);
      setAvgGuestsPerReservation(totalReservations > 0 ? totalGuests / totalReservations : 0);

      const newMonthlyOccupancyData = monthsOfYear.map((m, index) => {
        const daysInMonth = getDaysInMonth(m);
        const totalAvailableNightsInMonth = userRooms.length * daysInMonth;
        const occupation = totalAvailableNightsInMonth > 0 ? (monthlyNights[index] / totalAvailableNightsInMonth) * 100 : 0;
        return { name: format(m, 'MMM', { locale: fr }), occupation };
      });

      setMonthlyFinancialData(newMonthlyFinancialData);
      setMonthlyReservationsData(newMonthlyReservationsData);
      setMonthlyOccupancyData(newMonthlyOccupancyData);
    } catch (err: any) {
      setError(`Erreur lors du chargement des données de performance : ${err.message}`);
      console.error('Error fetching performance data:', err);
    } finally {
      setLoadingData(false);
    }
  }, [currentYear]);

  useEffect(() => {
    fetchData(selectedYear);
  }, [fetchData, selectedYear]);

  const yearLabel = selectedYear === currentYear ? `${currentYear} (en cours)` : String(selectedYear);

  const kpis: KpiTile[] = useMemo(
    () => [
      { label: "Chiffre d'affaires", value: formatEuro(totalRevenues), hint: 'Total brut voyageurs', icon: Landmark },
      { label: 'Bénéfice net', value: formatEuro(totalNetProfit), hint: 'Après frais & dépenses', icon: Wallet },
      { label: "Taux d'occupation", value: `${occupancyRateYear.toFixed(1)} %`, hint: "Moyenne sur l'année", icon: PercentCircle },
      { label: 'RevPAR', value: `${revPar.toFixed(0)} €`, hint: 'Revenu / logement dispo', icon: Gauge },
      { label: 'Prix moyen / nuit', value: `${adr.toFixed(0)} €`, hint: 'ADR — tarif par nuitée', icon: Euro },
      { label: 'Revenu net / nuit', value: `${netRevenuePerNight.toFixed(0)} €`, hint: 'Avant autres dépenses', icon: BedDouble },
    ],
    [totalRevenues, totalNetProfit, occupancyRateYear, revPar, adr, netRevenuePerNight],
  );

  return (
    <div className="w-full max-w-full overflow-x-hidden break-words">
      {/* ── En-tête + sélecteur d'année ─────────────────── */}
      <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <Badge
            variant="outline"
            className="border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))] capitalize text-[hsl(var(--sidebar-foreground))]"
          >
            {format(new Date(), 'EEEE dd MMMM yyyy', { locale: fr })}
          </Badge>
          <h1 className="mt-3 break-words text-2xl font-bold tracking-tight text-[hsl(var(--sidebar-foreground))] sm:text-4xl">
            Vos performances
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Analyse de la rentabilité et de l'activité — {yearLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm font-medium text-muted-foreground">Année</span>
          <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(parseInt(val, 10))}>
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
      </div>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Tuiles KPI ──────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {loadingData
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
                </div>
                <p className="mt-2 truncate text-lg font-bold text-foreground sm:mt-3 sm:text-2xl">{kpi.value}</p>
                <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground sm:text-xs">{kpi.label}</p>
                <p className="mt-0.5 hidden truncate text-[10px] text-muted-foreground sm:block">{kpi.hint}</p>
              </div>
            ))}
      </div>

      {/* ── Bento : Finances (large) + Faits marquants ──── */}
      <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-3">
        <Card className="min-w-0 shadow-sm xl:col-span-2">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold text-[hsl(var(--sidebar-foreground))] sm:text-lg">
                Finances mensuelles
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">CA, montant versé, frais, dépenses & bénéfice net</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() =>
                openChartDialog(
                  monthlyFinancialData,
                  'line',
                  'Statistiques Financières Mensuelles',
                  [
                    { key: 'ca', name: 'CA', color: CA_COLOR },
                    { key: 'montantVerse', name: 'Montant Versé', color: '#FACC15' },
                    { key: 'frais', name: 'Frais Plateforme', color: 'hsl(var(--destructive))' },
                    { key: 'depenses', name: 'Autres Dépenses', color: '#f97316' },
                    { key: 'benef', name: 'Bénéfice Net', color: '#22c55e' },
                  ],
                  '€',
                )
              }
            >
              <Maximize2 className="mr-2 h-3.5 w-3.5" />
              Agrandir
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            {loadingData ? (
              <Skeleton className="h-64 w-full sm:h-80" />
            ) : (
              <ChartFrame className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyFinancialData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorBenefPerf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" tickLine={false} axisLine={false} />
                    <YAxis className="text-xs" tickLine={false} axisLine={false} tickFormatter={(v) => `${v}€`} />
                    <Tooltip content={<CustomChartTooltip formatter={(value) => `${value.toFixed(2)}€`} />} />
                    <Line type="monotone" dataKey="ca" stroke={CA_COLOR} name="CA" strokeWidth={2.5} dot={false} animationDuration={1200} />
                    <Line type="monotone" dataKey="montantVerse" stroke="#FACC15" name="Montant Versé" strokeWidth={2} dot={false} animationDuration={1200} />
                    <Line type="monotone" dataKey="frais" stroke="hsl(var(--destructive))" name="Frais Plateforme" strokeWidth={2} dot={false} animationDuration={1200} />
                    <Line type="monotone" dataKey="depenses" stroke="#f97316" name="Autres Dépenses" strokeWidth={2} dot={false} animationDuration={1200} />
                    <Area type="monotone" dataKey="benef" stroke="#22c55e" fillOpacity={1} fill="url(#colorBenefPerf)" name="Bénéfice Net" strokeWidth={3} animationDuration={1200} />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartFrame>
            )}
          </CardContent>
        </Card>

        {/* Colonne droite : bénéfice net hero + stats séjour */}
        <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[hsl(var(--sidebar-foreground))] via-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white shadow-md">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-2 text-white/80">
                <Wallet className="h-4 w-4 shrink-0" />
                <span className="text-xs font-medium uppercase tracking-widest">Bénéfice net {selectedYear}</span>
              </div>
              {loadingData ? (
                <Skeleton className="mt-4 h-10 w-2/3 bg-white/20" />
              ) : (
                <>
                  <p className="mt-3 text-3xl font-bold sm:text-4xl">{formatEuro(totalNetProfit)}</p>
                  <p className="mt-1 truncate text-sm text-white/80">
                    sur {formatEuro(totalRevenues)} de chiffre d'affaires
                  </p>
                </>
              )}
              <div className="mt-4 flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
                <TrendingUp className="h-3.5 w-3.5" />
                {roomsCount} logement{roomsCount > 1 ? 's' : ''} • occupation {occupancyRateYear.toFixed(0)}%
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <Card className="min-w-0 shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 text-[hsl(var(--sidebar-foreground))]">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  <span className="truncate text-xs font-medium text-muted-foreground">Durée moy. séjour</span>
                </div>
                {loadingData ? (
                  <Skeleton className="mt-3 h-8 w-16" />
                ) : (
                  <p className="mt-2 text-2xl font-bold">
                    {avgStayDuration.toFixed(1)} <span className="text-sm font-medium text-muted-foreground">nuits</span>
                  </p>
                )}
                <p className="mt-1 truncate text-xs text-muted-foreground">par réservation</p>
              </CardContent>
            </Card>
            <Card className="min-w-0 shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 text-[hsl(var(--sidebar-foreground))]">
                  <Users className="h-4 w-4 shrink-0" />
                  <span className="truncate text-xs font-medium text-muted-foreground">Voyageurs / résa</span>
                </div>
                {loadingData ? (
                  <Skeleton className="mt-3 h-8 w-16" />
                ) : (
                  <p className="mt-2 text-2xl font-bold">{avgGuestsPerReservation.toFixed(1)}</p>
                )}
                <p className="mt-1 truncate text-xs text-muted-foreground">en moyenne</p>
              </CardContent>
            </Card>
            <Card className="col-span-2 min-w-0 shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 text-amber-500">
                  <Star className="h-4 w-4 shrink-0 fill-current" />
                  <span className="truncate text-xs font-medium text-muted-foreground">Note moyenne voyageurs</span>
                </div>
                {loadingData ? (
                  <Skeleton className="mt-3 h-8 w-24" />
                ) : (
                  <p className="mt-2 text-2xl font-bold">
                    {averageRating !== null ? `${averageRating.toFixed(1)} / 5` : 'N/A'}
                  </p>
                )}
                <p className="mt-1 truncate text-xs text-muted-foreground">basé sur les avis clients</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Réservations / mois + Taux d'occupation ─────── */}
      <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:mt-6 sm:grid-cols-2 sm:gap-6">
        <Card className="min-w-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Réservations / mois</CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() =>
                openChartDialog(monthlyReservationsData, 'bar', 'Réservations par mois', [
                  { key: 'reservations', name: 'Réservations', color: RES_COLOR },
                ])
              }
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ChartFrame className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyReservationsData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <XAxis dataKey="name" className="text-[10px]" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} className="text-[10px]" tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Bar dataKey="reservations" fill={RES_COLOR} name="Réservations" radius={[4, 4, 0, 0]} animationDuration={1200} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartFrame>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Taux d'occupation</CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() =>
                openChartDialog(
                  monthlyOccupancyData,
                  'line',
                  "Taux d'Occupation Mensuel",
                  [{ key: 'occupation', name: 'Occupation', color: OCC_COLOR }],
                  '%',
                )
              }
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ChartFrame className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyOccupancyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorOccupationPerf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={OCC_COLOR} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={OCC_COLOR} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <XAxis dataKey="name" className="text-[10px]" tickLine={false} axisLine={false} />
                    <YAxis unit="%" className="text-[10px]" tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(value) => `${value.toFixed(1)}%`} />} />
                    <Area type="monotone" dataKey="occupation" stroke={OCC_COLOR} fill="url(#colorOccupationPerf)" name="Occupation" strokeWidth={2.5} animationDuration={1200} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartFrame>
            )}
          </CardContent>
        </Card>
      </div>

      <ChartFullScreenDialog
        isOpen={isChartDialogOpen}
        onOpenChange={setIsChartDialogOpen}
        chartData={dialogChartData}
        chartType={dialogChartType}
        title={dialogChartTitle}
        dataKeys={dialogChartDataKeys}
        yAxisUnit={dialogChartYAxisUnit}
      />
    </div>
  );
};

const PerformancePage: React.FC = () => {
  return (
    <MainLayout>
      <div className="w-full max-w-full overflow-x-hidden">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 rounded-full">
            <TabsTrigger value="dashboard" className="rounded-full">Tableau de bord</TabsTrigger>
            <TabsTrigger value="strategy" className="rounded-full">Stratégie</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="mt-6">
            <PerformanceDashboard />
          </TabsContent>
          <TabsContent value="strategy" className="mt-6">
            <StrategyTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default PerformancePage;
