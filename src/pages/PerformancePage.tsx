import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, AreaChart, Area, ComposedChart } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { getMyStatements } from '@/lib/statements-api';
import { SavedInvoice } from '@/lib/admin-api';
import { getUserRooms, UserRoom } from '@/lib/user-room-api';
import { format, parseISO, isSameMonth, startOfMonth, endOfMonth, eachMonthOfInterval, differenceInDays, getDaysInMonth, getDaysInYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import ChartFullScreenDialog from '@/components/ChartFullScreenDialog';
import { Button } from '@/components/ui/button';
import CustomChartTooltip from '@/components/CustomChartTooltip';

const PerformancePage: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [totalRevenues, setTotalRevenues] = useState(0);
  const [occupancyRateYear, setOccupancyRateYear] = useState(0);
  const [averageRating, setAverageRating] = useState('4.7 / 5'); // Hardcoded for now

  const [monthlyFinancialData, setMonthlyFinancialData] = useState<any[]>([]);
  const [monthlyReservationsData, setMonthlyReservationsData] = useState<any[]>([]);
  const [monthlyOccupancyData, setMonthlyOccupancyData] = useState<any[]>([]);

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
      const [statements, userRooms] = await Promise.all([
        getMyStatements(),
        getUserRooms(),
      ]);

      const statementsForYear = statements.filter(s => s.period.includes(currentYear.toString()));

      // Calculate Total Revenues (CA)
      const totalCA = statementsForYear.reduce((acc, s) => {
        const statementCA = s.totals.totalCA ?? s.invoice_data.reduce((itemAcc, item) => itemAcc + (item.prixSejour || 0) + (item.fraisMenage || 0) + (item.taxeDeSejour || 0), 0);
        return acc + statementCA;
      }, 0);
      setTotalRevenues(totalCA);

      // Calculate Monthly Financial, Reservations, and Occupancy Data
      const monthsOfYear = eachMonthOfInterval({
        start: startOfMonth(new Date(currentYear, 0, 1)),
        end: endOfMonth(new Date(currentYear, 11, 1)),
      });

      const monthFrToNum: { [key: string]: number } = { 'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5, 'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11 };
      
      const newMonthlyFinancialData = monthsOfYear.map(m => ({ name: format(m, 'MMM', { locale: fr }), ca: 0, montantVerse: 0, frais: 0, benef: 0 }));
      const newMonthlyReservationsData = monthsOfYear.map(m => ({ name: format(m, 'MMM', { locale: fr }), reservations: 0 }));
      const monthlyNights = Array(12).fill(0);
      let totalNightsForYear = 0;

      statementsForYear.forEach(s => {
        totalNightsForYear += s.totals.totalNuits || 0;

        const periodParts = s.period.toLowerCase().split(' ');
        const monthName = periodParts[0];
        const monthIndex = monthFrToNum[monthName];

        if (monthIndex !== undefined) {
          const statementCA = s.totals.totalCA ?? s.invoice_data.reduce((acc, item) => acc + (item.prixSejour || 0) + (item.fraisMenage || 0) + (item.taxeDeSejour || 0), 0);
          const statementNetToPay = (s.totals.totalMontantVerse || 0) - (s.totals.totalTaxeDeSejour || 0) - (s.totals.totalFraisMenage || 0) - (s.totals.totalCommission || 0);
          
          newMonthlyFinancialData[monthIndex].ca += statementCA;
          newMonthlyFinancialData[monthIndex].montantVerse += s.totals.totalMontantVerse || 0;
          newMonthlyFinancialData[monthIndex].frais += s.totals.totalCommission || 0;
          newMonthlyFinancialData[monthIndex].benef += statementNetToPay;
          
          newMonthlyReservationsData[monthIndex].reservations += s.invoice_data.length;
          monthlyNights[monthIndex] += s.totals.totalNuits || 0;
        }
      });

      const newMonthlyOccupancyData = monthsOfYear.map((m, index) => {
        const daysInMonth = getDaysInMonth(m);
        const totalAvailableNightsInMonth = userRooms.length * daysInMonth;
        const occupation = totalAvailableNightsInMonth > 0 ? (monthlyNights[index] / totalAvailableNightsInMonth) * 100 : 0;
        return { name: format(m, 'MMM', { locale: fr }), occupation };
      });

      setMonthlyFinancialData(newMonthlyFinancialData);
      setMonthlyReservationsData(newMonthlyReservationsData);
      setMonthlyOccupancyData(newMonthlyOccupancyData);

      // Set overall Occupancy Rate for the year
      const totalDaysInYear = getDaysInYear(new Date(currentYear, 0, 1));
      const totalAvailableNightsInYear = userRooms.length * totalDaysInYear;
      const calculatedOccupancyRateYear = totalAvailableNightsInYear > 0 ? (totalNightsForYear / totalAvailableNightsInYear) * 100 : 0;
      setOccupancyRateYear(calculatedOccupancyRateYear);

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
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Performances</h1>
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {loadingData ? (
            <>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </>
          ) : (
            <>
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Chiffre d'Affaires ({currentYear})</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">{totalRevenues.toFixed(2)}€</p>
                  <p className="text-sm text-gray-500">Total brut payé par les voyageurs</p>
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Taux d'Occupation ({currentYear})</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-600">{occupancyRateYear.toFixed(2)}%</p>
                  <p className="text-sm text-gray-500">Moyenne sur l'année</p>
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Note Moyenne</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-yellow-600">{averageRating}</p>
                  <p className="text-sm text-gray-500">Basé sur les avis clients</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Statistiques Financières Mensuelles Card */}
          <Card className="shadow-md">
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
              {loadingData ? (
                <Skeleton className="h-full w-full" />
              ) : (
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
                    <Line type="monotone" dataKey="frais" stroke="hsl(var(--destructive))" name="Frais" strokeWidth={2} dot={false} animationDuration={1500} animationEasing="ease-in-out" />
                    <Area type="monotone" dataKey="benef" stroke="#22c55e" fillOpacity={1} fill="url(#colorBenefPerf)" name="Bénéfice" strokeWidth={3} animationDuration={1500} animationEasing="ease-in-out" />
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
              {loadingData ? (
                <Skeleton className="h-full w-full" />
              ) : (
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
              {loadingData ? (
                <Skeleton className="h-full w-full" />
              ) : (
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
    </MainLayout>
  );
};

export default PerformancePage;