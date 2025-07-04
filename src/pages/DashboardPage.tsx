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
import { parseISO, isAfter, isSameDay, format, differenceInDays, startOfYear, endOfYear, isBefore, isValid, max, min } from 'date-fns'; // Added max, min
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
      const periodStart = currentYearStart;
      const periodEnd = today; // Data up to today

      const daysInCurrentYearToDate = differenceInDays(periodEnd, periodStart) + 1; // Number of days from Jan 1st to today

      console.log("DEBUG: Current Year Start (normalized):", format(currentYearStart, 'yyyy-MM-dd'));
      console.log("DEBUG: Period End (normalized):", format(periodEnd, 'yyyy-MM-dd'));
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

        // Determine if the reservation overlaps with the current year-to-date period
        // Overlap condition: (start1 <= end2) AND (end1 >= start2)
        const overlapsWithPeriod = checkIn <= periodEnd && checkOut >= periodStart;

        console.log(`DEBUG: Reservation ID: ${res.id}, Guest: ${res.guest_name}, Check-in: ${format(checkIn, 'yyyy-MM-dd')}, Check-out: ${format(checkOut, 'yyyy-MM-dd')}, Status: ${res.status}`);
        console.log(`DEBUG:   overlapsWithPeriod: ${overlapsWithPeriod}`);

        if (overlapsWithPeriod) {
          reservationsCount++; // Count this reservation if it overlaps with the year-to-date period

          // Calculate nights *within* the current year-to-date period
          const effectiveCheckIn = max([checkIn, periodStart]);
          const effectiveCheckOut = min([checkOut, periodEnd]);

          // Ensure effectiveCheckOut is not before effectiveCheckIn for night calculation
          if (effectiveCheckOut > effectiveCheckIn) {
            nightsCount += differenceInDays(effectiveCheckOut, effectiveCheckIn);
          } else if (isSameDay(effectiveCheckIn, effectiveCheckOut)) {
            // If it's a 0-night stay (check-in and check-out on same day) and it falls within the period,
            // it doesn't add to nightsCount as differenceInDays would be 0. This is correct.
          }

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
          console.log(`DEBUG:   EXCLUDING reservation ${res.id} from current year's stats (no overlap with year-to-date period).`);
        }
      });

      setNextArrival(nextArrivalCandidate);
      setTotalReservationsCurrentYear(reservationsCount);
      setTotalNightsCurrentYear(nightsCount);
      setTotalGuestsCurrentYear(uniqueGuests.size);

      console.log("DEBUG: Final totalReservationsCurrentYear (overlapping with year-to-date):", reservationsCount);
      console.log("DEBUG: Final nightsCount for current year (within year-to-date period):", nightsCount);
      console.log("DEBUG: Final uniqueGuests for current year (from bookings overlapping year-to-date):", uniqueGuests.size);

      // Update activityData for the donut chart
      const newActivityData = DONUT_CATEGORIES.map(cat => ({
        name: cat.name,
        value: channelCounts[cat.name],
        color: cat.color
      }));
      setActivityData(newActivityData);
      console.log("DEBUG: Donut Activity Data calculated:", newActivityData);

      // Calculate occupancy rate based on days up to today
      const totalAvailableNightsInPeriod = fetchedUserRooms.length * daysInCurrentYearToDate;
      const calculatedOccupancyRate = totalAvailableNightsInPeriod > 0 ? (nightsCount / totalAvailableNightsInPeriod) * 100 : 0;
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
                      <p className="text-xl md:text-2xl font-bold text-green-600">{financialData.resultatAnadescription="Correction de la logique de calcul des statistiques d'activité de location (réservations, nuits, voyageurs, taux d'occupation) et du graphique en beignet pour afficher les données du 1er janvier de l'année en cours jusqu'à la date d'aujourd'hui."}