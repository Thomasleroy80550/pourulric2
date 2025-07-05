import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { fetchKrossbookingReservations } from '@/lib/krossbooking';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, CalendarDays, DollarSign, User, Home, Tag, Filter, XCircle, Flag } from 'lucide-react'; // Added Flag icon
import { format, parseISO, isWithinInterval, startOfYear, endOfYear, isAfter, isBefore, subDays, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getUserRooms, UserRoom } from '@/lib/user-room-api';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ReportProblemDialog from '@/components/ReportProblemDialog'; // Import the new component

interface Booking {
  id: string;
  guest_name: string;
  property_name: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
  amount: string;
  cod_channel?: string;
  email?: string; // Added email for reporting
  phone?: string; // Added phone for reporting
}

const BookingsPage: React.FC = () => {
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userRooms, setUserRooms] = useState<UserRoom[]>([]);
  const isMobile = useIsMobile();

  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false); // New state for report dialog
  const [bookingToReport, setBookingToReport] = useState<Booking | null>(null); // New state for booking to report

  // Filter states - Initialized to 'all' instead of ''
  const [filterRoomId, setFilterRoomId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  const commonStatuses = ['CONFIRMED', 'PENDING', 'CANCELLED', 'PROPRI', 'PROP0']; // Added owner statuses
  const commonChannels = ['AIRBNB', 'BOOKING', 'ABRITEL', 'DIRECT', 'HELLOKEYS', 'UNKNOWN'];

  const applyFilters = (bookingsToFilter: Booking[]) => {
    let tempBookings = bookingsToFilter;

    if (filterRoomId !== 'all') { // Check for 'all'
      tempBookings = tempBookings.filter(booking => booking.property_name === userRooms.find(r => r.room_id === filterRoomId)?.room_name || booking.property_name === filterRoomId);
    }

    if (filterStatus !== 'all') { // Check for 'all'
      tempBookings = tempBookings.filter(booking => booking.status.toLowerCase() === filterStatus.toLowerCase());
    }

    if (filterChannel !== 'all') { // Check for 'all'
      tempBookings = tempBookings.filter(booking => (booking.cod_channel || 'UNKNOWN').toLowerCase() === filterChannel.toLowerCase());
    }

    if (filterStartDate) {
      const start = parseISO(filterStartDate);
      tempBookings = tempBookings.filter(booking => {
        const checkIn = parseISO(booking.check_in_date);
        return isAfter(checkIn, subDays(start, 1));
      });
    }

    if (filterEndDate) {
      const end = parseISO(filterEndDate);
      tempBookings = tempBookings.filter(booking => {
        const checkIn = parseISO(booking.check_in_date);
        return isBefore(checkIn, addDays(end, 1));
      });
    }

    setFilteredBookings(tempBookings);
  };

  const loadBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedUserRooms = await getUserRooms();
      setUserRooms(fetchedUserRooms);

      // Pass fetchedUserRooms to fetchKrossbookingReservations
      const fetchedBookings = await fetchKrossbookingReservations(fetchedUserRooms);
      console.log(`Fetched bookings for BookingsPage (Rooms: ${fetchedUserRooms.map(r => r.room_id).join(', ')}):`, fetchedBookings);

      const currentYear = new Date().getFullYear();
      const yearStart = startOfYear(new Date(currentYear, 0, 1));
      const yearEnd = endOfYear(new Date(currentYear, 0, 1));

      const bookingsForCurrentYear = fetchedBookings.filter(booking => {
        const checkInDate = parseISO(booking.check_in_date);
        return isWithinInterval(checkInDate, { start: yearStart, end: yearEnd });
      });

      const sortedBookings = bookingsForCurrentYear.sort((a, b) => {
        const dateA = parseISO(a.check_in_date).getTime();
        const dateB = parseISO(b.check_in_date).getTime();
        return dateA - dateB;
      });

      setAllBookings(sortedBookings);
      applyFilters(sortedBookings);
    } catch (err: any) {
      setError(`Erreur lors du chargement des réservations : ${err.message}`);
      console.error("Error in loadBookings for BookingsPage:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    applyFilters(allBookings);
  }, [filterRoomId, filterStatus, filterChannel, filterStartDate, filterEndDate, allBookings]);

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'confirmée':
      case 'propri': // For owner reservations that are active
        return 'default';
      case 'pending':
      case 'en attente':
        return 'secondary';
      case 'cancelled':
      case 'annulée':
      case 'canc': // For cancelled owner reservations
        return 'destructive';
      case 'prop0': // Owner reservation without cleaning
        return 'outline';
      default:
        return 'outline';
    }
  };

  const handleOpenDetails = (booking: Booking) => {
    console.log("Attempting to open dialog for booking:", booking);
    setSelectedBooking(booking);
    setIsDetailDialogOpen(true);
    console.log("isDetailDialogOpen after setting:", true);
  };

  const handleReportProblem = (booking: Booking) => {
    setBookingToReport(booking);
    setIsReportDialogOpen(true);
  };

  const handleResetFilters = () => {
    setFilterRoomId('all'); // Reset to 'all'
    setFilterStatus('all'); // Reset to 'all'
    setFilterChannel('all'); // Reset to 'all'
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const currentYear = new Date().getFullYear();

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Réservations pour {userRooms.length > 0 ? 'vos chambres' : 'les chambres'} ({currentYear})</h1>
        
        <Card className="shadow-md mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filtres de Réservations
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-10 w-48 col-span-full justify-self-end" />
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="filterRoom">Chambre</Label>
                  <Select value={filterRoomId} onValueChange={setFilterRoomId}>
                    <SelectTrigger id="filterRoom">
                      <SelectValue placeholder="Toutes les chambres" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les chambres</SelectItem>
                      {userRooms.map(room => (
                        <SelectItem key={room.id} value={room.room_id}>{room.room_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filterStatus">Statut</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger id="filterStatus">
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      {commonStatuses.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filterChannel">Canal</Label>
                  <Select value={filterChannel} onValueChange={setFilterChannel}>
                    <SelectTrigger id="filterChannel">
                      <SelectValue placeholder="Tous les canaux" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les canaux</SelectItem>
                      {commonChannels.map(channel => (
                        <SelectItem key={channel} value={channel}>{channel}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filterStartDate">Date d'arrivée (début)</Label>
                  <Input
                    id="filterStartDate"
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filterEndDate">Date d'arrivée (fin)</Label>
                  <Input
                    id="filterEndDate"
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                  />
                </div>
                <div className="col-span-1 md:col-span-2 lg:col-span-4 flex justify-end">
                  <Button variant="outline" onClick={handleResetFilters} className="flex items-center">
                    <XCircle className="h-4 w-4 mr-2" />
                    Réinitialiser les filtres
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Liste de vos réservations</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : error ? (
              <Alert variant="destructive" className="mb-4">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : userRooms.length === 0 ? (
              <p className="text-gray-500">
                Aucune chambre configurée. Veuillez ajouter des chambres via la page "Mon Profil" pour voir les réservations ici.
              </p>
            ) : filteredBookings.length === 0 ? (
              <p className="text-gray-500">Aucune réservation trouvée pour vos chambres en {currentYear} avec les filtres actuels.</p>
            ) : (
              <>
                {/* Desktop Table View */}
                {!isMobile && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID Réservation</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Propriété</TableHead>
                          <TableHead>Canal</TableHead>
                          <TableHead>Arrivée</TableHead>
                          <TableHead>Départ</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                          <TableHead className="text-right">Actions</TableHead> {/* New TableHead for actions */}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBookings.map((booking) => (
                          <TableRow key={booking.id} onClick={() => handleOpenDetails(booking)} className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                            <TableCell className="font-medium">{booking.id}</TableCell>
                            <TableCell>{booking.guest_name}</TableCell>
                            <TableCell>{booking.property_name}</TableCell>
                            <TableCell>{booking.cod_channel || 'N/A'}</TableCell>
                            <TableCell>{format(parseISO(booking.check_in_date), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                            <TableCell>{format(parseISO(booking.check_out_date), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(booking.status)}>
                                {booking.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold text-gray-800 dark:text-gray-200">
                              {booking.amount}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleReportProblem(booking); }}>
                                <Flag className="h-4 w-4" />
                                <span className="ml-2 hidden md:inline-block">Signaler</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Mobile Card View */}
                {isMobile && (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredBookings.map((booking) => (
                      <Card key={booking.id} className="shadow-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleOpenDetails(booking)}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-semibold flex items-center">
                            <Tag className="h-4 w-4 mr-2 text-gray-500" />
                            Réservation #{booking.id}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-1">
                          <p className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-gray-500" />
                            <span className="font-medium">{booking.guest_name}</span>
                          </p>
                          <p className="flex items-center">
                            <Home className="h-4 w-4 mr-2 text-gray-500" />
                            {booking.property_name}
                          </p>
                          <p className="flex items-center">
                            <CalendarDays className="h-4 w-4 mr-2 text-gray-500" />
                            {format(parseISO(booking.check_in_date), 'dd/MM/yyyy', { locale: fr })} - {format(parseISO(booking.check_out_date), 'dd/MM/yyyy', { locale: fr })}
                          </p>
                          <p className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-2 text-gray-500" />
                            <span className="font-bold text-gray-800 dark:text-gray-200">
                              {booking.amount}
                            </span>
                          </p>
                          <div className="flex items-center justify-between pt-2">
                            <Badge variant={getStatusVariant(booking.status)}>
                              {booking.status}
                            </Badge>
                            <span className="text-xs text-gray-500">Canal: {booking.cod_channel || 'N/A'}</span>
                          </div>
                          <div className="pt-2">
                            <Button variant="outline" size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); handleReportProblem(booking); }}>
                              <Flag className="h-4 w-4 mr-2" />
                              Signaler un problème
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDetailDialogOpen} onOpenChange={(open) => {
        console.log("Dialog onOpenChange called:", open);
        setIsDetailDialogOpen(open);
        if (!open) {
          setSelectedBooking(null);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Détails de la Réservation</DialogTitle>
            <DialogDescription>
              Informations complètes sur la réservation sélectionnée.
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right">ID:</Label>
                <span className="col-span-2 font-medium">{selectedBooking.id}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right">Client:</Label>
                <span className="col-span-2">{selectedBooking.guest_name}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right">Propriété:</Label>
                <span className="col-span-2">{selectedBooking.property_name}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right">Canal:</Label>
                <span className="col-span-2">{selectedBooking.cod_channel || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right">Arrivée:</Label>
                <span className="col-span-2">{format(parseISO(selectedBooking.check_in_date), 'dd/MM/yyyy', { locale: fr })}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right">Départ:</Label>
                <span className="col-span-2">{format(parseISO(selectedBooking.check_out_date), 'dd/MM/yyyy', { locale: fr })}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right">Statut:</Label>
                <span className="col-span-2">
                  <Badge variant={getStatusVariant(selectedBooking.status)}>
                    {selectedBooking.status}
                  </Badge>
                </span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right">Montant:</Label>
                <span className="col-span-2 font-bold text-gray-800 dark:text-gray-200">{selectedBooking.amount}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ReportProblemDialog
        isOpen={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        booking={bookingToReport}
        onReportSubmitted={() => {
          // No need to re-fetch bookings for now, as the report is just submitted.
          // If you want to show a visual change on the booking list after reporting,
          // you would trigger a re-fetch here.
          setIsReportDialogOpen(false);
        }}
      />
    </MainLayout>
  );
};

export default BookingsPage;