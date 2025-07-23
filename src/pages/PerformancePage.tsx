import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { getMyStatements } from '@/lib/statements-api';
import { SavedInvoice } from '@/lib/admin-api';
import { getUserRooms } from '@/lib/user-room-api';
import { format, parseISO, isSameMonth, startOfMonth, endOfMonth, eachMonthOfInterval, differenceInDays, getDaysInMonth, getDaysInYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import ChartFullScreenDialog from '@/components/ChartFullScreenDialog';
import { Button } from '@/components/ui/button';

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

      // Calculate Total Revenues
      const totalRevenuGenere = statementsForYear.reduce((acc, s) => acc + (s.totals.totalRevenuGenere || 0), 0);
      setTotalRevenues(totalRevenuGenere);

      // Calculate Monthly Financial, Reservations, and Occupancy Data
      const monthsOfYear = eachMonthOfInterval({
        start: startOfMonth(new Date(currentYear, 0, 1)),
        end: endOfMonth(new Date(currentYear, 11, 1)),
      });

      const monthFrToNum: { [key: string]: number } = { 'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5, 'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11 };
      
      const newMonthlyFinancialData = monthsOfYear.map(m => ({ name: format(m, 'MMM', { locale: fr }), ca: 0, montantVerse: 0, frais: 0, benef: 0 }));
      const newMonthlyReservationsData = monthsOfYear.map(m => ({ name: format(m, 'MMM', { locale: fr }), reservations: 0 }));
      const newMonthlyOccupancyData = monthsOfYear.map(m => ({ name: format(m, 'MMM', { locale: fr }), occupation: 0 }));
      let totalNightsForYear = 0;

      statementsForYear.forEach(s => {
        const periodMonthStr = s.period.split(' ')[0].toLowerCase();
        const monthIndex = monthFrToNum[periodMonthStr];
        if (monthIndex !== undefined) {
          const netToPay = (s.totals.totalMontantVerse || 0) - (s.totals.totalTaxeDeSejour || 0) - (s.totals.totalFraisMenage || 0) - (s.totals.totalCommission || 0);
          newMonthlyFinancialData[monthIndex].ca += s.totals.totalRevenuGenere || 0;
          newMonthlyFinancialData[monthIndex].montantVerse += s.totals.totalMontantVerse || 0;
          newMonthlyFinancialData[monthIndex].frais += s.totals.totalCommission || 0;
          newMonthlyFinancialData[monthIndex].benef += netToPay;
          newMonthlyReservationsData[monthIndex].reservations += s.invoice_data.length;

          let occupiedNightsInMonth = 0;
          s.invoice_data.forEach(resa => {
            const nights = differenceInDays(parseISO(resa.depart), parseISO(resa.arrivee));
            occupiedNightsInMonth += nights > 0 ? nights : 0;
            totalNightsForYear += nights > 0 ? nights : 0;
          });

          const daysInCurrentMonth = getDaysInMonth(new Date(currentYear, monthIndex, 1));
          const totalAvailableNightsInMonth = userRooms.length * daysInCurrentMonth;
          newMonthlyOccupancyData[monthIndex].occupation = totalAvailableNightsInMonth > 0 ? (occupiedNightsInMonth / totalAvailableNightsInMonth) * 100 : 0;
        }
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
                  <CardTitle className="text-lg font-semibold">Revenus Totaux ({currentYear})</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">{totalRevenues.toFixed(2)}€</p>
                  <p className="text-sm text-gray-500">Total des ventes sur l'année</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Statistiques Financières Mensuelles Card */}
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Statistiques Financières Mensuelles</CardTitle>
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
                  <LineChart data={monthlyFinancialData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} isAnimationActive={true}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis dataKey="name" className="text-sm text-gray-600 dark:text-gray-400" />
                    <YAxis unit="€" className="text-sm text-gray-600 dark:text-gray-400" />
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

          {/* Réservation / mois Card */}
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Réservations par mois</CardTitle>
              <Button variant="outline" size="sm" onClick={() => openChartDialog(
                monthlyReservationsData,
                'bar',
                'Réservations par mois',
                [{ key: 'reservations', name: 'Réservations', color: 'hsl(var(--accent))' }]
              )}>
                Agrandir
              </Button>
            </CardHeader>
            <CardContent className="h-72">
              {loadingData ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyReservationsData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} isAnimationActive={true}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis dataKey="name" className="text-sm text-gray-600 dark:text-gray-400" />
                    <YAxis allowDecimals={false} className="text-sm text-gray-600 dark:text-gray-400" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Legend />
                    <Bar dataKey="reservations" fill="hsl(var(--accent))" name="Réservations" animationDuration={1500} animationEasing="ease-in-out" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Occupation Mensuelle Card */}
          <Card className="shadow-md col-span-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Taux d'Occupation Mensuel</CardTitle>
              <Button variant="outline" size="sm" onClick={() => openChartDialog(
                monthlyOccupancyData,
                'line',
                'Taux d\'Occupation Mensuel',
                [{ key: 'occupation', name: 'Occupation', color: 'hsl(var(--secondary))' }],
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
                  <LineChart data={monthlyOccupancyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} isAnimationActive={true}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis dataKey="name" className="text-sm text-gray-600 dark:text-gray-400" />
                    <YAxis unit="%" className="text-sm text-gray-600 dark:text-gray-400" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => `${value.toFixed(2)}%`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="occupation" stroke="hsl(var(--secondary))" name="Occupation" strokeWidth={3} dot={{ r: 4 }} animationDuration={1500} animationEasing="ease-in-out" />
                  </LineChart>
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