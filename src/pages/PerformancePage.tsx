import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { callGSheetProxy } from '@/lib/gsheets';
import { fetchKrossbookingReservations, KrossbookingReservation } from '@/lib/krossbooking';
import { getUserRooms, UserRoom } from '@/lib/user-room-api';
import { format, parseISO, isSameMonth, startOfMonth, endOfMonth, eachMonthOfInterval, differenceInDays, getDaysInMonth, getDaysInYear, isWithinInterval, max, min } from 'date-fns';
import { fr } from 'date-fns/locale';
import ChartFullScreenDialog from '@/components/ChartFullScreenDialog';
import { Button } from '@/components/ui/button'; // Added import for Button

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
      const [
        financialSheetData,
        monthlyFinancialSheetData,
        userRooms,
        allReservations,
        totalNightsCurrentYearData,
      ] = await Promise.all([
        callGSheetProxy({ action: 'read_sheet', range: 'C2' }), // Vente Année
        callGSheetProxy({ action: 'read_sheet', range: 'BU2:CF5' }), // Monthly CA, Montant Versé, Frais, Bénéfice
        getUserRooms(),
        fetchKrossbookingReservations([]), // Fetch all reservations for calculations
        callGSheetProxy({ action: 'read_sheet', range: 'L2' }), // Total Nights for current year
      ]);

      // Set Total Revenues
      if (financialSheetData && financialSheetData.length > 0 && financialSheetData[0].length > 0) {
        setTotalRevenues(Number(financialSheetData[0][0]) || 0);
      } else {
        setError(prev => prev ? prev + " Format de données inattendu pour les revenus totaux." : "Format de données inattendu pour les revenus totaux.");
      }

      // Set Monthly Financial Data
      if (monthlyFinancialSheetData && monthlyFinancialSheetData.length >= 4) {
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        const caValues = monthlyFinancialSheetData[0] || [];
        const montantVerseValues = monthlyFinancialSheetData[1] || [];
        const fraisValues = monthlyFinancialData[2] || [];
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
        setError(prev => prev ? prev + " Format de données inattendu pour les statistiques financières mensuelles." : "Format de données inattendu pour les statistiques financières mensuelles.");
      }

      // Calculate Monthly Reservations and Monthly Occupancy
      const monthsOfYear = eachMonthOfInterval({
        start: startOfMonth(new Date(currentYear, 0, 1)),
        end: endOfMonth(new Date(currentYear, 11, 1)),
      });

      const newMonthlyReservationsData: any[] = [];
      const newMonthlyOccupancyData: any[] = [];

      monthsOfYear.forEach(month => {
        const monthName = format(month, 'MMM', { locale: fr });
        let reservationsCount = 0;
        let totalOccupiedNightsInMonth = 0;
        const daysInCurrentMonth = getDaysInMonth(month);
        const totalAvailableNightsInMonth = userRooms.length * daysInCurrentMonth;

        allReservations.forEach(res => {
          const checkIn = isValid(parseISO(res.check_in_date)) ? parseISO(res.check_in_date) : null;
          const checkOut = isValid(parseISO(res.check_out_date)) ? parseISO(res.check_out_date) : null;

          if (!checkIn || !checkOut || res.status === 'CANC') return; // Skip invalid dates or cancelled reservations

          // For monthly reservations count
          if (isSameMonth(checkIn, month)) {
            reservationsCount++;
          }

          // For monthly occupancy calculation
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);

          const overlapStart = max([checkIn, monthStart]);
          const overlapEnd = min([checkOut, monthEnd]);

          if (overlapStart < overlapEnd) {
            totalOccupiedNightsInMonth += differenceInDays(overlapEnd, overlapStart);
          }
        });

        newMonthlyReservationsData.push({ name: monthName, reservations: reservationsCount });
        const calculatedOccupancy = totalAvailableNightsInMonth > 0 ? (totalOccupiedNightsInMonth / totalAvailableNightsInMonth) * 100 : 0;
        newMonthlyOccupancyData.push({ name: monthName, occupation: calculatedOccupancy });
      });

      setMonthlyReservationsData(newMonthlyReservationsData);
      setMonthlyOccupancyData(newMonthlyOccupancyData);

      // Set overall Occupancy Rate for the year
      if (totalNightsCurrentYearData && totalNightsCurrentYearData.length > 0 && totalNightsCurrentYearData[0].length > 0) {
        const totalNights = Number(totalNightsCurrentYearData[0][0]) || 0;
        const totalDaysInYear = getDaysInYear(new Date(currentYear, 0, 1));
        const totalAvailableNightsInYear = userRooms.length * totalDaysInYear;
        const calculatedOccupancyRateYear = totalAvailableNightsInYear > 0 ? (totalNights / totalAvailableNightsInYear) * 100 : 0;
        setOccupancyRateYear(calculatedOccupancyRateYear);
      } else {
        setError(prev => prev ? prev + " Format de données inattendu pour les nuits totales de l'année." : "Format de données inattendu pour les nuits totales de l'année.");
      }

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