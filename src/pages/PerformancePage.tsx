import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, AreaChart, Area, ComposedChart } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, TrendingUp, BedDouble, Users, CalendarDays, Euro, Wallet, Star } from 'lucide-react';
import { getMyStatements } from '@/lib/statements-api';
import { getUserRooms } from '@/lib/user-room-api';
import { getExpenses, getRecurringExpenses, generateRecurringInstances } from '@/lib/expenses-api';
import { format, eachMonthOfInterval, startOfMonth, endOfMonth, getDaysInMonth, getDaysInYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import ChartFullScreenDialog from '@/components/ChartFullScreenDialog';
import { Button } from '@/components/ui/button';
import CustomChartTooltip from '@/components/CustomChartTooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StrategyTab from '@/components/StrategyTab';

const PerformanceDashboard = () => {
  const currentYear = new Date().getFullYear();
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for KPIs
  const [totalRevenues, setTotalRevenues] = useState(0);
  const [totalNetProfit, setTotalNetProfit] = useState(0);
  const [occupancyRateYear, setOccupancyRateYear] = useState(0);
  const [averageRating, setAverageRating] = useState('4.7 / 5'); // Hardcoded for now
  const [revPar, setRevPar] = useState(0);
  const [adr, setAdr] = useState(0);
  const [netRevenuePerNight, setNetRevenuePerNight] = useState(0);
  const [avgStayDuration, setAvgStayDuration] = useState(0);
  const [avgGuestsPerReservation, setAvgGuestsPerReservation] = useState(0);

  // State for Charts
  const [monthlyFinancialData, setMonthlyFinancialData] = useState<any[]>([]);
  const [monthlyReservationsData, setMonthlyReservationsData] = useState<any[]>([]);
  const [monthlyOccupancyData, setMonthlyOccupancyData] = useState<any[]>([]);

  // State for Dialog
  const [isChartDialogOpen, setIsChartDialogOpen] = useState(false);
  const [dialogChartData, setDialogChartData] = useState<any[]>([]);
  const [dialogChartType, setDialogChartType] = useState<'line' | 'bar'>('line');
  const [dialogChartTitle, setDialogChartTitle] = useState('');
  const [dialogChartDataKeys, setDialogChartDataKeys] = useState<{ key: string; name: string; color: string; }[]>([]);
  const [dialogChartYAxisUnit, setDialogChartYAxisUnit] = useState<string | undefined>(undefined);

  const openChartDialog = (data: any[], type: 'line' | 'bar', title: string, dataKeys: { key: string; name: string; color: string; }[], yAxisUnit?: string) => {
    setDialogChartData(data);
    setDialogChartType(type);
    setDialogChartTitle(title);
    setDialogChartDataKeys(dataKeys);
    setDialogChartYAxisUnit(yAxisUnit);
    setIsChartDialogOpen(true);
  };

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    setError(null);
    try {
      const [statements, userRooms, singleExpenses, recurringExpensesRaw] = await Promise.all([
        getMyStatements(),
        getUserRooms(),
        getExpenses(currentYear),
        getRecurringExpenses(),
      ]);

      const recurringInstances = generateRecurringInstances(recurringExpensesRaw, currentYear);
      const allExpenses = [...singleExpenses, ...recurringInstances];
      const totalOtherExpenses = allExpenses.reduce((acc, expense) => acc + expense.amount, 0);

      const statementsForYear = statements.filter(s => s.period.includes(currentYear.toString()));

      const monthsOfYear = eachMonthOfInterval({
        start: startOfMonth(new Date(currentYear, 0, 1)),
        end: endOfMonth(new Date(currentYear, 11, 1)),
      });
      const monthFrToNum: { [key: string]: number } = { 'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5, 'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11 };
      
      const newMonthlyFinancialData = monthsOfYear.map(m => ({ name: format(m, 'MMM', { locale: fr }), ca: 0, montantVerse: 0, frais: 0, depenses: 0, benef: 0 }));
      const newMonthlyReservationsData = monthsOfYear.map(m => ({ name: format(m, 'MMM', { locale: fr }), reservations: 0 }));
      const monthlyNights = Array(12).fill(0);
      const monthlyExpenses = Array(12).fill(0);

      allExpenses.forEach(expense => {
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

      statementsForYear.forEach(s => {
        const statementCA = s.totals.totalCA ?? s.invoice_data.reduce((itemAcc, item) => itemAcc + (item.prixSejour || 0) + (item.fraisMenage || 0) + (item.taxeDeSejour || 0), 0);
        totalCA += statementCA;

        // Corrected calculation for net revenue from statement
        const statementNetToPay = (s.totals.totalMontantVerse || 0) - (s.totals.totalFacture || 0);
        totalNetRevenueFromStatements += statementNetToPay;

        const statementNights = s.totals.totalNuits || 0;
        totalNightsSold += statementNights;

        const statementReservations = s.totals.totalReservations ?? s.invoice_data.length;
        totalReservations += statementReservations;

        const statementGuests = s.invoice_data.reduce((acc, item) => acc + (item.voyageurs || 0), 0);
        totalGuests += statementGuests;

        const periodParts = s.period.toLowerCase().split(' ');
        const monthName = periodParts[0];
        const monthIndex = monthFrToNum[monthName];

        if (monthIndex !== undefined) {
          newMonthlyFinancialData[monthIndex].ca += statementCA;
          newMonthlyFinancialData[monthIndex].montantVerse += s.totals.totalMontantVerse || 0;
          newMonthlyFinancialData[monthIndex].frais += s.totals.totalFacture || 0; // Use totalFacture for fees
          newMonthlyFinancialData[monthIndex].benef += statementNetToPay;
          
          newMonthlyReservationsData[monthIndex].reservations += statementReservations;
          monthlyNights[monthIndex] += statementNights;
        }
      });

      newMonthlyFinancialData.forEach((monthData, index) => {
        monthData.depenses = monthlyExpenses[index];
        monthData.benef -= monthlyExpenses[index];
      });

      setTotalRevenues(totalCA);
      setTotalNetProfit(totalNetRevenueFromStatements - totalOtherExpenses);

      const totalDaysInYear = getDaysInYear(new Date(currentYear, 0, 1));
      const totalAvailableNightsInYear = userRooms.length * totalDaysInYear;

      const calculatedOccupancyRateYear = totalAvailableNightsInYear > 0 ? (totalNightsSold / totalAvailableNightsInYear) * 100 : 0;
      setOccupancyRateYear(calculatedOccupancyRateYear);

      const calculatedRevPar = totalAvailableNightsInYear > 0 ? totalCA / totalAvailableNightsInYear : 0;
      setRevPar(calculatedRevPar);

      const calculatedAdr = totalNightsSold > 0 ? totalCA / totalNightsSold : 0;
      setAdr(calculatedAdr);

      const calculatedNetRevenuePerNight = totalNightsSold > 0 ? totalNetRevenueFromStatements / totalNightsSold : 0;
      setNetRevenuePerNight(calculatedNetRevenuePerNight);

      const calculatedAvgStayDuration = totalReservations > 0 ? totalNightsSold / totalReservations : 0;
      setAvgStayDuration(calculatedAvgStayDuration);

      const calculatedAvgGuestsPerReservation = totalReservations > 0 ? totalGuests / totalReservations : 0;
      setAvgGuestsPerReservation(calculatedAvgGuestsPerReservation);

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
      console.error("Error fetching performance data:", err);
    } finally {
      setLoadingData(false);
    }
  }, [currentYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <>
      {error && (
        <Alert variant="destructive" className="mb-6">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loadingData ? (
        <div className="space-y-8">
          {Array.from({ length: 3 }).map((_, sectionIndex) => (
            <div key={sectionIndex}>
              <Skeleton className="h-8 w-72 mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, cardIndex) => <Skeleton key={cardIndex} className="h-32 w-full" />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Vue d'ensemble ({currentYear})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2"><Euro className="h-5 w-5 text-gray-500" />Chiffre d'Affaires</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">{totalRevenues.toFixed(2)}€</p>
                  <p className="text-sm text-gray-500">Total brut payé par les voyageurs</p>
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2"><Wallet className="h-5 w-5 text-gray-500" />Bénéfice Net</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-700">{totalNetProfit.toFixed(2)}€</p>
                  <p className="text-sm text-gray-500">Après frais et dépenses</p>
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-gray-500" />Taux d'Occupation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-600">{occupancyRateYear.toFixed(2)}%</p>
                  <p className="text-sm text-gray-500">Moyenne sur l'année</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Indicateurs de Rentabilité</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2"><BedDouble className="h-5 w-5 text-gray-500" />RevPAR</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-indigo-600">{revPar.toFixed(2)}€</p>
                  <p className="text-sm text-gray-500">Revenu par logement disponible</p>
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2"><Euro className="h-5 w-5 text-gray-500" />Prix Moyen / Nuit (ADR)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-purple-600">{adr.toFixed(2)}€</p>
                  <p className="text-sm text-gray-500">Tarif moyen par nuitée vendue</p>
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2"><Euro className="h-5 w-5 text-gray-500" />Revenu Net / Nuit</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-teal-600">{netRevenuePerNight.toFixed(2)}€</p>
                  <p className="text-sm text-gray-500">Revenu par nuit (avant dépenses)</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Statistiques des Réservations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2"><CalendarDays className="h-5 w-5 text-gray-500" />Durée Moy. Séjour</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-orange-600">{avgStayDuration.toFixed(1)} <span className="text-xl">nuits</span></p>
                  <p className="text-sm text-gray-500">Nuits par réservation</p>
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5 text-gray-500" />Voyageurs / Réservation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-pink-600">{avgGuestsPerReservation.toFixed(1)}</p>
                  <p className="text-sm text-gray-500">Moyenne par réservation</p>
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2"><Star className="h-5 w-5 text-gray-500" />Note Moyenne</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-yellow-600">{averageRating}</p>
                  <p className="text-sm text-gray-500">Basé sur les avis clients</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      <div className="mt-10">
        <h2 className="text-2xl font-semibold mb-4">Tendances sur l'année ({currentYear})</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-md lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Finances Mensuelles</CardTitle>
              <Button variant="outline" size="sm" onClick={() => openChartDialog( monthlyFinancialData, 'line', 'Statistiques Financières Mensuelles', [ { key: 'ca', name: 'CA', color: 'hsl(var(--primary))' }, { key: 'montantVerse', name: 'Montant Versé', color: '#FACC15' }, { key: 'frais', name: 'Frais Plateforme', color: 'hsl(var(--destructive))' }, { key: 'depenses', name: 'Autres Dépenses', color: '#f97316' }, { key: 'benef', name: 'Bénéfice Net', color: '#22c55e' }, ], '€' )}>
                Agrandir
              </Button>
            </CardHeader>
            <CardContent className="h-80">
              {loadingData ? ( <Skeleton className="h-full w-full" /> ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyFinancialData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorBenefPerf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis dataKey="name" className="text-xs text-gray-600 dark:text-gray-400" tickLine={false} axisLine={false} />
                    <YAxis unit="€" className="text-xs text-gray-600 dark:text-gray-400" tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(value) => `${value.toFixed(2)}€`} />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="ca" stroke="hsl(var(--primary))" name="CA" strokeWidth={2} dot={false} animationDuration={1500} animationEasing="ease-in-out" />
                    <Line type="monotone" dataKey="montantVerse" stroke="#FACC15" name="Montant Versé" strokeWidth={2} dot={false} animationDuration={1500} animationEasing="ease-in-out" />
                    <Line type="monotone" dataKey="frais" stroke="hsl(var(--destructive))" name="Frais Plateforme" strokeWidth={2} dot={false} animationDuration={1500} animationEasing="ease-in-out" />
                    <Line type="monotone" dataKey="depenses" stroke="#f97316" name="Autres Dépenses" strokeWidth={2} dot={false} animationDuration={1500} animationEasing="ease-in-out" />
                    <Area type="monotone" dataKey="benef" stroke="#22c55e" fillOpacity={1} fill="url(#colorBenefPerf)" name="Bénéfice Net" strokeWidth={3} animationDuration={1500} animationEasing="ease-in-out" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Réservations / mois</CardTitle>
              <Button variant="outline" size="sm" onClick={() => openChartDialog( monthlyReservationsData, 'bar', 'Réservations par mois', [{ key: 'reservations', name: 'Réservations', color: '#8b5cf6' }] )}>
                Agrandir
              </Button>
            </CardHeader>
            <CardContent className="h-72">
              {loadingData ? ( <Skeleton className="h-full w-full" /> ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyReservationsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorReservationsPerf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" className="text-xs text-gray-600 dark:text-gray-400" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} className="text-xs text-gray-600 dark:text-gray-400" tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="reservations" fill="url(#colorReservationsPerf)" name="Réservations" radius={[4, 4, 0, 0]} animationDuration={1500} animationEasing="ease-in-out" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Taux d'Occupation</CardTitle>
              <Button variant="outline" size="sm" onClick={() => openChartDialog( monthlyOccupancyData, 'line', 'Taux d\'Occupation Mensuel', [{ key: 'occupation', name: 'Occupation', color: '#14b8a6' }], '%' )}>
                Agrandir
              </Button>
            </CardHeader>
            <CardContent className="h-72">
              {loadingData ? ( <Skeleton className="h-full w-full" /> ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyOccupancyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorOccupationPerf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis dataKey="name" className="text-xs text-gray-600 dark:text-gray-400" tickLine={false} axisLine={false} />
                    <YAxis unit="%" className="text-xs text-gray-600 dark:text-gray-400" tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(value) => `${value.toFixed(2)}%`} />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area type="monotone" dataKey="occupation" stroke="#14b8a6" fill="url(#colorOccupationPerf)" name="Occupation" strokeWidth={2} animationDuration={1500} animationEasing="ease-in-out" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
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
    </>
  );
}

const PerformancePage: React.FC = () => {
  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-8">Tableau de Bord des Performances</h1>
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto text-center">
            <TabsTrigger value="dashboard">Tableau de Bord</TabsTrigger>
            <TabsTrigger value="strategy">Stratégie</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="mt-6">
            <PerformanceDashboard />
          </TabsContent>
          <TabsContent value="strategy">
            <StrategyTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default PerformancePage;