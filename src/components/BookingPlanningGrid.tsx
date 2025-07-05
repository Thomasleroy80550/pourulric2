import React, { useState, useEffect, useMemo } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addDays, subDays, differenceInDays, isValid, max, min } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Home, Sparkles, CheckCircle, Clock, XCircle, LogIn, LogOut } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { fetchKrossbookingHousekeepingTasks, KrossbookingHousekeepingTask, KrossbookingReservation, saveKrossbookingReservation } from '@/lib/krossbooking';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { UserRoom } from '@/lib/user-room-api';
import { useIsMobile } from '@/hooks/use-mobile';
import ReservationActionsDialog from './ReservationActionsDialog';
import OwnerReservationDialog from './OwnerReservationDialog';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

const channelColors: { [key: string]: { name: string; bgColor: string; textColor: string; } } = {
  'AIRBNB': { name: 'Airbnb', bgColor: 'bg-red-600', textColor: 'text-white' },
  'BOOKING': { name: 'Booking.com', bgColor: 'bg-blue-700', textColor: 'text-white' },
  'ABRITEL': { name: 'Abritel', bgColor: 'bg-orange-600', textColor: 'text-white' },
  'DIRECT': { name: 'Direct', bgColor: 'bg-purple-600', textColor: 'text-white' },
  'HELLOKEYS': { name: 'Hello Keys', bgColor: 'bg-green-600', textColor: 'text-white' },
  'UNKNOWN': { name: 'Autre', bgColor: 'bg-gray-600', textColor: 'text-white' },
};

interface BookingPlanningGridProps {
  refreshTrigger: number;
  userRooms: UserRoom[];
  reservations: KrossbookingReservation[];
  onReservationChange: () => void;
}

