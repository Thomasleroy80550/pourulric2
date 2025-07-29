import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { fetchKrossbookingReservations, KrossbookingReservation } from '@/lib/krossbooking'; // Import KrossbookingReservation
import { getUserRooms, UserRoom } from '@/lib/user-room-api';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from "@/components/SessionContextProvider";
import BannedUserMessage from "@/components/BannedUserMessage";
import { parseISO, differenceInDays, getMonth, format, getYear } from 'date-fns'; // Import getYear
import { fr } from 'date-fns/locale';
import { Info, Terminal } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'; // Import Dialog components
import clsx from 'clsx'; // Import clsx for conditional class names

interface MonthlyTaxData {
  month: string;
  monthIndex: number;
  taxableNights: number;
  totalActualTax: number;
  reservations: KrossbookingReservation[]; // Add reservations for detail view
}

const TouristTaxPage: React.FC = () => {
  const { profile } = useSession();
  const [monthlyData, setMonthlyData] = useState<MonthlyTaxData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState<boolean>(false);
  const [selectedMonthReservations, setSelectedMonthReservations] = useState<KrossbookingReservation[]>([]);
  const [selectedMonthName, setSelectedMonthName] = useState<string>('');

  const currentMonthIndex = new Date().getMonth(); // 0-indexed (Jan=0, Dec=11)
  const currentYear = new Date().getFullYear();

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

          // Filter by current year
          if (getYear(checkInDate) !== currentYear) {
            return;
          }

          // Exclure les réservations Airbnb, Booking.com et les réservations annulées
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
          const monthName = format(new Date(currentYear, parseInt(monthIndex)), 'MMMM', { locale: fr }); // Use currentYear for date
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
  }, [profile]);

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

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Prévisionnel de Taxe de Séjour</h1>

        <Alert className="mb-6 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700">
          <Info className="h-4 w-4" />
          <AlertTitle>Information sur le calcul</AlertTitle>
          <AlertDescription>
            Ce tableau présente une estimation de la taxe de séjour à déclarer pour l'année en cours. Le calcul est basé sur le montant de taxe de séjour fourni par Krossbooking pour chaque réservation confirmée, en excluant celles provenant d'Airbnb et Booking.com (qui collectent déjà la taxe). Cliquez sur un mois pour voir le détail des réservations.
          </AlertDescription>
        </Alert>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Déclaration par mois pour l'année en cours</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
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
                    {monthlyData.map((data) => (
                      <TableRow 
                        key={data.monthIndex} 
                        onClick={() => handleMonthClick(data)} 
                        className={clsx(
                          "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800",
                          {
                            "past-month": data.monthIndex < currentMonthIndex,
                          }
                        )}
                      >
                        <TableCell className="font-medium">{data.month}</TableCell>
                        <TableCell className="text-center">{data.taxableNights}</TableCell>
                        <TableCell className="text-right font-bold">{data.totalActualTax.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Détail des réservations pour {selectedMonthName}</DialogTitle>
            <DialogDescription>
              Voici les réservations incluses dans le calcul de la taxe de séjour pour ce mois.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            {selectedMonthReservations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Propriété</TableHead>
                    <TableHead>Arrivée</TableHead>
                    <TableHead>Départ</TableHead>
                    <TableHead className="text-right">Taxe de Séjour</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedMonthReservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell>{reservation.guest_name}</TableCell>
                      <TableCell>{reservation.property_name}</TableCell>
                      <TableCell>{format(parseISO(reservation.check_in_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{format(parseISO(reservation.check_out_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right">
                        {(reservation.tourist_tax_amount || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </TableCell>
                    </TableRow>
                  ))}
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