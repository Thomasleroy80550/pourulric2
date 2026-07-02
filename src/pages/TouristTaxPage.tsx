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
import { parseISO, differenceInDays, getMonth, format, getYear, parse, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Info, Terminal, CheckCircle, CalendarDays, Clock, BedDouble } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { getMyStatements } from '@/lib/statements-api';

interface MonthlyTaxData {
  month: string;
  monthIndex: number;
  taxableNights: number;
  totalActualTax: number;
  reservations: KrossbookingReservation[];
}

// Paramètres fixes pour le calcul proportionnel
const PROPORTIONAL_RATE_PCT = 5;            // 5% du coût HT par occupant et par nuit
const ADDITIONAL_TAX_PCT = 10;              // +10% de taxe additionnelle (conseil départemental de la Somme)
const MAX_DECLARED_PERSONS = 8;             // Nb max d'occupants testés pour la répartition adultes/enfants

// Taux effectif appliqué par le portail : 5% × (1 + 10%) = 5,5% du prix des nuits.
const EFFECTIVE_TAX_RATE = (PROPORTIONAL_RATE_PCT / 100) * (1 + ADDITIONAL_TAX_PCT / 100);

/**
 * Répartition adultes / enfants à DÉCLARER pour que la taxe calculée par le portail
 * (proportionnelle au prix des nuits) corresponde au montant réellement encaissé.
 *
 * Le portail taxe uniquement les adultes : taxe = prix × 5,5% × adultes / (adultes + enfants).
 * On cherche donc la répartition (avec le vrai prix) qui approche au plus près la taxe encaissée,
 * en privilégiant un total d'occupants réel si Krossbooking le fournit.
 */
