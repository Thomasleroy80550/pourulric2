"use client";

import { MadeWithDyad } from "@/components/made-with-dyad";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import React, { useState, useEffect, useCallback } from "react";
import { callGSheetProxy } from "@/lib/gsheets";
import { toast } from "sonner";
import ObjectiveDialog from "@/components/ObjectiveDialog";
import { getProfile } from "@/lib/profile-api";
import { Skeleton } from '@/components/ui/skeleton';
import { fetchKrossbookingReservations, KrossbookingReservation } from '@/lib/krossbooking';
import { getUserRooms, UserRoom } from '@/lib/user-room-api';
import { parseISO, isAfter, isSameDay, format, isValid, getDaysInYear, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale';

const DONUT_CATEGORIES = [
  { name: 'Airbnb', color: '#FF5A5F' }, // Airbnb brand color
  { name: 'Booking', color: '#003580' }, // Booking.com brand color
  { name: 'Abritel', color: '#2D60E0' }, // Abritel/Vrbo brand color
  { name: 'Hello Keys', color: '#00A699' }, // Distinct color for Hello Keys
  { name: 'Proprio', color: '#4f46e5' }, // Existing purple for owner reservations
  { name: 'Autre', color: '#6b7280' }, // Existing gray for unknown/other channels
];

const DashboardPage = () => {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const [activityData, setActivityData] = useState(
    DONUT_CATEGORIES.map(cat => ({ ...cat, value: 0 }))
  );

  const [financialData, setFinancialData] = useState({
    venteAnnee: 0,
    rentreeArgentAnnee: 0,
    fraisAnnee: 0,
    resultatAnnee: 0,
    currentAchievementPercentage: 0,
  });
  const [loadingFinancialData, setLoadingFinancialData] = useState(true);
  const [financialDataError, setFinancialDataError] = useState<string | null>(null);

  const [monthlyFinancialData, setMonthlyFinancialData] = useState<any[]>([]);
  const [loadingMonthlyFinancialData, setLoadingMonthlyFinancialData] = useState(true);
  const [monthlyFinancialDataError, setMonthlyFinancialDataError] = useState<string | null>(null);

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

  const fetchData = useCallback(async () => {
    setLoadingFinancialData(true);
    setFinancialDataError(null);
    setLoadingMonthlyFinancialData(true);
    setMonthlyFinancialDataError(null);

    try {
      const [
        financialSheetData,
        userProfile,
        reservationsCountData,
        guestsCountData,
        nightsCountData,
        channelData,
        monthlyFinancialSheetData,
      ] = await Promise.all([
        callGSheetProxy({ action: 'read_sheet', range: 'C2:F2' }),
        getProfile(),
        callGSheetProxy({ action: 'read_sheet', range: 'B2' }), // Total Reservations
        callGSheetProxy({ action: 'read_sheet', range: 'K2' }), // Total Guests
        callGSheetProxy({ action: 'read_sheet', range: 'L2' }), // Total Nights
        callGSheetProxy({ action: 'read_sheet', range: 'DG2:DK2' }), // Channel Reservations
        callGSheetProxy({ action: 'read_sheet', range: 'BU2:CF5' }), // Monthly Financial Data
      ]);

      // Process Financial Data
      let currentResultatAnnee = 0;
      if (financialSheetData && financialSheetData.length > 0 && financialSheetData[0].length >= 4) {
        const [vente, rentree, frais, resultat] = financialSheetData[0].map(Number);
        currentResultatAnnee = isNaN(vente) ? 0 : vente;
        setFinancialData(prev => ({
          ...prev,
          venteAnnee: isNaN(vente) ? 0 : vente,
          rentreeArgentAnnee: isNaN(rentree) ? 0 : rentree,
          fraisAnnee: isNaN(frais) ? 0 : frais,
          resultatAnnee: isNaN(resultat) ? 0 : resultat,
        }));
      } else {
        setFinancialDataError("Format de données inattendu pour le bilan financier.");
      }

      // Process Total Reservations
      if (reservationsCountData && reservationsCountData.length > 0 && reservationsCountData[0].length > 0) {
        const count = Number(reservationsCountData[0][0]);
        setTotalReservationsCurrentYear(isNaN(count) ? 0 : count);
      } else {
        setFinancialDataError(prev => prev ? prev + " Format de données inattendu pour les réservations annuelles." : "Format de données inattendu pour les réservations annuelles.");
      }

      // Process Total Guests
      if (guestsCountData && guestsCountData.length > 0 && guestsCountData[0].length > 0) {
        const count = Number(guestsCountData[0][0]);
        setTotalGuestsCurrentYear(isNaN(count) ? 0 : count);
      } else {
        setFinancialDataError(prev => prev ? prev + " Format de données inattendu pour les voyageurs annuels." : "Format de données inattendu pour les voyageurs annuels.");
      }

      // Process Total Nights
      let currentTotalNights = 0;
      if (nightsCountData && nightsCountData.length > 0 && nightsCountData[0].length > 0) {
        const count = Number(nightsCountData[0][0]);
        currentTotalNights = isNaN(count) ? 0 : count;
        setTotalNightsCurrentYear(currentTotalNights);
      } else {
        setFinancialDataError(prev => prev ? prev + " Format de données inattendu pour les nuits annuelles." : "Format de données inattendu pour les nuits annuelles.");
      }

      // Process Channel Data (Donut Chart)
      if (channelData && channelData.length > 0 && channelData[0].length >= 5) {
        const [airbnb, booking, abritel, hellokeys, proprio] = channelData[0].map(Number);
        const newActivityData = DONUT_CATEGORIES.map(cat => {
          if (cat.name === 'Airbnb') return { ...cat, value: isNaN(airbnb) ? 0 : airbnb };
          if (cat.name === 'Booking') return { ...cat, value: isNaN(booking) ? 0 : booking };
          if (cat.name === 'Abritel') return { ...cat, value: isNaN(abritel) ? 0 : abritel };
          if (cat.name === 'Hello Keys') return { ...cat, value: isNaN(hellokeys) ? 0 : hellokeys };
          if (cat.name === 'Proprio') return { ...cat, value: isNaN(proprio) ? 0 : proprio };
          return { ...cat, value: 0 }; // 'Autre' will be 0 if not explicitly provided
        });
        setActivityData(newActivityData);
      } else {
        setFinancialDataError(prev => prev ? prev + " Format de données inattendu pour les canaux de réservation." : "Format de données inattendu pour les canaux de réservation.");
      }

      // Process User Profile and Objective
      if (userProfile) {
        const objectiveAmount = userProfile.objective_amount || 0;
        setUserObjectiveAmount(objectiveAmount);
        const calculatedAchievement = (objectiveAmount === 0) ? 0 : (financialData.resultatAnnee / objectiveAmount) * 100;
        setFinancialData(prev => ({
          ...prev,
          currentAchievementPercentage: calculatedAchievement,
        }));
      } else {
        setFinancialDataError("Impossible de charger le profil utilisateur.");
      }

      // Process Monthly Financial Data
      if (monthlyFinancialSheetData && monthlyFinancialSheetData.length >= 4) {
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        const caValues = monthlyFinancialSheetData[0] || [];
        const montantVerseValues = monthlyFinancialSheetData[1] || [];
        const fraisValues = monthlyFinancialSheetData[2] || [];
        const benefValues = monthlyFinancialSheetData[3] || [];

        const formattedData = months.map((month, index) => ({
          name: month,
          ca: parseFloat(caValues[index]) || 0,
          montantVerse: parseFloat(montantVerseValues[index]) || 0,
          frais: parseFloat(fraisValues[index]) || 0,
          benef: parseFloat(benefValues[index]) || 0,
        }));
        setMonthlyFinancialData(formattedData);
      } else {
        setMonthlyFinancialDataError("Format de données inattendu pour les statistiques financières mensuelles.");
      }

    } catch (err: any) {
      setFinancialDataError(`Erreur lors du chargement des données financières ou du profil : ${err.message}`);
      console.error("Error fetching financial data or profile:", err);
    } finally {
      setLoadingFinancialData(false);
      setLoadingMonthlyFinancialData(false);
    }
  }, [financialData.resultatAnnee]);

  const fetchKrossbookingStats = useCallback(async (totalNightsFromGSheet: number) => {
    setLoadingKrossbookingStats(true);
    setKrossbookingStatsError(null);
    try {
      const fetchedUserRooms = await getUserRooms();
      const allReservations = await fetchKrossbookingReservations(fetchedUserRooms);
      console.log("DEBUG: Total Krossbooking Reservations fetched:", allReservations.length);

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

      // Calculate occupancy rate using totalNightsFromGSheet (from GSheet)
      const totalDaysInCurrentYear = getDaysInYear(new Date());
      const totalAvailableNightsInYear = fetchedUserRooms.length * totalDaysInCurrentYear;
      const calculatedOccupancyRate = totalAvailableNightsInYear > 0 ? (totalNightsFromGSheet / totalAvailableNightsInYear) * 100 : 0;
      setOccupancyRateCurrentYear(calculatedOccupancyRate);

      // Calculate Net Price Per Night using financialData.resultatAnnee and totalNightsFromGSheet
      const calculatedNetPricePerNight = totalNightsFromGSheet > 0 ? (financialData.resultatAnnee / totalNightsFromGSheet) : 0;
      setNetPricePerNight(calculatedNetPricePerNight);

    } catch (err: any) {
      setKrossbookingStatsError(`Erreur lors du chargement des statistiques Krossbooking : ${err.message}`);
      console.error("Error fetching Krossbooking stats:", err);
    } finally {
      setLoadingKrossbookingStats(false);
    }
  }, [financialData.resultatAnnee]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!loadingFinancialData && financialData.resultatAnnee !== undefined) {
        fetchKrossbookingStats(totalNightsCurrentYear);
    }
  }, [totalNightsCurrentYear, loadingFinancialData, financialData.resultatAnnee, fetchKrossbookingStats]);

  const reservationPerMonthData = [
    { name: 'Jan', reservations: 10 },
    { name: 'Fév', reservations: 12 },
    { name: 'Mar', reservations: 8 },
    { name: 'Avr', reservations: 15 },
    { name: 'Mai', reservations: 11 },
    { name: 'Juin', reservations: 14 },
    { name: 'Juil', reservations: 18 },
    { name: 'Août', reservations: 16 },
    { name: 'Sep', reservations: 13 },
    { name: 'Oct', reservations: 9 },
    { name: 'Nov', reservations: 10 },
    { name: 'Déc', reservations: 12 },
  ];

  const occupationRateData = [
    { name: 'Jan', occupation: 65 },
    { name: 'Fév', occupation: 70 },
    { name: 'Mar', occupation: 55 },
    { name: 'Avr', occupation: 80 },
    { name: 'Mai', occupation: 72 },
    { name: 'Juin', occupation: 78 },
    { name: 'Juil', occupation: 85 },
    { name: 'Août', occupation: 88 },
    { name: 'Sep', occupation: 75 },
    { name: 'Oct', occupation: 60 },
    { name: 'Nov', occupation: 68 },
    { name: 'Déc', occupation: 70 },
  ];

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
          <Card className="shadow-md">
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
                      <p className="text-xl md:text-2xl font-bold text-green-600">{financialData.venteAnnee.toFixed(2)}€</p>
                      <p className="text-sm text-gray-500">Vente sur l'année</p>
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
                  <Button variant="link" className="p-0 h-auto text-blue-600 dark:text-blue-400">Voir mes statistiques -&gt;</Button>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700 dark:text-gray-300">Mon objectif: <span className="font-bold">{userObjectiveAmount.toFixed(2)}€</span></p>
                    <Progress value={financialData.currentAchievementPercentage} className="h-2" />
                    <p className="text-xs text-gray-500">Atteint: {financialData.currentAchievementPercentage.toFixed(2)}%</p>
                    <Button variant="link" className="p-0 h-auto text-blue-600 dark:text-blue-400" onClick={() => setIsObjectiveDialogOpen(true)}>
                      Modifier mon objectif -&gt;
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Activité de Location Card (Top Left) */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Activité de Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingKrossbookingStats || loadingFinancialData ? ( // Combined loading for all stats in this card
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

          {/* Activité de Location Card (Top Right - Donut Chart) */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Activité de Location</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col p-4">
              {loadingFinancialData ? ( // Donut data also comes from GSheet, so use loadingFinancialData
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
                  {/* Wrapper div with fixed height for ResponsiveContainer */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-center md:gap-x-8 w-full">
                    <div className="w-full md:w-3/5" style={{ height: '280px' }}> {/* Reduced height slightly */}
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart isAnimationActive={true}>
                          <Pie
                            data={activityData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40} // Reduced inner radius
                            outerRadius={90} // Reduced outer radius
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                            animationDuration={1000}
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

          {/* Statistiques Card (Line Chart for Financial Data) */}
          <Card className="shadow-md col-span-full lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Statistiques Financières Mensuelles</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {loadingMonthlyFinancialData ? (
                <Skeleton className="h-full w-full" />
              ) : monthlyFinancialDataError ? (
                <Alert variant="destructive">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Erreur de chargement</AlertTitle>
                  <AlertDescription>{monthlyFinancialDataError}</AlertDescription>
                </Alert>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyFinancialData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} isAnimationActive={true}>
                    <CartesianGrid strokeDasharray="" className="stroke-gray-200 dark:stroke-gray-700" /> {/* Removed strokeDasharray */}
                    <XAxis dataKey="name" className="text-sm text-gray-600 dark:text-gray-400" />
                    <YAxis className="text-sm text-gray-600 dark:text-gray-400" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => `${value}€`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="ca" stroke="hsl(var(--primary))" name="CA" strokeWidth={3} dot={{ r: 4 }} animationDuration={1500} animationEasing="ease-in-out" />
                    <Line type="monotone" dataKey="montantVerse" stroke="#FACC15" name="Montant Versé" strokeWidth={3} dot={{ r: 4 }} animationDuration={1500} animationEasing="ease-in-out" />
                    <Line type="monotone" dataKey="frais" stroke="hsl(var(--destructive))" name="Frais" strokeWidth={3} dot={{ r: 4 }} animationDuration={1500} animationEasing="ease-in-out" />
                    <Line type="monotone" dataKey="benef" stroke="#22c55e" name="Bénéfice" strokeWidth={3} dot={{ r: 4 }} animationDuration={1500} animationEasing="ease-in-out" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Réservation / mois Card (Line Chart) */}
          <Card className="shadow-md col-span-full lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Réservation / mois</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reservationPerMonthData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} isAnimationActive={true}>
                  <CartesianGrid strokeDasharray="" className="stroke-gray-200 dark:stroke-gray-700" /> {/* Removed strokeDasharray */}
                  <XAxis dataKey="name" className="text-sm text-gray-600 dark:text-gray-400" />
                  <YAxis className="text-sm text-gray-600 dark:text-gray-400" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="reservations" stroke="hsl(var(--accent))" name="Réservations" strokeWidth={3} dot={{ r: 4 }} animationDuration={1500} animationEasing="ease-in-out" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Occupation Card (Line Chart) */}
          <Card className="shadow-md col-span-full lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Occupation</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={occupationRateData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} isAnimationActive={true}>
                  <CartesianGrid strokeDashArray="" className="stroke-gray-200 dark:stroke-gray-700" /> {/* Removed strokeDasharray */}
                  <XAxis dataKey="name" className="text-sm text-gray-600 dark:text-gray-400" />
                  <YAxis unit="%" className="text-sm text-gray-600 dark:text-gray-400" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => `${value}%`}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="occupation" stroke="hsl(var(--secondary))" name="Occupation" strokeWidth={3} dot={{ r: 4 }} animationDuration={1500} animationEasing="ease-in-out" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
      <MadeWithDyad />
      <ObjectiveDialog
        isOpen={isObjectiveDialogOpen}
        onOpenChange={setIsObjectiveDialogOpen}
        currentObjectiveAmount={userObjectiveAmount} // Pass the amount
        onObjectiveUpdated={fetchData} // Re-fetch all data after objective is updated
      />
    </MainLayout>
  );
};

export default DashboardPage;