const BookingPlanningGrid: React.FC<BookingPlanningGridProps> = ({ refreshTrigger, userRooms, reservations, onReservationChange }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [housekeepingTasks, setHousekeepingTasks] = useState<KrossbookingHousekeepingTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const [isActionsDialogOpen, setIsActionsDialogOpen] = useState(false);
  const [selectedBookingForActions, setSelectedBookingForActions] = useState<KrossbookingReservation | null>(null);

  const [isOwnerReservationDialogOpen, setIsOwnerReservationDialogOpen] = useState(false);
  const [bookingToEdit, setBookingToEdit] = useState<KrossbookingReservation | null>(null);

  const loadHousekeepingTasks = async () => {
    setLoadingTasks(true);
    setError(null);
    try {
      const roomIdsAsNumbers = userRooms.map(room => parseInt(room.room_id)).filter(id => !isNaN(id));

      if (roomIdsAsNumbers.length === 0) {
        setHousekeepingTasks([]);
        setLoadingTasks(false);
        return;
      }

      const monthStartFormatted = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const monthEndFormatted = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      console.log(`DEBUG: Fetching housekeeping tasks for room IDs: ${roomIdsAsNumbers.join(', ')} from ${monthStartFormatted} to ${monthEndFormatted}`);
      const fetchedTasks = await fetchKrossbookingHousekeepingTasks(monthStartFormatted, monthEndFormatted, roomIdsAsNumbers);
      setHousekeepingTasks(fetchedTasks);

    } catch (err: any) {
      setError(`Erreur lors du chargement des tâches de ménage : ${err.message}`);
      console.error("DEBUG: Error in loadHousekeepingTasks:", err);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    loadHousekeepingTasks();
  }, [currentMonth, userRooms, refreshTrigger]);

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Adjust widths based on mobile status
  const dayCellWidth = isMobile ? 40 : 80;
  const propertyColumnWidth = isMobile ? 100 : 150;

  const getTaskIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'pending': return <Clock className="h-3 w-3 text-yellow-500" />;
      case 'cancelled': return <XCircle className="h-3 w-3 text-red-500" />;
      default: return <Sparkles className="h-3 w-3 text-purple-500" />;
    }
  };

  const handleReservationClick = (booking: KrossbookingReservation) => {
    setSelectedBookingForActions(booking);
    setIsActionsDialogOpen(true);
  };

  const handleEditReservation = (booking: KrossbookingReservation) => {
    setBookingToEdit(booking);
    setIsOwnerReservationDialogOpen(true);
    setIsActionsDialogOpen(false);
  };

  const handleDeleteReservation = async (bookingId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler cette réservation ?")) {
      return;
    }
    try {
      const bookingToCancel = reservations.find(b => b.id === bookingId);
      if (!bookingToCancel) {
        toast.error("Réservation introuvable pour annulation.");
        return;
      }

      console.log("DEBUG: Booking object before cancellation payload creation:", bookingToCancel);

      // Call saveKrossbookingReservation with CANC status, using original booking details
      await saveKrossbookingReservation({
        id_reservation: bookingToCancel.id,
        label: bookingToCancel.guest_name || "Annulation",
        arrival: bookingToCancel.check_in_date,
        departure: bookingToCancel.check_out_date,
        email: bookingToCancel.email || '',
        phone: bookingToCancel.phone || '',
        cod_reservation_status: "CANC",
        id_room: bookingToCancel.krossbooking_room_id,
      });
      toast.success("Réservation annulée avec succès !");
      setIsActionsDialogOpen(false);
      onReservationChange();
    } catch (err: any) {
      toast.error(`Erreur lors de l'annulation de la réservation : ${err.message}`);
      console.error("Error deleting reservation:", err);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Planning des Réservations</CardTitle>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium text-lg">
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </span>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 overflow-x-auto">
        {(loadingTasks && reservations.length === 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        )}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {!loadingTasks && !error && userRooms.length === 0 ? (
          <p className="text-gray-500">
            Aucune chambre configurée. Veuillez ajouter des chambres via la page "Mon Profil" pour les voir ici.
          </p>
        ) : !loadingTasks && !error && userRooms.length > 0 ? (
          <div className="grid-container" style={{
            gridTemplateColumns: `minmax(${propertyColumnWidth}px, 0.5fr) repeat(${daysInMonth.length}, ${dayCellWidth}px)`,
            minWidth: `${propertyColumnWidth + daysInMonth.length * dayCellWidth}px`,
            gridAutoRows: '40px',
            position: 'relative',
          }}>
            {/* Header Row 1: Empty cell + Day numbers */}
            <div className="grid-cell header-cell sticky left-0 z-10 bg-white dark:bg-gray-950 border-b border-r col-span-1"></div>
            {daysInMonth.map((day, index) => (
              <div
                key={index}
                className="grid-cell header-cell text-center font-semibold border-b border-r"
                style={{ width: `${dayCellWidth}px` }}
              >
                {format(day, 'dd', { locale: fr })}
              </div>
            ))}

            {/* Header Row 2: Empty cell + Day names */}
            <div className="grid-cell header-cell sticky left-0 z-10 bg-white dark:bg-gray-950 border-b border-r col-span-1"></div>
            {daysInMonth.map((day, index) => (
              <div
                key={`day-name-${index}`}
                className="grid-cell header-cell text-center text-xs text-gray-500 border-b border-r"
                style={{ width: `${dayCellWidth}px` }}
              >
                {format(day, 'EEE', { locale: fr })}
              </div>
            ))}

            {/* Dynamic Rows for each User Room */}
            {userRooms.map((room, roomIndex) => (
              <React.Fragment key={room.id}>
                {/* Property Name Cell */}
                <div className="grid-cell property-name-cell sticky left-0 z-10 bg-white dark:bg-gray-950 border-r border-b flex items-center px-2"
                  style={{ gridRow: `${3 + roomIndex}` }}>
                  <Home className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="font-medium text-sm">{room.room_name}</span>
                </div>

                {/* Day Cells (Background Grid) for the property row */}
                {daysInMonth.map((day, dayIndex) => {
                  const tasksForThisDay = housekeepingTasks.filter(task =>
                    isValid(parseISO(task.date)) && isSameDay(parseISO(task.date), day) && task.id_room.toString() === room.room_id
                  );

                  return (
                    <div
                      key={`${room.id}-${format(day, 'yyyy-MM-dd')}-bg`}
                      className={`grid-cell border-b border-r relative flex flex-col justify-center items-center ${isSameDay(day, new Date()) ? 'bg-blue-50 dark:bg-blue-950' : 'bg-gray-50 dark:bg-gray-800'}`}
                      style={{ width: `${dayCellWidth}px`, gridRow: `${3 + roomIndex}` }}
                    >
                      {/* Housekeeping Tasks Icon */}
                      {tasksForThisDay.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 cursor-pointer z-20">
                              {tasksForThisDay.length > 1 ? (
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{tasksForThisDay.length}</span>
                              ) : (
                                getTaskIcon(tasksForThisDay[0].status)
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="p-2 text-sm">
                            <p className="font-bold mb-1">Tâches de ménage ({format(day, 'dd/MM', { locale: fr })}):</p>
                            {tasksForThisDay.map((task, idx) => (
                              <p key={idx} className="flex items-center">
                                {getTaskIcon(task.status)}
                                <span className="ml-1 capitalize">{task.task_type.replace('_', ' ')} - {task.status}</span>
                              </p>
                            ))}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  );
                })}

                {/* Reservation Bars (Overlay) for this room */}
                {reservations
                  .filter(res => res.property_name === room.room_name || res.krossbooking_room_id === room.room_id)
                  .map((reservation) => {
                    const checkIn = isValid(parseISO(reservation.check_in_date)) ? parseISO(reservation.check_in_date) : null;
                    const checkOut = isValid(parseISO(reservation.check_out_date)) ? parseISO(reservation.check_out_date) : null;

                    if (!checkIn || !checkOut) {
                      console.warn(`DEBUG: Skipping reservation ${reservation.id} due to invalid dates: check_in_date=${reservation.check_in_date}, check_out_date=${reservation.check_out_date}`);
                      return null;
                    }

                    const monthStart = startOfMonth(currentMonth);
                    const monthEnd = endOfMonth(currentMonth);

                    const numberOfNights = differenceInDays(checkOut, checkIn);

                    const barStartDate = checkIn;
                    const barEndDate = checkOut; 

                    const visibleBarStart = max([barStartDate, monthStart]);
                    const visibleBarEnd = min([barEndDate, monthEnd]);

                    if (visibleBarStart > visibleBarEnd) {
                      return null;
                    }

                    const startIndex = daysInMonth.findIndex(d => isSameDay(d, visibleBarStart));
                    const endIndex = daysInMonth.findIndex(d => isSameDay(d, visibleBarEnd));

                    if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
                      console.warn(`DEBUG: Reservation ${reservation.id} bar dates not found in current month's days array or invalid range. Visible bar range: ${format(visibleBarStart, 'yyyy-MM-dd')} to ${format(visibleBarEnd, 'yyyy-MM-dd')}. Start Index: ${startIndex}, End Index: ${endIndex}`);
                      return null;
                    }

                    let calculatedLeft: number;
                    let calculatedWidth: number;
                    const isSingleDayStay = numberOfNights === 0;

                    if (isSingleDayStay) {
                      calculatedLeft = propertyColumnWidth + (startIndex * dayCellWidth) + (dayCellWidth / 4);
                      calculatedWidth = dayCellWidth / 2;
                    } else {
                      calculatedLeft = propertyColumnWidth + (startIndex * dayCellWidth) + (dayCellWidth / 2);
                      calculatedWidth = (endIndex - startIndex) * dayCellWidth;
                    }

                    const channelInfo = channelColors[reservation.channel_identifier || 'UNKNOWN'] || channelColors['UNKNOWN'];

                    const isArrivalDayVisible = isSameDay(checkIn, visibleBarStart);
                    const isDepartureDayVisible = isSameDay(checkOut, visibleBarEnd);
                    
                    const barClasses = cn(
                      `absolute h-9 flex items-center justify-center font-semibold overflow-hidden whitespace-nowrap ${channelInfo.bgColor} ${channelInfo.textColor} shadow-sm cursor-pointer hover:opacity-90 transition-opacity`,
                      isMobile ? 'text-[0.6rem] px-0.5' : 'text-xs px-1',
                      {
                        'rounded-full': isSingleDayStay,
                        'rounded-l-full': isArrivalDayVisible && !isSingleDayStay,
                        'rounded-r-full': isDepartureDayVisible && !isSingleDayStay,
                      }
                    );

                    return (
                      <Tooltip key={reservation.id}>
                        <TooltipTrigger asChild>
                          <div
                            className={barClasses}
                            style={{
                              gridRow: `${3 + roomIndex}`,
                              left: `${calculatedLeft}px`,
                              width: `${calculatedWidth}px`,
                              height: '36px',
                              marginTop: '2px',
                              marginBottom: '2px',
                              zIndex: 5,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                            onClick={() => handleReservationClick(reservation)}
                          >
                            {isArrivalDayVisible && !isSingleDayStay && <LogIn className={cn("h-4 w-4 flex-shrink-0", isMobile && "h-3 w-3")} />}
                            
                            {isSingleDayStay && <Sparkles className={cn("h-4 w-4 flex-shrink-0", isMobile && "h-3 w-3")} />}

                            <span className="flex-grow text-center px-1 truncate">
                              <span className="mr-1">{channelInfo.name.charAt(0).toUpperCase()}.</span>
                              <span className="mr-1">€ {numberOfNights}</span>
                              <span className="mx-1">|</span>
                              <span className="truncate">{reservation.guest_name}</span>
                            </span>

                            {isDepartureDayVisible && !isSingleDayStay && <LogOut className={cn("h-4 w-4 flex-shrink-0", isMobile && "h-3 w-3")} />}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="p-2 text-sm">
                          <p className="font-bold">{reservation.guest_name}</p>
                          <p>Du {format(checkIn, 'dd/MM/yyyy', { locale: fr })} au {format(checkOut, 'dd/MM/yyyy', { locale: fr })}</p>
                          <p>{numberOfNights} nuit(s)</p>
                          <p>Statut: {reservation.status}</p>
                          <p>Montant: {reservation.amount}</p>
                          <p>Canal: {channelInfo.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
              </React.Fragment>
            ))}
          </div>
        ) : null}

        <div className="mt-8 p-4 border rounded-md bg-gray-50 dark:bg-gray-800">
          <h3 className="text-md font-semibold mb-3">Légende des plateformes</h3>
          <div className="flex flex-wrap gap-4">
            {Object.entries(channelColors).map(([key, value]) => (
              <div key={key} className="flex items-center">
                <span className={`w-4 h-4 rounded-full mr-2 ${value.bgColor}`}></span>
                <span className="text-sm text-gray-700 dark:text-gray-300">{value.name}</span>
              </div>
            ))}
          </div>
          <h3 className="text-md font-semibold mt-4 mb-3">Légende des tâches de ménage et mouvements</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center">
              <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Tâche générique / Autre</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Tâche terminée</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-yellow-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Tâche en attente / en cours</span>
            </div>
            <div className="flex items-center">
              <XCircle className="h-4 w-4 mr-2 text-red-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Tâche annulée</span>
            </div>
            <div className="flex items-center">
              <span className="w-4 h-4 mr-2 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-full">2+</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">Plusieurs tâches</span>
            </div>
            <div className="flex items-center">
              <LogIn className="h-4 w-4 mr-2 text-white bg-green-600 rounded-full p-0.5" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Icône d'arrivée (dans la barre de réservation)</span>
            </div>
            <div className="flex items-center">
              <LogOut className="h-4 w-4 mr-2 text-white bg-red-600 rounded-full p-0.5" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Icône de départ (dans la barre de réservation)</span>
            </div>
            <div className="flex items-center">
              <Sparkles className="h-4 w-4 mr-2 text-white bg-purple-500 rounded-full p-0.5" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Arrivée & Départ le même jour (dans la barre de réservation)</span>
            </div>
          </div>
        </div>
      </CardContent>

      <ReservationActionsDialog
        isOpen={isActionsDialogOpen}
        onOpenChange={setIsActionsDialogOpen}
        booking={selectedBookingForActions}
        onEdit={handleEditReservation}
        onDelete={handleDeleteReservation}
      />

      <OwnerReservationDialog
        isOpen={isOwnerReservationDialogOpen}
        onOpenChange={setIsOwnerReservationDialogOpen}
        userRooms={userRooms}
        allReservations={reservations}
        onReservationCreated={onReservationChange}
        initialBooking={bookingToEdit}
      />
    </Card>
  );
};

export default BookingPlanningGrid;