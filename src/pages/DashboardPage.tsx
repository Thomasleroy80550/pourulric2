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
import React, { useState, useEffect } from "react";
import { callGSheetProxy } from "@/lib/gsheets";
import { toast } from "sonner";
import ObjectiveDialog from "@/components/ObjectiveDialog"; // Import the new dialog component
import { getProfile } from "@/lib/profile-api"; // Import getProfile
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { fetchKrossbookingReservations, KrossbookingReservation } from '@/lib/krossbooking'; // Import KrossbookingReservation and fetch function
import { getUserRooms, UserRoom } from '@/lib/user-room-api'; // Import user room API
import { parseISO, isAfter, isSameDay, format, differenceInDays, startOfYear, endOfYear, isBefore, isValid, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';

const DONUT_CATEGORIES = [
  { name: 'Airbnb', color: '#1e40af' },
  { name: 'Booking', color: '#ef4444' },
  { name: 'Abritel', color: '#3b82f6' },
  { name: 'Hello Keys', color: '#0e7490' },
  { name: 'Proprio', color: '#4f46e5' }, // This will aggregate PROP0, PROPRI, DIRECT
  { name: 'Autre', color: '#6b7280' }, // For UNKNOWN or other unmapped channels
];

const DashboardPage = () => {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const [activityData, setActivityData] = useState(
    DONUT_CATEGORIES.map(cat => ({ ...cat, value: 0 }))
  );
  // Removed loadingActivityData and activityDataError as they are now part of loadingKrossbookingStats

  const [financialData, setFinancialData] = useState({
    venteAnnee: 0,
    rentreeArgentAnnee: 0,
    fraisAnnee: 0,
    resultatAnnee: 0,
    currentAchievementPercentage: 0, // Renamed for clarity
  });
  const [loadingFinancialData, setLoadingFinancialData] = useState(true);
  const [financialDataError, setFinancialDataError] = useState<string | null>(null);

  const [monthlyFinancialData, setMonthlyFinancialData] = useState<any[]>([]);
  const [loadingMonthlyFinancialData, setLoadingMonthlyFinancialData] = useState(true);
  const [monthlyFinancialDataError, setMonthlyFinancialDataError] = useState<string | null>(null);

  const [isObjectiveDialogOpen, setIsObjectiveDialogOpen] = useState(false);
  const [userObjectiveAmount, setUserObjectiveAmount] = useState(0); // User's target objective in Euros

  const [nextArrival, setNextArrival] = useState<KrossbookingReservation | null>(null);
  const [totalReservationsCurrentYear, setTotalReservationsCurrentYear] = useState(0);
  const [totalNightsCurrentYear, setTotalNightsCurrentYear] = useState(0);
  const [totalGuestsCurrentYear, setTotalGuestsCurrentYear] = useState(0);
  const [occupancyRateCurrentYear, setOccupancyRateCurrentYear] = useState(0);
  const [netPricePerNight, setNetPricePerNight] = useState(0);
  const [loadingKrossbookingStats, setLoadingKrossbookingStats] = useState(true); // Combined loading for Krossbooking related stats
  const [krossbookingStatsError, setKrossbookingStatsError] = useState<string | null>(null);

  const fetchData = async () => {
    // Removed activity data fetching from GSheet here
    // It will now be calculated from Krossbooking reservations in fetchKrossbookingStats

    // Fetch Financial Data and User Profile
    setLoadingFinancialData(true);
    setFinancialDataError(null);
    try {
      const [financialSheetData, userProfile] = await Promise.all([
        callGSheetProxy({ action: 'read_sheet', range: 'C2:F2' }),
        getProfile(),
      ]);

      let currentResultatAnnee = 0;
      if (financialSheetData && financialSheetData.length > 0 && financialSheetData[0].length >= 4) {
        const [vente, rentree, frais, resultat] = financialSheetData[0].map(Number);
        currentResultatAnnee = isNaN(resultat) ? 0 : resultat;

        setFinancialData(prev => ({
          ...prev,
          venteAnnee: isNaN(vente) ? 0 : vente,
          rentreeArgentAnnee: isNaN(rentree) ? 0 : rentree,
          fraisAnnee: isNaN(frais) ? 0 : frais,
          resultatAnnee: currentResultatAnnee,
        }));
      } else {
        setFinancialDataError("Format de données inattendu pour le bilan financier.");
      }

      if (userProfile) {
        const objectiveAmount = userProfile.objective_amount || 0;
        setUserObjectiveAmount(objectiveAmount);

        // Calculate achievement percentage based on 'resultatAnnee' and 'objective_amount'
        const calculatedAchievement = (objectiveAmount === 0) ? 0 : (currentResultatAnnee / objectiveAmount) * 100;
        setFinancialData(prev => ({
          ...prev,
          currentAchievementPercentage: calculatedAchievement,
        }));
      } else {
        setFinancialDataError("Impossible de charger le profil utilisateur.");
      }
    } catch (err: any) {
      setFinancialDataError(`Erreur lors du chargement des données financières ou du profil : ${err.message}`);
      console.error("Error fetching financial data or profile:", err);
    } finally {
      setLoadingFinancialData(false);
    }

    // Fetch Monthly Financial Data
    setLoadingMonthlyFinancialData(true);
    setMonthlyFinancialDataError(null);
    try {
      const data = await callGSheetProxy({ action: 'read_sheet', range: 'BU2:CF5' });
      if (data && data.length >= 4) {
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        const caValues = data[0] || [];
        const montantVerseValues = data[1] || [];
        const fraisValues = data[2] || [];
        const benefValues = data[3] || [];

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
      setMonthlyFinancialDataError(`Erreur lors du chargement des statistiques financières mensuelles : ${err.message}`);
      console.error("Error fetching monthly financial data:", err);
    } finally {
      setLoadingMonthlyFinancialData(false);
    }
  };

  const fetchKrossbookingStats = async () => {
    setLoadingKrossbookingStats(true);
    setKrossbookingStatsError(null);
    try {
      const fetchedUserRooms = await getUserRooms();
      const roomIds = fetchedUserRooms.map(room => room.room_id);

      if (roomIds.length === 0) {
        setNextArrival(null);
        setTotalReservationsCurrentYear(0);
        setTotalNightsCurrentYear(0);
        setTotalGuestsCurrentYear(0);
        setOccupancyRateCurrentYear(0);
        setNetPricePerNight(0);
        setActivityData(DONUT_CATEGORIES.map(cat => ({ ...cat, value: 0 }))); // Reset activity data
        setLoadingKrossbookingStats(false);
        return;
      }

      const allReservations = await fetchKrossbookingReservations(roomIds);
      console.log("DEBUG: Total Krossbooking Reservations fetched:", allReservations.length);
      console.log("DEBUG: Raw Krossbooking Reservations data:", allReservations);

      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize today to start of day for comparison

      const currentYearStart = startOfYear(today);
      const currentYearEnd = endOfYear(today); // Get end of current year
      const daysInCurrentYear = differenceInDays(endOfYear(today), currentYearStart) + 1; // Still need for total available nights

      console.log("DEBUG: Current Year Start (normalized):", format(currentYearStart, 'yyyy-MM-dd'));
      console.log("DEBUG: Current Year End (normalized):", format(currentYearEnd, 'yyyy-MM-dd'));
      console.log("DEBUG: Today (normalized):", format(today, 'yyyy-MM-dd'));

      let nextArrivalCandidate: KrossbookingReservation | null = null;
      let reservationsCount = 0;
      let nightsCount = 0;
      const uniqueGuests = new Set<string>();
      const channelCounts: { [key: string]: number } = {};
      DONUT_CATEGORIES.forEach(cat => channelCounts[cat.name] = 0); // Initialize counts for donut

      allReservations.forEach(res => {
        const checkIn = isValid(parseISO(res.check_in_date)) ? parseISO(res.check_in_date) : null;
        const checkOut = isValid(parseISO(res.check_out_date)) ? parseISO(res.check_out_date) : null;

        if (!checkIn || !checkOut) {
          console.warn(`DEBUG: Skipping reservation ${res.id} due to invalid dates: check_in_date=${res.check_in_date}, check_out_date=${res.check_out_date}`);
          return; // Skip invalid dates
        }

        // Calculate next arrival (today or in the future) - this logic remains separate
        if ((isSameDay(checkIn, today) || isAfter(checkIn, today)) && (!nextArrivalCandidate || isBefore(checkIn, parseISO(nextArrivalCandidate.check_in_date)))) {
          nextArrivalCandidate = res;
        }

        // Condition for "Réservations sur l'année", "Nuits sur l'année" and "Voyageurs sur l'année"
        // A reservation is counted if its check-out date falls within the current calendar year.
        const isRelevantForCurrentYearStats = isWithinInterval(checkOut, { start: currentYearStart, end: currentYearEnd });

        console.log(`DEBUG: Reservation ID: ${res.id}, Guest: ${res.guest_name}, Check-in: ${format(checkIn, 'yyyy-MM-dd')}, Check-out: ${format(checkOut, 'yyyy-MM-dd')}, Status: ${res.status}`);
        console.log(`DEBUG:   isRelevantForCurrentYearStats (check_out in current year): ${isRelevantForCurrentYearStats}`);

        if (isRelevantForCurrentYearStats) {
          reservationsCount++; // Count this reservation for the year
          
          // Add all nights of this booking if its check-out is in the current year
          nightsCount += differenceInDays(checkOut, checkIn);
          console.log(`DEBUG:   Adding all nights (${differenceInDays(checkOut, checkIn)}) for reservation ${res.id}. Total nights so far: ${nightsCount}`);

          if (res.guest_name) {
            uniqueGuests.add(res.guest_name); // Add guest for this reservation
          }
          console.log(`DEBUG:   INCLUDING reservation ${res.id} in total reservations count, nights, and guests.`);

          // Update channel counts for donut chart
          const channel = res.cod_channel || 'UNKNOWN';
          let categoryName = 'Autre'; // Default to 'Autre'

          if (channel === 'AIRBNB') categoryName = 'Airbnb';
          else if (channel === 'BOOKING') categoryName = 'Booking';
          else if (channel === 'ABRITEL') categoryName = 'Abritel';
          else if (channel === 'HELLOKEYS') categoryName = 'Hello Keys';
          else if (channel === 'PROP0' || channel === 'PROPRI' || channel === 'DIRECT') categoryName = 'Proprio'; // Aggregate these

          channelCounts[categoryName]++;
        } else {
          console.log(`DEBUG:   EXCLUDING reservation ${res.id} from current year's stats (check-out not in current calendar year).`);
        }
      });

      setNextArrival(nextArrivalCandidate);
      setTotalReservationsCurrentYear(reservationsCount);
      setTotalNightsCurrentYear(nightsCount);
      setTotalGuestsCurrentYear(uniqueGuests.size);

      console.log("DEBUG: Final totalReservationsCurrentYear (Check-out in current calendar year):", reservationsCount);
      console.log("DEBUG: Final nightsCount for current year (from bookings with check-out in current year):", nightsCount);
      console.log("DEBUG: Final uniqueGuests for current year (from bookings with check-out in current year):", uniqueGuests.size);

      // Update activityData for the donut chart
      const newActivityData = DONUT_CATEGORIES.map(cat => ({
        name: cat.name,
        value: channelCounts[cat.name],
        color: cat.color
      }));
      setActivityData(newActivityData);
      console.log("DEBUG: Donut Activity Data calculated:", newActivityData);

      // Calculate occupancy rate
      const totalAvailableNights = fetchedUserRooms.length * daysInCurrentYear;
      const calculatedOccupancyRate = totalAvailableNights > 0 ? (nightsCount / totalAvailableNights) * 100 : 0;
      setOccupancyRateCurrentYear(calculatedOccupancyRate);

    } catch (err: any) {
      setKrossbookingStatsError(`Erreur lors du chargement des statistiques Krossbooking : ${err.message}`);
      console.error("Error fetching Krossbooking stats:", err);
    } finally {
      setLoadingKrossbookingStats(false);
    }
  };

  useEffect(() => {
    fetchData(); // Fetches GSheet data and profile
    fetchKrossbookingStats(); // Fetches Krossbooking related stats
  }, []);

  // Effect to calculate Net Price Per Night once financialData and totalNightsCurrentYear are available
  useEffect(() => {
    if (!loadingFinancialData && !loadingKrossbookingStats && financialData.resultatAnnee !== undefined && totalNightsCurrentYear > 0) {
      const calculatedNetPricePerNight = financialData.resultatAnnee / totalNightsCurrentYear;
      setNetPricePerNight(calculatedNetPricePerNight);
    } else if (!loadingFinancialData && !loadingKrossbookingStats && totalNightsCurrentYear === 0) {
      setNetPricePerNight(0); // Avoid division by zero if no nights
    }
  }, [financialData.resultatAnnee, totalNightsCurrentYear, loadingFinancialData, loadingKrossbookingStats]);

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
              {loadingKrossbookingStats ? (
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
              ) : krossbookingStatsError ? (
                <Alert variant="destructive">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Erreur de chargement</AlertTitle>
                  <AlertDescription>{krossbookingStatsError}</AlertDescription>
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
              {loadingKrossbookingStats ? (
                <div className="flex flex-col md:flex-row md:items-center md:justify-center md:gap-x-8 w-full">
                  <Skeleton className="w-full md:w-3/5 h-[280px]" />
                  <div className="text-sm space-y-2 mt-4 md:mt-0 md:ml-4 md:w-2/5 flex flex-col items-start">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-4 w-full" />
                    ))}
                  </div>
                </div>
              ) : krossbookingStatsError ? (
                <Alert variant="destructive">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Erreur de chargement</AlertTitle>
                  <AlertDescription>{krossbookingStatsError}</AlertDescription>
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
                    <CartesianGrid strokeDasharray="1 1" className="stroke-gray-200 dark:stroke-gray-700" />
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
                    <Line type="monotone" dataKey="montantVerse" stroke="hsl(var(--secondary))" name="Montant Versé" strokeWidth={3} dot={{ r: 4 }} animationDuration={1500} animationEasing="ease-in-out" />
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
                  <CartesianGrid strokeDasharray="1 1" className="stroke-gray-200 dark:stroke-gray-700" />
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
                  <CartesianGrid strokeDashArray="1 1" className="stroke-gray-200 dark:stroke-gray-700" />
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