"use client";

import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, ListChecks, ChevronRight, CheckCircle, AlertTriangle, FileText, CalendarDays, Sparkles, Trophy } from "lucide-react";

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
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from 'react-router-dom';
import ObjectiveDialog from "@/components/ObjectiveDialog";
import { getProfile, UserProfile } from "@/lib/profile-api";
import { Skeleton } from '@/components/ui/skeleton';
import { fetchKrossbookingReservations, KrossbookingReservation } from '@/lib/krossbooking';
import { getUserRooms, UserRoom } from '@/lib/user-room-api';
import { parseISO, isAfter, isSameDay, format, isValid, getDaysInYear, isBefore, differenceInDays, getDaysInMonth, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { parse } from 'date-fns';
import ChartFullScreenDialog from '@/components/ChartFullScreenDialog';
import ForecastDialog from '@/components/ForecastDialog';
import { FieryProgressBar } from '@/components/FieryProgressBar';
import { getMyStatements } from '@/lib/statements-api';
import { SavedInvoice } from "@/lib/admin-api";
import CustomChartTooltip from '@/components/CustomChartTooltip';
import { getExpenses, getRecurringExpenses, generateRecurringInstances, Expense } from '@/lib/expenses-api';
import { toast } from 'sonner';
import { useSession } from "@/components/SessionContextProvider";
import BannedUserMessage from "@/components/BannedUserMessage";
import { getReviews, Review } from '@/lib/revyoos-api';
import { getTechnicalReportsByUserId, TechnicalReport } from '@/lib/technical-reports-api';
import { Badge } from "@/components/ui/badge";
import NewYear2026Cinematic from "@/components/NewYear2026Cinematic";
import Countdown from "@/components/Countdown";
import BilanExportButton from "@/components/BilanExportButton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BilanPdfButton from "@/components/BilanPdfButton";
import NewsNotificationsPopup from "@/components/NewsNotificationsPopup";
import DashboardVersionSwitch from "@/components/DashboardVersionSwitch";

// Nouvelle interface pour les tâches à faire
interface TodoTask {
  id: string; // ID unique pour la tâche
  title: string; // Titre principal de la tâche
  description?: string; // Description optionnelle
  link: string; // URL vers laquelle naviguer
  category: 'technical_report' | 'room_setup' | 'hivernage' | 'season_pricing'; // Catégorie de la tâche
  property_name?: string; // Spécifique aux rapports techniques
}

const DONUT_CATEGORIES = [
  { name: 'Airbnb', color: '#FF5A5F' },
  { name: 'Booking', color: '#003580' },
  { name: 'Abritel', color: '#2D60E0' },
  { name: 'Hello Keys', color: '#00A699' },
  { name: 'Proprio', color: '#4f46e5' },
  { name: 'Autre', color: '#6b7280' },
];

// Fenêtre d'affichage pour la notif Bilan 2025
const BILAN_2025_STORAGE_KEY = "bilan2025_notice_dismissed";
const isInBilan2025Window = () => {
  const now = new Date();
  const start = new Date(2025, 0, 4); // 4 janvier 2025
  const end = new Date(2025, 2, 1, 23, 59, 59); // 1er mars 2025 23:59:59
  return now >= start && now <= end;
};

// REMOVED: test switch / simulated error boundary UI on DashboardPage

const DashboardPage = () => {
  const { profile } = useSession();

  const currentYear = new Date().getFullYear();
  const [showBilanNotice, setShowBilanNotice] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const yearLabel = selectedYear === currentYear ? 'Année en cours' : String(selectedYear);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const [activityData, setActivityData] = useState(
    DONUT_CATEGORIES.map(cat => ({ ...cat, value: 0 }))
  );

  const [financialData, setFinancialData] = useState({
    caAnnee: 0,
    rentreeArgentAnnee: 0,
    fraisAnnee: 0,
    depensesAnnee: 0,
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
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const [isChartDialogOpen, setIsChartDialogOpen] = useState(false);

  const [dialogChartData, setDialogChartData] = useState<any[]>([]);
  const [dialogChartType, setDialogChartType] = useState<'line' | 'bar'>('line');
  const [dialogChartTitle, setDialogChartTitle] = useState('');
  const [dialogChartDataKeys, setDialogChartDataKeys] = useState<{ key: string; name: string; color: string; }[]>([]);
  const [dialogChartYAxisUnit, setDialogChartYAxisUnit] = useState<string | undefined>(undefined);

  const [isForecastDialogOpen, setIsForecastDialogOpen] = useState(false);
  const [forecastAmount, setForecastAmount] = useState(0); // Ensured this line is present and correct
  const [expensesModuleEnabled, setExpensesModuleEnabled] = useState(false);

  const [todoTasks, setTodoTasks] = useState<TodoTask[]>([]); // Type mis à jour
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);

  // Nouvel état pour le meilleur mois
  const [bestMonth, setBestMonth] = useState<{
    name: string;
    benefit: number;
    ca: number;
    reservations: number;
  } | null>(null);
  const showComparisonTo2025 = selectedYear !== 2025;
  const [hiddenFinancialKeys, setHiddenFinancialKeys] = useState<string[]>([]);
  const [hiddenReservationKeys, setHiddenReservationKeys] = useState<string[]>([]);
  const [hiddenOccupancyKeys, setHiddenOccupancyKeys] = useState<string[]>([]);

  // ADD: function to build monthly rows for PDF from state
  const buildMonthlyForPdf = () => {
    // match month names with monthlyFinancialData.name
    // We also need nights and reservations by month:
    const nightsByMonth: Record<string, number> = {};
    const reservationsByMonth: Record<string, number> = {};
    monthlyOccupancyData.forEach((m, idx) => {
      // monthlyNights isn't exposed; reconstruct approximate nights via occupancy and availability?
      // Instead, use monthlyFinancialData's benef + prixParNuit already computed:
      // For PDF, we display benef and prixParNuit (already computed), and carry reservations from monthlyReservationsData.
      // Nights: we cannot reconstruct exact nights unless stored; set 0 if not available in state.
      nightsByMonth[m.name] = 0;
    });
    monthlyReservationsData.forEach(m => {
      reservationsByMonth[m.name] = m.reservations || 0;
    });

    return monthlyFinancialData.map(m => ({
      name: m.name,
      ca: m.ca || 0,
      montantVerse: m.montantVerse || 0,
      frais: m.frais || 0,
      benef: m.benef || 0,
      nuits: nightsByMonth[m.name] || 0,
      reservations: reservationsByMonth[m.name] || 0,
      prixParNuit: m.prixParNuit || 0,
    }));
  };

  useEffect(() => {
    const dismissed = localStorage.getItem(BILAN_2025_STORAGE_KEY);
    if (!dismissed) {
      setShowBilanNotice(true);
    }
  }, []);

  const handleDismissBilanNotice = () => {
    setShowBilanNotice(false);
    localStorage.setItem(BILAN_2025_STORAGE_KEY, "1");
  };

  const handleOpenBilanPopup = () => {
    // Ouvre la popup globale
    window.dispatchEvent(new Event('open-bilan-2025-notice'));
  };

  const openChartDialog = (data: any[], type: 'line' | 'bar', title: string, dataKeys: { key: string; name: string; color: string; }[], yAxisUnit?: string) => {
    setDialogChartData(data);
    setDialogChartType(type);
    setDialogChartTitle(title);
    setDialogChartDataKeys(dataKeys);
    setDialogChartYAxisUnit(yAxisUnit);
    setIsChartDialogOpen(true);
  };

  const toggleLegendKey = (
    key: string,
    hiddenKeys: string[],
    setHiddenKeys: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setHiddenKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const renderInteractiveLegend = (
    hiddenKeys: string[],
    setHiddenKeys: React.Dispatch<React.SetStateAction<string[]>>
  ) => ({ payload }: any) => {
    if (!payload?.length) return null;

    return (
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
        {payload.map((entry: any) => {
          const key = entry.dataKey;
          const isHidden = hiddenKeys.includes(key);

          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleLegendKey(key, hiddenKeys, setHiddenKeys)}
              className={`inline-flex items-center gap-2 rounded-md px-2 py-1 transition-opacity ${isHidden ? 'opacity-40' : 'opacity-100'}`}
              title={isHidden ? 'Afficher la série' : 'Masquer la série'}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.value}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const financialLegendContent = renderInteractiveLegend(hiddenFinancialKeys, setHiddenFinancialKeys);
  const reservationLegendContent = renderInteractiveLegend(hiddenReservationKeys, setHiddenReservationKeys);
  const occupancyLegendContent = renderInteractiveLegend(hiddenOccupancyKeys, setHiddenOccupancyKeys);

  const buildYearlyMetrics = (statements: SavedInvoice[], year: number, userRooms: UserRoom[], expenses: Expense[]) => {
    const statementsForYear = statements.filter(s => s.period.includes(year.toString()));

    let totalCA = 0;
    let totalRentree = 0;
    let totalFrais = 0;
    let totalNights = 0;
    let totalGuests = 0;
    let totalReservations = 0;
    const totalDepenses = expenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);
    let totalResultat = 0;

    const channelCounts: { [key: string]: number } = {};
    DONUT_CATEGORIES.forEach(cat => channelCounts[cat.name.toLowerCase()] = 0);

    const monthsOfYear = eachMonthOfInterval({
      start: startOfMonth(new Date(year, 0, 1)),
      end: endOfMonth(new Date(year, 11, 1)),
    });

    const monthlyFinancialData = monthsOfYear.map(m => ({
      name: format(m, 'MMM', { locale: fr }),
      ca: 0,
      montantVerse: 0,
      frais: 0,
      benef: 0,
      depenses: 0,
      prixParNuit: 0,
    }));
    const monthlyReservationsData = monthsOfYear.map(m => ({ name: format(m, 'MMM', { locale: fr }), reservations: 0 }));
    const monthlyNights = Array(12).fill(0);

    const monthMapFallback: { [key: string]: number } = {
      'janvier': 0, 'février': 1, 'fevrier': 1, 'mars': 2, 'avril': 3, 'mai': 4,
      'juin': 5, 'juillet': 6, 'août': 7, 'aout': 7, 'septembre': 8, 'octobre': 9,
      'novembre': 10, 'décembre': 11, 'decembre': 11
    };

    statementsForYear.forEach(s => {
      const invoiceData = Array.isArray(s.invoice_data) ? s.invoice_data : [];
      const statementCA = s.totals.totalCA ?? invoiceData.reduce((acc, item) => acc + (item.prixSejour || 0) + (item.fraisMenage || 0) + (item.taxeDeSejour || 0), 0);
      const managementFees = s.totals.totalFacture || 0;
      const moneyIn = s.totals.totalMontantVerse || 0;
      const netFromStatement = moneyIn - managementFees;

      totalCA += statementCA;
      totalRentree += moneyIn;
      totalFrais += managementFees;
      totalResultat += netFromStatement;
      totalNights += s.totals.totalNuits || 0;
      totalGuests += s.totals.totalVoyageurs || 0;
      totalReservations += s.totals.totalReservations ?? invoiceData.length;

      let monthIndex: number | undefined;
      let parsed = parse(s.period, 'MMMM yyyy', new Date(), { locale: fr });
      if (!isValid(parsed)) {
        parsed = parse(s.period, 'MMM yyyy', new Date(), { locale: fr });
      }
      if (isValid(parsed)) {
        monthIndex = parsed.getMonth();
      } else {
        const monthName = s.period.toLowerCase().split(' ')[0].replace('.', '');
        monthIndex = monthMapFallback[monthName];
      }

      if (monthIndex !== undefined) {
        monthlyFinancialData[monthIndex].ca += statementCA;
        monthlyFinancialData[monthIndex].montantVerse += moneyIn;
        monthlyFinancialData[monthIndex].frais += managementFees;
        monthlyFinancialData[monthIndex].benef += netFromStatement;

        const reservationsCount = (s.totals && typeof s.totals.totalReservations === 'number')
          ? s.totals.totalReservations
          : invoiceData.length;
        monthlyReservationsData[monthIndex].reservations += reservationsCount;

        monthlyNights[monthIndex] += s.totals.totalNuits || 0;
      }

      invoiceData.forEach(resa => {
        const portail = resa.portail.toLowerCase();
        if (portail.includes('airbnb')) channelCounts['airbnb']++;
        else if (portail.includes('booking')) channelCounts['booking']++;
        else if (portail.includes('abritel')) channelCounts['abritel']++;
        else if (portail.includes('hello keys')) channelCounts['hello keys']++;
        else if (portail.includes('proprio')) channelCounts['proprio']++;
        else channelCounts['autre']++;
      });
    });

    expenses.forEach(exp => {
      const expenseDate = parseISO(exp.expense_date);
      if (isValid(expenseDate) && expenseDate.getFullYear() === year) {
        const monthIndex = expenseDate.getMonth();
        if (monthIndex >= 0 && monthIndex < 12) {
          monthlyFinancialData[monthIndex].depenses += exp.amount;
        }
      }
    });

    monthlyFinancialData.forEach((monthData, index) => {
      monthData.benef -= monthData.depenses;
      const nights = monthlyNights[index] || 0;
      monthData.prixParNuit = nights > 0 ? monthData.benef / nights : 0;
    });

    const monthlyOccupancyData = monthsOfYear.map((m, index) => {
      const daysInMonth = getDaysInMonth(m);
      const totalAvailableNightsInMonth = userRooms.length * daysInMonth;
      const occupation = totalAvailableNightsInMonth > 0 ? (monthlyNights[index] / totalAvailableNightsInMonth) * 100 : 0;
      return { name: format(m, 'MMM', { locale: fr }), occupation };
    });

    let bestMonthOfYear: { name: string; benefit: number; ca: number; reservations: number } | null = null;
    monthlyFinancialData.forEach((monthData, index) => {
      if (monthData.benef > 0) {
        if (!bestMonthOfYear || monthData.benef > bestMonthOfYear.benefit) {
          bestMonthOfYear = {
            name: monthData.name,
            benefit: monthData.benef,
            ca: monthData.ca,
            reservations: monthlyReservationsData[index].reservations,
          };
        }
      }
    });

    return {
      totalCA,
      totalRentree,
      totalFrais,
      totalDepenses,
      totalResultat,
      totalNights,
      totalGuests,
      totalReservations,
      monthlyFinancialData,
      monthlyReservationsData,
      monthlyOccupancyData,
      activityData: DONUT_CATEGORIES.map(cat => ({
        ...cat,
        value: channelCounts[cat.name.toLowerCase()] || 0,
      })),
      bestMonth: bestMonthOfYear,
    };
  };

  const processStatements = (statements: SavedInvoice[], year: number, userRooms: UserRoom[], expenses: Expense[]) => {
    const selectedMetrics = buildYearlyMetrics(statements, year, userRooms, expenses);
    const comparisonMetrics = showComparisonTo2025
      ? buildYearlyMetrics(statements, 2025, userRooms, [])
      : null;

    const mergedMonthlyFinancialData = selectedMetrics.monthlyFinancialData.map((month, index) => ({
      ...month,
      ca2025: comparisonMetrics?.monthlyFinancialData[index]?.ca ?? null,
    }));

    const mergedMonthlyReservationsData = selectedMetrics.monthlyReservationsData.map((month, index) => ({
      ...month,
      reservations2025: comparisonMetrics?.monthlyReservationsData[index]?.reservations ?? null,
    }));

    const mergedMonthlyOccupancyData = selectedMetrics.monthlyOccupancyData.map((month, index) => ({
      ...month,
      occupation2025: comparisonMetrics?.monthlyOccupancyData[index]?.occupation ?? null,
    }));

    setBestMonth(selectedMetrics.bestMonth);
    setFinancialData(prev => ({
      ...prev,
      caAnnee: selectedMetrics.totalCA,
      rentreeArgentAnnee: selectedMetrics.totalRentree,
      fraisAnnee: selectedMetrics.totalFrais,
      depensesAnnee: selectedMetrics.totalDepenses,
      resultatAnnee: selectedMetrics.totalResultat - selectedMetrics.totalDepenses,
    }));
    setTotalNightsCurrentYear(selectedMetrics.totalNights);
    setTotalReservationsCurrentYear(selectedMetrics.totalReservations);
    setTotalGuestsCurrentYear(selectedMetrics.totalGuests);
    setMonthlyFinancialData(mergedMonthlyFinancialData);
    setMonthlyReservationsData(mergedMonthlyReservationsData);
    setMonthlyOccupancyData(mergedMonthlyOccupancyData);
    setActivityData(selectedMetrics.activityData);

    return { totalNights: selectedMetrics.totalNights };
  };

  const fetchData = useCallback(async () => {
    setLoadingFinancialData(true);
    setFinancialDataError(null);
    setLoadingKrossbookingStats(true);
    setKrossbookingStatsError(null);
    setLoadingTasks(true);
    setTasksError(null);

    try {
      const userProfile = await getProfile();
      if (userProfile) {
        setExpensesModuleEnabled(userProfile.expenses_module_enabled || false);
      } else {
        const errorMsg = "Impossible de charger le profil utilisateur.";
        setFinancialDataError(errorMsg);
        setKrossbookingStatsError(errorMsg);
        setTasksError(errorMsg);
        setLoadingFinancialData(false);
        setLoadingKrossbookingStats(false);
        setLoadingTasks(false);
        return;
      }

      let allExpenses: Expense[] = [];
      if (userProfile?.expenses_module_enabled) {
        const [singleExpenses, recurringTemplates] = await Promise.all([
          getExpenses(selectedYear),
          getRecurringExpenses()
        ]);
        const recurringInstances = generateRecurringInstances(recurringTemplates, selectedYear);
        allExpenses = [...singleExpenses, ...recurringInstances];
      }

      const [statements, fetchedUserRooms, reviews, technicalReports] = await Promise.all([
        getMyStatements(),
        getUserRooms(),
        getReviews(userProfile.revyoos_holding_ids),
        getTechnicalReportsByUserId(userProfile.id)
      ]);

      let allTodoTasks: TodoTask[] = [];

      // Ajouter les rapports techniques en attente
      const pendingTechnicalReports: TodoTask[] = technicalReports
        .filter(report => report.status === 'pending_owner_action' && !report.is_archived)
        .map(report => ({
          id: report.id,
          title: report.title,
          link: `/reports/${report.id}`,
          category: 'technical_report',
          property_name: report.property_name,
        }));
      allTodoTasks = allTodoTasks.concat(pendingTechnicalReports);

      // Vérifier si des informations de logement sont incomplètes
      let hasIncompleteRooms = false;
      if (fetchedUserRooms.length === 0) {
        hasIncompleteRooms = true; // Si aucun logement n'est enregistré, la configuration est requise
      } else {
        for (const room of fetchedUserRooms) {
          // Définir ce qui rend un logement incomplet (champs clés manquants)
          if (
            !room.property_type || room.property_type.trim() === '' ||
            !room.keybox_code || room.keybox_code.trim() === '' ||
            !room.wifi_code || room.wifi_code.trim() === '' ||
            !room.arrival_instructions || room.arrival_instructions.trim() === '' ||
            !room.house_rules || room.house_rules.trim() === ''
          ) {
            hasIncompleteRooms = true;
            break; // Au moins un logement est incomplet, pas besoin de vérifier les autres
          }
        }
      }

      if (hasIncompleteRooms) {
        allTodoTasks.push({
          id: 'room-info-incomplete',
          title: 'Complétez les informations de vos logements',
          description: 'Certains de vos logements ont des informations manquantes. Veuillez les renseigner pour une gestion optimale.',
          link: '/my-rooms',
          category: 'room_setup',
        });
      }

      // Ajouter Hivernage et Saison 2026 comme actions requises
      allTodoTasks.push({
        id: 'hivernage-2026',
        title: "Envoyer mes consignes d'hivernage",
        description: "Fermeture du 4 au 11 janvier. Chauffage, eau, réfrigérateur, linge, volets...",
        link: '/hivernage-2026',
        category: 'hivernage',
      });
      allTodoTasks.push({
        id: 'season-2026-config',
        title: "Configurer mes prix Saison 2026",
        description: "Saisissez vos prix par périodes et envoyez votre demande (une par logement et par année).",
        link: '/season-2026',
        category: 'season_pricing',
      });

      setTodoTasks(allTodoTasks); // Mettre à jour l'état avec toutes les tâches

      const { totalNights } = processStatements(statements, selectedYear, fetchedUserRooms, allExpenses);

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

      // Calculate average rating
      if (reviews && reviews.length > 0) {
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        setAverageRating(totalRating / reviews.length);
      } else {
        setAverageRating(null);
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

      const totalDaysInSelectedYear = getDaysInYear(new Date(selectedYear, 0, 1));
      const totalAvailableNightsInYear = fetchedUserRooms.length * totalDaysInSelectedYear;
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
      setTasksError(errorMsg);
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoadingFinancialData(false);
      setLoadingKrossbookingStats(false);
      setLoadingTasks(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    if (!profile?.is_banned) {
      fetchData();
    }
  }, [fetchData, profile]);

  useEffect(() => {
    setHiddenFinancialKeys([]);
    setHiddenReservationKeys([]);
    setHiddenOccupancyKeys([]);
  }, [selectedYear, showComparisonTo2025]);

  // Removed the useEffect that starts the dashboard tour automatically

  const handleShowForecast = () => {
    if (selectedYear !== currentYear) {
      toast.error("La prévision n'est disponible que pour l'année en cours.");
      return;
    }
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

  // REMOVED: notificationItems (les actions sont désormais dans 'Mes actions requises')

  if (profile?.is_banned) {
    return (
      <MainLayout>
        <BannedUserMessage />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <NewsNotificationsPopup />
      <div
        className="relative mx-auto w-full max-w-[100vw] box-border px-2 sm:px-4 py-4 sm:py-6 overflow-x-hidden break-words"
        ref={dashboardRef}
      >
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Bonjour 👋</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Nous sommes le {format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p>
          </div>
          <DashboardVersionSwitch />
        </div>
        <div className="mb-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Version actuelle</p>
        </div>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">Année:</span>
            <Tabs
              value={selectedYear === currentYear ? 'current' : '2025'}
              onValueChange={(val) => setSelectedYear(val === 'current' ? currentYear : 2025)}
            >
              <TabsList className="flex gap-1 bg-transparent p-0 border-0 shadow-none">
                <TabsTrigger
                  value="2025"
                  className="px-1.5 py-0.5 text-xs bg-transparent rounded-none border-b border-transparent text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:border-foreground"
                >
                  2025
                </TabsTrigger>
                <TabsTrigger
                  value="current"
                  className="px-1.5 py-0.5 text-xs bg-transparent rounded-none border-b border-transparent text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:border-foreground"
                >
                  Année en cours ({currentYear})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <Badge variant="secondary">{yearLabel}</Badge>
          {selectedYear === 2025 && (
            <BilanPdfButton
              payload={{
                clientName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Client',
                year: selectedYear,
                yearlyTotals: {
                  totalCA: financialData.caAnnee,
                  totalMontantVerse: financialData.rentreeArgentAnnee,
                  totalFacture: financialData.fraisAnnee,
                  net: financialData.rentreeArgentAnnee - financialData.fraisAnnee,
                  adr: totalNightsCurrentYear > 0 ? financialData.caAnnee / totalNightsCurrentYear : 0,
                  revpar: totalNightsCurrentYear > 0 ? (financialData.caAnnee / totalNightsCurrentYear) * (occupancyRateCurrentYear / 100) : 0,
                  yearlyOccupation: occupancyRateCurrentYear,
                  totalNuits: totalNightsCurrentYear,
                  totalReservations: totalReservationsCurrentYear,
                  totalVoyageurs: totalGuestsCurrentYear,
                },
                monthly: monthlyFinancialData.map((month, index) => ({
                  month: month.name,
                  totalCA: month.ca || 0,
                  occupation: monthlyOccupancyData[index]?.occupation || 0,
                })),
              }}
              className="ml-2"
            />
          )}
        </div>
        
        {/* Notif box BILAN 2025 */}
        {/* REMOVED: Notif BILAN 2025 */}

        {/* Bloc Cinématique Bonne Année 2026 */}
        {/* REMOVED: Bloc Cinématique Bonne Année 2026 */}

        {/* To-Do List Card */}
        {selectedYear !== 2025 && (
          <div className="mt-6">
            <Card id="tour-todo-list" className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center">
                  <ListChecks className="mr-2 h-5 w-5" />
                  Mes actions requises
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTasks ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : tasksError ? (
                  <Alert variant="destructive">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Erreur de chargement</AlertTitle>
                    <AlertDescription>{tasksError}</AlertDescription>
                  </Alert>
                ) : todoTasks.length > 0 ? (
                  <ul className="space-y-2">
                    {todoTasks.map(task => (
                      <li key={task.id}>
                        <Link to={task.link} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full">
                          <div>
                            <p className="font-medium text-sm">{task.title}</p>
                            {task.property_name && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">{task.property_name}</p>
                            )}
                            {task.description && !task.property_name && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">{task.description}</p>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                    <CheckCircle className="mx-auto h-10 w-10 text-green-500 mb-2" />
                    <p className="font-semibold">Vous êtes à jour !</p>
                    <p className="text-sm">Aucune action n'est requise de votre part.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* REMOVED: Bloc Nouveautés (public) qui affichait <NewsFeedPublic /> */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 w-full max-w-full">

          {/* Bilan Financier Card */}
          <Card id="tour-financial-summary" className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Bilan Financier — {yearLabel}</CardTitle>
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
                      <p className="text-xl md:text-2xl font-bold text-blue-600">{financialData.caAnnee.toFixed(2)}€</p>
                      <p className="text-sm text-gray-500">CA sur l'année</p>
                    </div>
                    <div className="flex flex-col items-start">
                      <p className="text-xl md:text-2xl font-bold text-orange-600">{financialData.rentreeArgentAnnee.toFixed(2)}€</p>
                      <p className="text-sm text-gray-500">Rentré d'argent sur l'année</p>
                    </div>
                    <div className="flex flex-col items-start">
                      <p className="text-xl md:text-2xl font-bold text-red-600">{financialData.fraisAnnee.toFixed(2)}€</p>
                      <p className="text-sm text-gray-500">Frais de gestion</p>
                    </div>
                    {expensesModuleEnabled && (
                      <div className="flex flex-col items-start">
                        <p className="text-xl md:text-2xl font-bold text-red-600">{financialData.depensesAnnee.toFixed(2)}€</p>
                        <p className="text-sm text-gray-500">Autres dépenses</p>
                      </div>
                    )}
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-500">Résultat net sur l'année</p>
                    <p className="text-2xl font-bold text-green-600">{financialData.resultatAnnee.toFixed(2)}€</p>
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
              <CardTitle className="text-lg font-semibold">Activité de Location — {yearLabel}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingKrossbookingStats || loadingFinancialData || loadingReviews ? (
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
              ) : krossbookingStatsError || financialDataError || reviewsError ? (
                <Alert variant="destructive">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Erreur de chargement</AlertTitle>
                  <AlertDescription>{krossbookingStatsError || financialDataError || reviewsError}</AlertDescription>
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
                      <p className="text-xl font-bold">
                        {averageRating !== null ? `${averageRating.toFixed(1)}/5` : 'N/A'}
                      </p>
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
              <CardTitle className="text-lg font-semibold">Activité de Location — {yearLabel}</CardTitle>
              {selectedYear === 2025 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Pour 2025, nous ajoutons des statistiques agrégées sans détail par plateforme.
                  Le graphique ne peut donc pas indiquer quelle plateforme a le mieux fonctionné.
                </p>
              )}
            </CardHeader>
            <CardContent className="flex flex-col p-4 h-[320px] w-full max-w-full">
              {loadingFinancialData ? (
                <div className="flex flex-col md:flex-row md:items-center md:justify-center md:gap-x-8 w-full">
                  <Skeleton className="w-full md:w-3/5 h-[280px]" />
                  <div className="text-sm space-y-2 mt-4 md:mt-0 md:ml-4 md:w-2/5 w-full max-w-full flex flex-col items-start break-words">
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
                    <div className="text-sm space-y-2 mt-4 md:mt-0 md:ml-4 md:w-2/5 w-full max-w-full flex flex-col items-start break-words">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 w-full max-w-full">
          {/* Statistiques Financières Mensuelles Card */}
          <Card id="tour-monthly-financials" className="shadow-md">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-semibold">Finances Mensuelles — {yearLabel}</CardTitle>
                {showComparisonTo2025 && <Badge variant="secondary">Comparé à 2025</Badge>}
              </div>
              <Button variant="outline" size="sm" onClick={() => openChartDialog(
                monthlyFinancialData,
                'line',
                'Statistiques Financières Mensuelles',
                [
                  { key: 'ca', name: 'CA', color: 'hsl(var(--primary))' },
                  ...(showComparisonTo2025 ? [{ key: 'ca2025', name: 'CA 2025', color: '#94a3b8' }] : []),
                  { key: 'montantVerse', name: 'Montant Versé', color: '#FACC15' },
                  { key: 'frais', name: 'Frais', color: 'hsl(var(--destructive))' },
                  { key: 'benef', name: 'Bénéfice', color: '#22c55e' },
                  ...(expensesModuleEnabled ? [{ key: 'depenses', name: 'Autres Dépenses', color: '#9333EA' }] : []),
                  { key: 'prixParNuit', name: 'Prix / nuit', color: '#0ea5e9' },
                ],
                '€'
              )}>
                Agrandir
              </Button>
            </CardHeader>
            <CardContent className="h-72">
              {loadingFinancialData ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyFinancialData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorBenef" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis dataKey="name" className="text-xs text-gray-600 dark:text-gray-400" tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" className="text-xs text-gray-600 dark:text-gray-400" tickLine={false} axisLine={false} tickFormatter={(value) => `€${value}`} />
                    <YAxis yAxisId="right" orientation="right" className="text-xs text-gray-600 dark:text-gray-400" tickLine={false} axisLine={false} tickFormatter={(value) => `€${value}`} />
                    <Tooltip content={<CustomChartTooltip formatter={(value) => `${value.toFixed(2)}€`} />} />
                    <Legend content={financialLegendContent} />
                    <Line type="monotone" yAxisId="left" dataKey="ca" stroke="hsl(var(--primary))" name="CA" strokeWidth={2} dot={false} animationDuration={1500} animationEasing="ease-in-out" hide={hiddenFinancialKeys.includes('ca')} />
                    {showComparisonTo2025 && (
                      <Line type="monotone" yAxisId="left" dataKey="ca2025" stroke="#94a3b8" name="CA 2025" strokeWidth={2} dot={false} strokeDasharray="6 4" animationDuration={1500} animationEasing="ease-in-out" hide={hiddenFinancialKeys.includes('ca2025')} />
                    )}
                    <Line type="monotone" yAxisId="left" dataKey="montantVerse" stroke="#FACC15" name="Montant Versé" strokeWidth={2} dot={false} animationDuration={1500} animationEasing="ease-in-out" hide={hiddenFinancialKeys.includes('montantVerse')} />
                    <Line type="monotone" yAxisId="left" dataKey="frais" stroke="hsl(var(--destructive))" name="Frais" strokeWidth={2} dot={false} animationDuration={1500} animationEasing="ease-in-out" hide={hiddenFinancialKeys.includes('frais')} />
                    {expensesModuleEnabled && (
                      <Line type="monotone" yAxisId="left" dataKey="depenses" stroke="#9333EA" name="Autres Dépenses" strokeWidth={2} dot={false} animationDuration={1500} animationEasing="ease-in-out" hide={hiddenFinancialKeys.includes('depenses')} />
                    )}
                    <Line type="monotone" yAxisId="right" dataKey="prixParNuit" stroke="#0ea5e9" name="Prix / nuit" strokeWidth={2} dot={false} strokeDasharray="3 3" animationDuration={1500} animationEasing="ease-in-out" hide={hiddenFinancialKeys.includes('prixParNuit')} />
                    <Area type="monotone" yAxisId="left" dataKey="benef" stroke="#22c55e" fillOpacity={1} fill="url(#colorBenef)" name="Bénéfice" strokeWidth={3} animationDuration={1500} animationEasing="ease-in-out" hide={hiddenFinancialKeys.includes('benef')} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Réservation / mois Card */}
          <Card className="shadow-md">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-semibold">Réservations / mois — {yearLabel}</CardTitle>
                {showComparisonTo2025 && <Badge variant="secondary">Comparé à 2025</Badge>}
              </div>
              <Button variant="outline" size="sm" onClick={() => openChartDialog(
                monthlyReservationsData,
                'bar',
                'Réservations par mois',
                [
                  { key: 'reservations', name: 'Réservations', color: '#8b5cf6' },
                  ...(showComparisonTo2025 ? [{ key: 'reservations2025', name: 'Réservations 2025', color: '#cbd5e1' }] : []),
                ]
              )}>
                Agrandir
              </Button>
            </CardHeader>
            <CardContent className="h-72">
              {loadingFinancialData ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyReservationsData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
                    <Legend content={reservationLegendContent} />
                    {showComparisonTo2025 && (
                      <Bar dataKey="reservations2025" fill="#cbd5e1" name="Réservations 2025" radius={[4, 4, 0, 0]} animationDuration={1500} animationEasing="ease-in-out" hide={hiddenReservationKeys.includes('reservations2025')} />
                    )}
                    <Bar dataKey="reservations" fill="url(#colorReservations)" name="Réservations" radius={[4, 4, 0, 0]} animationDuration={1500} animationEasing="ease-in-out" hide={hiddenReservationKeys.includes('reservations')} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Occupation Mensuelle Card */}
          <Card className="shadow-md">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-semibold">Taux d'Occupation — {yearLabel}</CardTitle>
                {showComparisonTo2025 && <Badge variant="secondary">Comparé à 2025</Badge>}
              </div>
              <Button variant="outline" size="sm" onClick={() => openChartDialog(
                monthlyOccupancyData,
                'line',
                'Taux d\'Occupation Mensuel',
                [
                  { key: 'occupation', name: 'Occupation', color: '#14b8a6' },
                  ...(showComparisonTo2025 ? [{ key: 'occupation2025', name: 'Occupation 2025', color: '#94a3b8' }] : []),
                ],
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
                  <ComposedChart data={monthlyOccupancyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
                    <Legend content={occupancyLegendContent} />
                    <Area type="monotone" dataKey="occupation" stroke="#14b8a6" fill="url(#colorOccupation)" name="Occupation" strokeWidth={2} animationDuration={1500} animationEasing="ease-in-out" hide={hiddenOccupancyKeys.includes('occupation')} />
                    {showComparisonTo2025 && (
                      <Line type="monotone" dataKey="occupation2025" stroke="#94a3b8" name="Occupation 2025" strokeWidth={2} dot={false} strokeDasharray="6 4" animationDuration={1500} animationEasing="ease-in-out" hide={hiddenOccupancyKeys.includes('occupation2025')} />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Card className="shadow-md bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-800">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center">
                <Trophy className="mr-2 h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                Meilleur mois de l'année — {yearLabel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingFinancialData ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-1/3" />
                  <div className="grid grid-cols-3 gap-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </div>
              ) : financialDataError ? (
                <Alert variant="destructive">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Erreur de chargement</AlertTitle>
                  <AlertDescription>{financialDataError}</AlertDescription>
                </Alert>
              ) : bestMonth ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">
                      {bestMonth.name}
                    </div>
                    <Sparkles className="h-6 w-6 text-yellow-500 dark:text-yellow-400" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Bénéfice net</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {bestMonth.benefit.toFixed(2)}€
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Chiffre d'affaires</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {bestMonth.ca.toFixed(2)}€
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Réservations</p>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {bestMonth.reservations}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    🏆 Ce mois a généré le meilleur bénéfice net de l'année
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Aucun mois avec bénéfice positif cette année
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
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
        year={selectedYear}
      />
    </MainLayout>
  );
};

export default DashboardPage;