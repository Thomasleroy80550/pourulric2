import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { fetchKrossbookingReservations, KrossbookingReservation } from '@/lib/krossbooking';
import { getUserRooms } from '@/lib/user-room-api';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from "@/components/SessionContextProvider";
import BannedUserMessage from "@/components/BannedUserMessage";
import { parseISO, differenceInDays, getMonth, format, getYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Info, Terminal, CheckCircle, CalendarDays, Clock, BedDouble } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MonthlyTaxData {
  month: string;
  monthIndex: number;
  taxableNights: number;
  totalActualTax: number;
  reservations: KrossbookingReservation[];
}

const TouristTaxPage: React.FC = () => {
  const { profile } = useSession();
  const [monthlyData, setMonthlyData] = useState<MonthlyTaxData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState<boolean>(false);
  const [selectedMonthReservations, setSelectedMonthReservations] = useState<KrossbookingReservation[]>([]);
  const [selectedMonthName, setSelectedMonthName] = useState<string>('');
  const isMobile = useIsMobile();

  // Nouveau: paramètre de taxe et overrides manuels
  const [taxPerAdultPerNight, setTaxPerAdultPerNight] = useState<number>(0);
  const [overrides, setOverrides] = useState<Record<string, { adults: number; children: number }>>({});

  const currentMonthIndex = getMonth(new Date());
  const currentYear = getYear(new Date());

  useEffect(() => {
    if (profile?.is_banned) {
      setLoading(false);
      return;
    }

    const loadTaxData = async () => {
      setLoading(true);
      setError(null);
      try {
        const userRooms = await getUserRooms();
        if (userRooms.length === 0) {
          setMonthlyData([]);
          setLoading(false);
          return;
        }

        const bookings = await fetchKrossbookingReservations(userRooms);
        
        const dataByMonth: { [key: number]: { taxableNights: number; totalActualTax: number; reservations: KrossbookingReservation[] } } = {};

        for (let i = 0; i < 12; i++) {
          dataByMonth[i] = { taxableNights: 0, totalActualTax: 0, reservations: [] };
        }

        bookings.forEach(booking => {
          const channel = (booking.cod_channel || 'UNKNOWN').toUpperCase();
          const status = (booking.status || '').toUpperCase();
          const checkInDate = parseISO(booking.check_in_date);

          if (getYear(checkInDate) !== currentYear) {
            return;
          }

          if (channel === 'AIRBNB' || channel === 'BOOKING' || status === 'CANCELLED' || status === 'CANC') {
            return;
          }

          const checkOutDate = parseISO(booking.check_out_date);
          const nights = differenceInDays(checkOutDate, checkInDate);
          const monthIndex = getMonth(checkInDate);

          if (nights > 0 && dataByMonth[monthIndex]) {
            dataByMonth[monthIndex].taxableNights += nights;
            dataByMonth[monthIndex].totalActualTax += (booking.tourist_tax_amount || 0);
            dataByMonth[monthIndex].reservations.push(booking);
          }
        });

        const formattedData = Object.entries(dataByMonth).map(([monthIndex, data]) => {
          const monthName = format(new Date(currentYear, parseInt(monthIndex)), 'MMMM', { locale: fr });
          return {
            month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
            monthIndex: parseInt(monthIndex),
            taxableNights: data.taxableNights,
            totalActualTax: data.totalActualTax,
            reservations: data.reservations,
          };
        });

        setMonthlyData(formattedData);

      } catch (err: any) {
        setError(`Erreur lors du chargement des données de taxe de séjour : ${err.message}`);
        console.error("Error loading tax data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTaxData();
  }, [profile, currentYear]);

  const handleMonthClick = (data: MonthlyTaxData) => {
    setSelectedMonthReservations(data.reservations);
    setSelectedMonthName(data.month);
    setIsDetailDialogOpen(true);
  };

  if (profile?.is_banned) {
    return (
      <MainLayout>
        <BannedUserMessage />
      </MainLayout>
    );
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (isMobile) {
      return (
        <div className="grid grid-cols-1 gap-4">
          {monthlyData.map((data) => {
            const isPastMonth = data.monthIndex < currentMonthIndex;
            const isCurrentMonth = data.monthIndex === currentMonthIndex;
            
            let icon = null;
            if (isPastMonth) icon = <CheckCircle className="h-4 w-4 text-green-600" />;
            else if (isCurrentMonth) icon = <CalendarDays className="h-4 w-4 text-blue-600" />;
            else icon = <Clock className="h-4 w-4 text-gray-500" />;

            return (
              <Card key={data.monthIndex} onClick={() => handleMonthClick(data)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-2">{icon} {data.month}</span>
                    <span className="font-bold text-lg">{data.totalActualTax.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="flex items-center text-muted-foreground">
                    <BedDouble className="h-4 w-4 mr-2" />
                    {data.taxableNights} Nuitées Taxables
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mois</TableHead>
              <TableHead className="text-center">Nombre de Nuitées Taxables</TableHead>
              <TableHead className="text-right">Taxe de Séjour Prévisionnelle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthlyData.map((data) => {
              const isPastMonth = data.monthIndex < currentMonthIndex;
              const isCurrentMonth = data.monthIndex === currentMonthIndex;
              
              let rowClasses = "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800";
              let icon = null;

              if (isPastMonth) {
                rowClasses += " bg-green-50/20 dark:bg-green-900/10";
                icon = <CheckCircle className="h-4 w-4 text-green-600 mr-2" />;
              } else if (isCurrentMonth) {
                rowClasses += " bg-blue-50/20 dark:bg-blue-900/10 font-semibold";
                icon = <CalendarDays className="h-4 w-4 text-blue-600 mr-2" />;
              } else {
                icon = <Clock className="h-4 w-4 text-gray-500 mr-2" />;
              }

              return (
                <TableRow key={data.monthIndex} onClick={() => handleMonthClick(data)} className={rowClasses}>
                  <TableCell className="font-medium flex items-center">
                    {icon}
                    {data.month}
                  </TableCell>
                  <TableCell className="text-center">{data.taxableNights}</TableCell>
                  <TableCell className="text-right font-bold">{data.totalActualTax.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Prévisionnel de Taxe de Séjour</h1>

        <Card className="mb-6 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Paramètre de calcul</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tax-per-adult-night">Taxe par adulte et par nuit (€)</Label>
              <Input
                id="tax-per-adult-night"
                type="number"
                step="0.01"
                placeholder="Ex: 1.50"
                value={taxPerAdultPerNight === 0 ? '' : taxPerAdultPerNight}
                onChange={(e) => setTaxPerAdultPerNight(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Utilisée pour estimer le nombre d'adultes par réservation (les enfants ne paient pas).
              </p>
            </div>
          </CardContent>
        </Card>

        <Alert className="mb-6 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700">
          <Info className="h-4 w-4" />
          <AlertTitle>Information sur le calcul</AlertTitle>
          <AlertDescription>
            Ce tableau présente une estimation de la taxe de séjour à déclarer pour l'année en cours. Le calcul est basé sur le montant de taxe de séjour fourni par Krossbooking pour chaque réservation confirmée, en excluant celles provenant d'Airbnb et Booking.com (qui collectent déjà la taxe). Cliquez sur un mois pour voir le détail des réservations.
          </AlertDescription>
        </Alert>

        <Alert className="mb-6 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700">
          <Info className="h-4 w-4" />
          <AlertTitle>Information sur les données de réservation</AlertTitle>
          <AlertDescription>
            L'API ne fournit pas le nombre d'adultes et d'enfants. Nous estimons les adultes à partir de la taxe par nuit (enfants = 0€) et vous pouvez ajuster manuellement par réservation dans le détail.
          </AlertDescription>
        </Alert>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Déclaration par mois pour l'année en cours</CardTitle>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Détail des réservations pour {selectedMonthName}</DialogTitle>
            <DialogDescription>
              Ajustez les adultes/enfants si nécessaire. Prix/nuit calculé à partir du montant et des nuitées.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            {selectedMonthReservations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arrivée</TableHead>
                    <TableHead>Départ</TableHead>
                    <TableHead className="text-center">Adultes (estimés)</TableHead>
                    <TableHead className="text-center">Enfants</TableHead>
                    <TableHead className="text-right">Prix/nuit</TableHead>
                    <TableHead className="text-right">Taxe de Séjour</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedMonthReservations.map((reservation) => {
                    const checkIn = parseISO(reservation.check_in_date);
                    const checkOut = parseISO(reservation.check_out_date);
                    const nights = Math.max(differenceInDays(checkOut, checkIn), 0);

                    // Parse montant (ex: "123€") -> nombre
                    const rawAmount = (reservation.amount || '').toString().trim();
                    const numericAmount = (() => {
                      const cleaned = rawAmount.replace(/[^\d,.\-]/g, '').replace(',', '.');
                      const parsed = parseFloat(cleaned);
                      return isNaN(parsed) ? 0 : parsed;
                    })();
                    const pricePerNight = nights > 0 ? numericAmount / nights : 0;

                    const totalTax = reservation.tourist_tax_amount || 0;
                    const estimatedAdults = taxPerAdultPerNight > 0 && nights > 0
                      ? Math.max(Math.round(totalTax / (taxPerAdultPerNight * nights)), 0)
                      : 0;

                    const currentOverride = overrides[reservation.id] || { adults: estimatedAdults, children: 0 };

                    return (
                      <TableRow key={reservation.id}>
                        <TableCell>{format(checkIn, 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{format(checkOut, 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min={0}
                            value={currentOverride.adults}
                            onChange={(e) => {
                              const val = Math.max(parseInt(e.target.value || '0', 10) || 0, 0);
                              setOverrides((prev) => ({
                                ...prev,
                                [reservation.id]: { adults: val, children: (prev[reservation.id]?.children ?? 0) }
                              }));
                            }}
                            className="w-20 mx-auto text-center"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min={0}
                            value={currentOverride.children}
                            onChange={(e) => {
                              const val = Math.max(parseInt(e.target.value || '0', 10) || 0, 0);
                              setOverrides((prev) => ({
                                ...prev,
                                [reservation.id]: { adults: (prev[reservation.id]?.adults ?? estimatedAdults), children: val }
                              }));
                            }}
                            className="w-20 mx-auto text-center"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {pricePerNight.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </TableCell>
                        <TableCell className="text-right">
                          {totalTax.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-4">Aucune réservation trouvée pour ce mois.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default TouristTaxPage;