function splitAdultsChildrenToMatch(params: {
  collectedTax: number;
  nightsPrice: number;
  realGuests?: number;
}): { adults: number; children: number; portalTax: number } {
  const { collectedTax, nightsPrice, realGuests } = params;
  const fullTax = nightsPrice * EFFECTIVE_TAX_RATE; // taxe si tous adultes

  if (fullTax <= 0) return { adults: 0, children: 0, portalTax: 0 };

  // La taxe encaissée couvre déjà (ou dépasse) le calcul plein : tout le monde adulte.
  if (collectedTax >= fullTax - 0.01) {
    const guests = realGuests && realGuests > 0 ? realGuests : 1;
    return { adults: guests, children: 0, portalTax: fullTax };
  }

  // On teste des répartitions et on garde celle dont la taxe est la plus proche de l'encaissé.
  const maxPersons = realGuests && realGuests > 0 ? realGuests : MAX_DECLARED_PERSONS;
  const minPersons = realGuests && realGuests > 0 ? realGuests : 2;

  let best = { adults: 1, children: 0, portalTax: fullTax, diff: Infinity };
  for (let persons = minPersons; persons <= maxPersons; persons++) {
    for (let adults = 1; adults <= persons; adults++) {
      const children = persons - adults;
      const tax = fullTax * (adults / persons);
      const diff = Math.abs(tax - collectedTax);
      if (diff < best.diff) {
        best = { adults, children, portalTax: tax, diff };
      }
    }
  }

  return { adults: best.adults, children: best.children, portalTax: best.portalTax };
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

  // Ajout: index pour retrouver le prixSejour depuis les relevés
  const [priceIndex, setPriceIndex] = useState<Map<string, number>>(new Map());

  // Helpers pour normaliser et parser les dates
  const normalizeName = (s: string) =>
    (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

  const toKey = (name: string, checkIn: Date, checkOut: Date) =>
    `${normalizeName(name)}|${format(checkIn, 'yyyy-MM-dd')}|${format(checkOut, 'yyyy-MM-dd')}`;

  const parseAnyDate = (input: string) => {
    if (!input) return null;
    // Essayer formats courants des relevés (dd/MM/yyyy) puis ISO
    const p1 = parse(input, 'dd/MM/yyyy', new Date());
    if (isValid(p1)) return p1;
    const p2 = parseISO(input);
    return isValid(p2) ? p2 : null;
  };

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
          setPriceIndex(new Map()); // reset index
          setLoading(false);
          return;
        }

        const bookings = await fetchKrossbookingReservations(userRooms);

        // Nouveau: charger les relevés et construire un index [nom+dates] -> prixSejour
        const myStatements = await getMyStatements();
        const newIndex = new Map<string, number>();

        for (const inv of myStatements) {
          const rows = Array.isArray(inv.invoice_data) ? inv.invoice_data : [];
          for (const row of rows) {
            // On attend les champs 'voyageur', 'arrivee', 'depart', 'prixSejour' issus du contexte de génération
            const name = typeof row?.voyageur === 'string' ? row.voyageur : '';
            const dIn = typeof row?.arrivee === 'string' ? parseAnyDate(row.arrivee) : null;
            const dOut = typeof row?.depart === 'string' ? parseAnyDate(row.depart) : null;
            const prixSejour = typeof row?.prixSejour === 'number' ? row.prixSejour : NaN;

            if (name && dIn && dOut && isValid(dIn) && isValid(dOut) && !isNaN(prixSejour) && prixSejour > 0) {
              const key = toKey(name, dIn, dOut);
              // En cas de doublon, on conserve le premier inséré
              if (!newIndex.has(key)) {
                newIndex.set(key, prixSejour);
              }
            }
          }
        }
        setPriceIndex(newIndex);

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

        <Alert className="mb-6 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700">
          <Info className="h-4 w-4" />
          <AlertTitle>Aide à la déclaration sur le portail gouvernemental</AlertTitle>
          <AlertDescription>
            Le portail calcule la taxe (5,00% + 10% de taxe additionnelle départementale de la Somme = <strong>5,5%</strong>)
            à partir du <strong>prix des nuits</strong>, uniquement sur les <strong>adultes</strong> (les enfants sont exonérés).
            Le montant réellement encaissé auprès du voyageur peut être inférieur au calcul « plein ». Pour aligner la déclaration
            sur ce qui a été collecté, on garde le vrai prix des nuits et on déclare des <strong>enfants</strong> : le nombre
            d'<strong>adultes</strong> et d'<strong>enfants</strong> ci-dessous est calculé pour retomber au plus près de la taxe encaissée.
            Les réservations Airbnb et Booking (taxe déjà collectée par la plateforme) ne sont pas listées.
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
              À reporter sur le portail : Arrivée, Départ, Prix des nuits, et le nombre d'Adultes / Enfants (calculé pour aligner la taxe sur le montant réellement encaissé).
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            {selectedMonthReservations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom du voyageur</TableHead>
                    <TableHead>Arrivée</TableHead>
                    <TableHead>Départ</TableHead>
                    <TableHead className="text-center">Nuits</TableHead>
                    <TableHead className="text-center">Adultes</TableHead>
                    <TableHead className="text-center">Enfants</TableHead>
                    <TableHead className="text-right">Prix des nuits</TableHead>
                    <TableHead className="text-right">Taxe à déclarer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedMonthReservations.map((reservation) => {
                    const checkIn = parseISO(reservation.check_in_date);
                    const checkOut = parseISO(reservation.check_out_date);
                    const nights = Math.max(differenceInDays(checkOut, checkIn), 0);

                    // Parse montant (ex: "123€") -> nombre TTC (fallback si on ne retrouve pas le prixSejour)
                    const rawAmount = (reservation.amount || '').toString().trim();
                    const totalAmount = (() => {
                      const cleaned = rawAmount.replace(/[^\d,.\-]/g, '').replace(',', '.');
                      const parsed = parseFloat(cleaned);
                      return isNaN(parsed) ? 0 : parsed;
                    })();

                    // Chercher le prix du séjour (total des nuits) dans les relevés
                    const key = toKey(reservation.guest_name || '', checkIn, checkOut);
                    const nightsTotalFromStatements = priceIndex.get(key);
                    const totalNightsPrice = typeof nightsTotalFromStatements === 'number' && nightsTotalFromStatements > 0
                      ? nightsTotalFromStatements
                      : totalAmount; // fallback sur le total Kross si non trouvé

                    const totalTaxActual = reservation.tourist_tax_amount || 0;
                    const nightsPrice = totalNightsPrice || totalAmount;

                    // On garde le VRAI prix des nuits et on déclare des enfants (exonérés)
                    // pour aligner la taxe du portail sur le montant réellement encaissé.
                    const { adults, children, portalTax } = splitAdultsChildrenToMatch({
                      collectedTax: totalTaxActual,
                      nightsPrice,
                      realGuests: reservation.n_guests,
                    });

                    return (
                      <TableRow key={reservation.id}>
                        <TableCell className="font-medium">{reservation.guest_name || 'N/A'}</TableCell>
                        <TableCell>{format(checkIn, 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{format(checkOut, 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-center">{nights}</TableCell>
                        <TableCell className="text-center font-medium">{adults}</TableCell>
                        <TableCell className="text-center">
                          {children > 0 ? (
                            <span className="inline-flex items-center gap-1 font-medium">
                              {children}
                              <span className="text-xs text-green-600 dark:text-green-400">(exonérés)</span>
                            </span>
                          ) : (
                            children
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {nightsPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-primary">
                            {portalTax.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                          </span>
                          {Math.abs(portalTax - totalTaxActual) > 0.01 && (
                            <span className="block text-xs text-muted-foreground">
                              encaissé : {totalTaxActual.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                            </span>
                          )}
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