"use client";

import { MadeWithDyad } from "@/components/made-with-dyad";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react"; 
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
  ComposedChart,
  Line,
} from "recharts";
import React, { useState, useEffect, useCallback } from "react";
import ObjectiveDialog from "@/components/ObjectiveDialog";
import { getProfile } from "@/lib/profile-api";
import { Skeleton } from '@/components/ui/skeleton';
import { fetchKrossbookingReservations, KrossbookingReservation } from '@/lib/krossbooking';
import { getUserRooms, UserRoom } from '@/lib/user-room-api';
import { parseISO, isAfter, isSameDay, format, isValid, getDaysInYear, isBefore, differenceInDays, getDaysInMonth, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import ChartFullScreenDialog from '@/components/ChartFullScreenDialog';
import ForecastDialog from '@/components/ForecastDialog';
import { FieryProgressBar } from '@/components/FieryProgressBar';
import { startDashboardTour } from '@/lib/tour';
import { getMyStatements } from '@/lib/statements-api';
import { SavedInvoice } from "@/lib/admin-api";
import CustomChartTooltip from '@/components/CustomChartTooltip';

const DONUT_CATEGORIES = [
  { name: 'Airbnb', color: '#FF5A5F' },
  { name: 'Booking', color: '#003580' },
  { name: 'Abritel', color: '#2D60E0' },
  { name: 'Hello Keys', color: '#00A699' },
  { name: 'Proprio', color: '#4f46e5' },
  { name: 'Autre', color: '#6b7280' },
];

const DashboardPage = () => {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const [activityData, setActivityData] = useState(
    DONUT_CATEGORIES.map(cat => ({ ...cat, value: 0 }))
  );

  const [financialData, setFinancialData] = useState({
    caAnnee: 0,
    rentreeArgentAnnee: 0,
    fraisAnnee: 0,
    resultatAnnee: 0,
    currentAchievementPercentage: 0,
  });
  const [loadingFinancialData, setLoadingFinancialData] = useState(true);
  const [financialDataError, setFinancialDataError] = useState<string | null>(null);

  const [monthlyFinancialData, setMonthlyFinancialData] = useState<any[]>([]);
  const [monthlyReservationsData, setMonthlyReservationsData] = useState<any[]>([]);
  const [monthlyOccupancyData, setMonthlyOccupancyData] = useState<any[]>([]);

  const [isObjectiveDialogOpen, setIsObjectiveDialogOpen] = useState(false);
  const [userObjectiveAmount, setUserObjectiveAmount] = useState(0);

  const [nextArrival, setNextArrival] = useState<KrossbookingReservation | null>(null);
  const [totalReservationsCurrentYear, setTotalReservationsCurrentYear] = useState(0);
  const [totalNightsCurrentYear, setTotalNightsCurrentYear] = useState(0);
  const [totalGuestsCurrentYear, setTotalGuestsCurrentYear] = useState(0);
  const [occupancyRateCurrentYear, setOccupancyRateCurrentYear] = useState(0);
  const [netPricePerNight, setNetPricePerNight] = useState(0);
  const [loadingKrossbookingStats, setLoadingKrossbookingStats] = useState(true);
  const [krossbookingStatsError, setKrossbookingStatsError] = useState<string | null>(null);

  const [isChartDialogOpen, setIsChartDialogOpen] = useState(false);
  const [dialogChartData, setDialogChartData] = useState<any[]>([]);
  const [dialogChartType, setDialogChartType] = useState<'line' | 'bar'>('line');
  const [dialogChartTitle, setDialogChartTitle] = useState('');
  const [dialogChartDataKeys, setDialogChartDataKeys] = useState<{ key: string; name: string; color: string; }[]>([]);
  const [dialogChartYAxisUnit, setDialogChartYAxisUnit] = useState<string | undefined>(undefined);

  const [isForecastDialogOpen, setIsForecastDialogOpen] = useState(false);
  const [forecastAmount, setForecastAmount] = useState(0);

  const openChartDialog = (data: any[], type: 'line' | 'bar', title: string, dataKeys: { key: string; name: string; color: string; }[], yAxisUnit?: string) => {
    setDialogChartData(data);
    setDialogChartType(type);
    setDialogChartTitle(title);
    setDialogChartDataKeys(dataKeys);
    setDialogChartYAxisUnit(yAxisUnit);
    setIsChartDialogOpen(true);
  };

  const processStatements = (statements: SavedInvoice[], year: number, userRooms: UserRoom[]) => {
    const statementsForYear = statements.filter(s => s.period.includes(year.toString()));

    let totalCA = 0, totalRentree = 0, totalFrais = 0, totalResultat = 0, totalNights = 0, totalGuests = 0, totalReservations = 0;
    const channelCounts: { [key: string]: number } = {};
    DONUT_CATEGORIES.forEach(cat => channelCounts[cat.name.toLowerCase()] = 0);

    const monthsOfYear = eachMonthOfInterval({
      start: startOfMonth(new Date(year, 0, 1)),
      end: endOfMonth(new Date(year, 11, 1)),
    });

    const newMonthlyFinancialData = monthsOfYear.map(m => ({ name: format(m, 'MMM', { locale: fr }), ca: 0, montantVerse: 0, frais: 0, benef: 0 }));
    const newMonthlyReservationsData = monthsOfYear.map(m => ({ name: format(m, 'MMM', { locale: fr }), reservations: 0 }));
    const monthlyNights = Array(12).fill(0);
    
    const monthFrToNum: { [key: string]: number } = { 'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5, 'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11 };

    statementsForYear.forEach(s => {
      const statementCA = s.totals.totalCA ?? s.invoice_data.reduce((acc, item) => acc + (item.prixSejour || 0) + (item.fraisMenage || 0) + (item.taxeDeSejour || 0), 0);
      totalCA += statementCA;
      totalRentree += s.totals.totalMontantVerse || 0;
      totalFrais += s.totals.totalCommission || 0;
      const netToPay = (s.totals.totalMontantVerse || 0) - (s.totals.totalTaxeDeSejour || 0) - (s.totals.totalFraisMenage || 0) - (s.totals.totalCommission || 0);
      totalResultat += netToPay;
      totalNights += s.totals.totalNuits || 0;
      totalGuests += s.totals.totalVoyageurs || 0;
      totalReservations += s.invoice_data.length;

      const periodParts = s.period.toLowerCase().split(' ');
      const monthName = periodParts[0];
      const monthIndex = monthFrToNum[monthName];

      if (monthIndex !== undefined) {
        const statementNetToPay = (s.totals.totalMontantVerse || 0) - (s.totals.totalTaxeDeSejour || 0) - (s.totals.totalFraisMenage || 0) - (s.totals.totalCommission || 0);
        
        newMonthlyFinancialData[monthIndex].ca += statementCA;
        newMonthlyFinancialData[monthIndex].montantVerse += s.totals.totalMontantVerse || 0;
        newMonthlyFinancialData[monthIndex].frais += s.totals.totalCommission || 0;
        newMonthlyFinancialData[monthIndex].benef += statementNetToPay;
        
        newMonthlyReservationsData[monthIndex].reservations += s.invoice_data.length;
        monthlyNights[monthIndex] += s.totals.totalNuits || 0;
      }

      s.invoice_data.forEach(resa => {
        const portail = resa.portail.toLowerCase();
        if (portail.includes('airbnb')) channelCounts['airbnb']++;
        else if (portail.includes('booking')) channelCounts['booking']++;
        else if (portail.includes('abritel')) channelCounts['abritel']++;
        else if (portail.includes('hello keys')) channelCounts['hello keys']++;
        else if (portail.includes('proprio')) channelCounts['proprio']++;
        else channelCounts['autre']++;
      });
    });

    const newMonthlyOccupancyData = monthsOfYear.map((m, index) => {
      const daysInMonth = getDaysInMonth(m);
      const totalAvailableNightsInMonth = userRooms.length * daysInMonth;
      const occupation = totalAvailableNightsInMonth > 0 ? (monthlyNights[index] / totalAvailableNightsInMonth) * 100 : 0;
      return { name: format(m, 'MMM', { locale: fr }), occupation };
    });

    setFinancialData(prev => ({
      ...prev,
      caAnnee: totalCA,
      rentreeArgentAnnee: totalRentree,
      fraisAnnee: totalFrais,
      resultatAnnee: totalResultat,
    }));
    setTotalNightsCurrentYear(totalNights);
    setTotalReservationsCurrentYear(totalReservations);
    setTotalGuestsCurrentYear(totalGuests);
    setMonthlyFinancialData(newMonthlyFinancialData);
    setMonthlyReservationsData(newMonthlyReservationsData);
    setMonthlyOccupancyData(newMonthlyOccupancyData);

    const newActivityData = DONUT_CATEGORIES.map(cat => ({
      ...cat,
      value: channelCounts[cat.name.toLowerCase()] || 0
    }));
    setActivityData(newActivityData);

    return { totalNights };
  };

  const fetchData = useCallback(async () => {
    setLoadingFinancialData(true);
    setFinancialDataError(null);
    setLoadingKrossbookingStats(true);
    setKrossbookingStatsError(null);

    try {
      const [userProfile, statements, fetchedUserRooms] = await Promise.all([
        getProfile(),
        getMyStatements(),
        getUserRooms(),
      ]);

      const { totalNights } = processStatements(statements, currentYear, fetchedUserRooms);

      if (userProfile) {
        const objectiveAmount = userProfile.objective_amount || 0;
        setUserObjectiveAmount(objectiveAmount);
        setFinancialData(prev => ({
          ...prev,
          currentAchievementPercentage: (objectiveAmount === 0) ? 0 : (prev.resultatAnnee / objectiveAmount) * 100,
        }));
      } else {
        setFinancialDataError("Impossible de charger le profil utilisateur.");
      }

      const allReservations = await fetchKrossbookingReservations(fetchedUserRooms);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let nextArrivalCandidate: KrossbookingReservation | null = null;
      allReservations.forEach(res => {
        const checkIn = isValid(parseISO(res.check_in_date)) ? parseISO(res.check_in_date) : null;
        if (checkIn && (isSameDay(checkIn, today) || isAfter(checkIn, today)) && (!nextArrivalCandidate || isBefore(checkIn, parseISO(nextArrivalCandidate.check_in_date)))) {
          nextArrivalCandidate = res;
        }
      });
      setNextArrival(nextArrivalCandidate);

      const totalDaysInCurrentYear = getDaysInYear(new Date());
      const totalAvailableNightsInYear = fetchedUserRooms.length * totalDaysInCurrentYear;
      const calculatedOccupancyRate = totalAvailableNightsInYear > 0 ? (totalNights / totalAvailableNightsInYear) * 100 : 0;
      setOccupancyRateCurrentYear(calculatedOccupancyRate);

      setFinancialData(prev => {
        const calculatedNetPricePerNight = totalNights > 0 ? (prev.resultatAnnee / totalNights) : 0;
        setNetPricePerNight(calculatedNetPricePerNight);
        return prev;
      });

    } catch (err: any) {
      const errorMsg = `Erreur lors du chargement des données : ${err.message}`;
      setFinancialDataError(errorMsg);
      setKrossbookingStatsError(errorMsg);
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoadingFinancialData(false);
      setLoadingKrossbookingStats(false);
    }
  }, [currentYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const tourCompleted = localStorage.getItem('dashboardTourCompleted_v1');
    if (!tourCompleted) {
      const timer = setTimeout(() => {
        startDashboardTour();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleShowForecast = () => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const totalDaysInYear = getDaysInYear(today);
    if (dayOfYear === 0) {
      toast.error("Impossible de calculer la prévision au début de l'année.");
      return;
    }
    const avgDailyRevenue = financialData.resultatAnnee / dayOfYear;
    const forecast = avgDailyRevenue * totalDaysInYear;
    setForecastAmount(forecast);
    setIsForecastDialogOpen(true);
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-2">Bonjour 👋</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Nous sommes le {format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p>

        <div className="flex space-x-2 mb-8">
          {years.map((year) => (
            <Button
              key={year}
              variant={year === currentYear ? "default" : "outline"}
              className="rounded-full"
            >
              {year}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Bilan Financier Card */}
          <Card id="tour-financial-summary" className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Bilan Financier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingFinancialData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ) : financialDataError ? (
                <Alert variant="destructive">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Erreur de chargement</AlertTitle>
                  <AlertDescription>{financialDataError}</AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-start">
                      <p className="text-xl md:text-2xl font-bold text-green-600">{financialData.caAnnee.toFixed(2)}€</p>
                      <p className="text-sm text-gray-500">CA sur l'année</p>
                    </div>
                    <div className="flex flex-col items-start">
                      <p className="text-xl md:text-2xl font-bold text-orange-600">{financialData.rentreeArgentAnnee.toFixed(2)}€</p>
                      <p className="text-sm text-gray-500">Rentré d'argent sur l'année</p>
                    </div>
                    <div className="flex flex-col items-start">
                      <p className="text-xl md:text-2xl font-bold text-red-600">{financialData.fraisAnnee.toFixed(2)}€</p>
                      <p className="text-sm text-gray-500">Frais de gestion sur l'année</p>
                    </div>
                    <div className="flex flex-col items-start">
                      <p className="text-xl md:text-2xl font-bold text-green-600">{financialData.resultatAnnee.toFixed(2)}€</p>
                      <p className="text-sm text-gray-500">Résultats sur l'année</p>
                    </div>
                  </div>
                  <div className="flex space-x-4 items-center">
                    <Button variant="link" className="p-0 h-auto text-blue-600 dark:text-blue-400">Voir mes statistiques -&gt;</Button>
                    <Button variant="outline" onClick={handleShowForecast}>Prévision</Button>
                  </div>
                  <div id="tour-objective" className="space-y-2 mt-2 relative">
                    <p className="text-sm text-gray-700 dark:text-gray-300">Mon objectif: <span className="font-bold">{userObjectiveAmount.toFixed(2)}€</span></p>
                    <FieryProgressBar 
                      value={financialData.currentAchievementPercentage} 
                      className="h-2" 
                      indicatorClassName={financialData.currentAchievementPercentage >= 80 ? 'progress-flame' : ''}
                    />
                    <p className="text-xs text-gray-500">Atteint: {financialData.currentAchievementPercentage.toFixed(2)}%</p>
                    <Button variant="link" className="p-0 h-auto text-blue-600 dark:text-blue-400" onClick={() => setIsObjectiveDialogOpen(true)}>
                      Modifier mon objectif -&gt;
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Activité de Location Card */}
          <Card id="tour-activity-stats" className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Activité de Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingKrossbookingStats || loadingFinancialData ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ) : krossbookingStatsError || financialDataError ? (
                <Alert variant="destructive">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Erreur de chargement</AlertTitle>
                  <AlertDescription>{krossbookingStatsError || financialDataError}</AlertDescription>
                </Alert>
              ) : (
                <>
                  <div>
                    {nextArrival ? (
                      <p className="text-xl font-bold">
                        {format(parseISO(nextArrival.check_in_date), 'dd MMMM', { locale: fr })}
                      </p>
                    ) : (
                      <p className="text-xl font-bold">Aucune</p>
                    )}
                    <p className="text-sm text-gray-500">
                      Prochaine arrivée
                      {nextArrival && ` (${nextArrival.property_name})`}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xl font-bold">{totalReservationsCurrentYear}</p>
                      <p className="text-sm text-gray-500">Réservations sur l'année</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">{totalNightsCurrentYear}</p>
                      <p className="text-sm text-gray-500">Nuits sur l'année</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">{totalGuestsCurrentYear}</p>
                      <p className="text-sm text-gray-500">Voyageurs sur l'année</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">{occupancyRateCurrentYear.toFixed(2)}%</p>
                      <p className="text-sm text-gray-500">Occupation sur l'année</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">{netPricePerNight.toFixed(2)}€</p>
                      <p className="text-sm text-gray-500">Prix net / nuit</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">4.4/5</p>
                      <p className="text-sm text-gray-500">Votre note</p>
                    </div>
                  </div>
                  <Button variant="link" className="p-0 h-auto text-blue-600 dark:text-blue-400">Voir mes avis -&gt;</Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Activité de Location Card (Donut Chart) */}
          <Card id="tour-activity-chart" className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Activité de Location</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col p-4 h-[320px]">
              {loadingFinancialData ? (
                <div className="flex flex-col md:flex-row md:items-center md:justify-center md:gap-x-8 w-full">
                  <Skeleton className="w-full md:w-3/5 h-[280px]" />
                  <div className="text-sm space-y-2 mt-4 md:mt-0 md:ml-4 md:w-2/5 flex flex-col items-start">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-4 w-full" />
                    ))}
                  </div>
                </div>
              ) : financialDataError ? (
                <Alert variant="destructive">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Erreur de chargement</AlertTitle>
                  <AlertDescription>{financialDataError}</AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-center md:gap-x-8 w-full h-full">
                    <div className="w-full md:w-3/5 h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={activityData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={100}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                            isAnimationActive={true}
                            animationDuration={1500}
                            animationEasing="ease-in-out"
                          >
                            {activityData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="text-sm space-y-2 mt-4 md:mt-0 md:ml-4 md:w-2/5 flex flex-col items-start">
                      {activityData.map((item) => (
                        <div key={item.name} className="flex items-center">
                          <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                          {item.name}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button variant="link" className="p-0 h-auto text-blue-600 dark:text-blue-400 mt-4 md:mt-0 md:self-end">Voir mes réservations -&gt;</Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* New 3-column grid for charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Statistiques Financières Mensuelles Card */}
          <Card id="tour-monthly-financials" className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Finances Mensuelles</CardTitle>
              <Button variant="outline" size="sm" onClick={() => openChartDialog(
                monthlyFinancialData,
                'line',
                'Statistiques Financières Mensuelles',
                [
                  { key: 'ca', name: 'CA', color: 'hsl(var(--primary))' },
                  { key: 'montantVerse', name: 'Montant Versé', color: '#FACC15' },
                  { key: 'frais', name: 'Frais', color: 'hsl(var(--destructive))' },
                  { key: 'benef', name: 'Bénéfice', color: '#22c55e' },
                ],
                '€'
              )}>
                Agrandir
              </Button>
            </CardHeader>
            <CardContent className="h-72">
              {loadingFinancialData ? (
                <Skeleton className="h-full w-full" />
              ) : financialDataError ? (
                <Alert variant="destructive">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Erreur</AlertTitle>
                  <AlertDescription>{financialDataError}</AlertDescription>
                </Alert>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyFinancialData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorBenef" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis dataKey="name" className="text-xs text-gray-600 dark:text-gray-400" tickLine={false} axisLine={false} />
                    <YAxis className="text-xs text-gray-600 dark:text-gray-400" tickLine={false} axisLine={false} tickFormatter={(value) => `€${value}`} />
                    <Tooltip content={<CustomChartTooltip formatter={(value) => `${value.toFixed(2)}€`} />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="ca" stroke="hsl(var(--primary))" name="CA" strokeWidth={2} dot={false} animationDuration={1500} animationEasing="ease-in-out" />
                    <Line type="monotone" dataKey="montantVerse" stroke="#FACC15" name="Montant Versé" strokeWidth={2} dot={false} animationDuration={1500} animationEasing="ease-in-out" />
                    <Line type="monotone" dataKey="frais" stroke="hsl(var(--destructive))" name="Frais" strokeWidth={2} dot={false} animationDuration={1500} animationEasing="ease-in-out" />
                    <Area type="monotone" dataKey="benef" stroke="#22c55e" fillOpacity={1} fill="url(#colorBenef)" name="Bénéfice" strokeWidth={3} animationDuration={1500} animationEasing="ease-in-out" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Réservation / mois Card */}
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Réservations / mois</CardTitle>
              <Button variant="outline" size="sm" onClick={() => openChartDialog(
                monthlyReservationsData,
                'bar',
                'Réservations par mois',
                [{ key: 'reservations', name: 'Réservations', color: '#8b5cf6' }]
              )}>
                Agrandir
              </Button>
            </CardHeader>
            <CardContent className="h-72">
              {loadingFinancialData ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyReservationsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorReservations" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" className="text-xs" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} className="text-xs" tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="reservations" fill="url(#colorReservations)" name="Réservations" radius={[4, 4, 0, 0]} animationDuration={1500} animationEasing="ease-in-out" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Occupation Mensuelle Card */}
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Taux d'Occupation</CardTitle>
              <Button variant="outline" size="sm" onClick={() => openChartDialog(
                monthlyOccupancyData,
                'line',
                'Taux d\'Occupation Mensuel',
                [{ key: 'occupation', name: 'Occupation', color: '#14b8a6' }],
                '%'
              )}>
                Agrandir
              </Button>
            </CardHeader>
            <CardContent className="h-72">
              {loadingFinancialData ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyOccupancyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorOccupation" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" className="text-xs" tickLine={false} axisLine={false} />
                    <YAxis unit="%" className="text-xs" tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(value) => `${value.toFixed(2)}%`} />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area type="monotone" dataKey="occupation" stroke="#14b8a6" fill="url(#colorOccupation)" name="Occupation" strokeWidth={2} animationDuration={1500} animationEasing="ease-in-out" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <MadeWithDyad />
      <ObjectiveDialog
        isOpen={isObjectiveDialogOpen}
        onOpenChange={setIsObjectiveDialogOpen}
        currentObjectiveAmount={userObjectiveAmount}
        onObjectiveUpdated={fetchData}
      />
      <ChartFullScreenDialog
        isOpen={isChartDialogOpen}
        onOpenChange={setIsChartDialogOpen}
        chartData={dialogChartData}
        chartType={dialogChartType}
        title={dialogChartTitle}
        dataKeys={dialogChartDataKeys}
        yAxisUnit={dialogChartYAxisUnit}
      />
      <ForecastDialog
        isOpen={isForecastDialogOpen}
        onOpenChange={setIsForecastDialogOpen}
        forecastAmount={forecastAmount}
        year={currentYear}
      />
    </MainLayout>
  );
};

export default DashboardPage;