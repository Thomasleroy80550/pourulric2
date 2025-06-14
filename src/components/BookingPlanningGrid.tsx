import React, { useState, useEffect, useMemo } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addDays, subDays, differenceInDays, isValid, max, min } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Home, Sparkles, CheckCircle, Clock, XCircle, LogIn, LogOut } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { fetchKrossbookingReservations, fetchKrossbookingHousekeepingTasks, KrossbookingHousekeepingTask, KrossbookingReservation, saveKrossbookingReservation } from '@/lib/krossbooking';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getUserRooms, UserRoom } from '@/lib/user-room-api'; // Import user room API
import { useIsMobile } from '@/hooks/use-mobile'; // Import useIsMobile hook
import ReservationActionsDialog from './ReservationActionsDialog'; // Import the new dialog
import OwnerReservationDialog from './OwnerReservationDialog'; // Import OwnerReservationDialog
import { toast } from 'sonner';

const channelColors: { [key: string]: { name: string; bgColor: string; textColor: string; } } = {
  'AIRBNB': { name: 'Airbnb', bgColor: 'bg-red-600', textColor: 'text-white' },
  'BOOKING': { name: 'Booking.com', bgColor: 'bg-blue-700', textColor: 'text-white' },
  'ABRITEL': { name: 'Abritel', bgColor: 'bg-orange-600', textColor: 'text-white' },
  'DIRECT': { name: 'Direct', bgColor: 'bg-purple-600', textColor: 'text-white' },
  'HELLOKEYS': { name: 'Hello Keys', bgColor: 'bg-green-600', textColor: 'text-white' },
  'UNKNOWN': { name: 'Autre', bgColor: 'bg-gray-600', textColor: 'text-white' },
};

const BookingPlanningGrid: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [userRooms, setUserRooms] = useState<UserRoom[]>([]);
  const [reservations, setReservations] = useState<KrossbookingReservation[]>([]);
  const [housekeepingTasks, setHousekeepingTasks] = useState<KrossbookingHousekeepingTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile(); // Use the hook to detect mobile

  const [isActionsDialogOpen, setIsActionsDialogOpen] = useState(false);
  const [selectedBookingForActions, setSelectedBookingForActions] = useState<KrossbookingReservation | null>(null);

  const [isOwnerReservationDialogOpen, setIsOwnerReservationDialogOpen] = useState(false);
  const [bookingToEdit, setBookingToEdit] = useState<KrossbookingReservation | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedUserRooms = await getUserRooms();
      setUserRooms(fetchedUserRooms);

      const roomIds = fetchedUserRooms.map(room => room.room_id);
      const roomIdsAsNumbers = fetchedUserRooms.map(room => parseInt(room.room_id)).filter(id => !isNaN(id));

      if (roomIds.length === 0) {
        setReservations([]);
        setHousekeepingTasks([]);
        setLoading(false);
        return;
      }

      console.log(`DEBUG: Fetching reservations for room IDs: ${roomIds.join(', ')}`);
      const fetchedReservations = await fetchKrossbookingReservations(roomIds);
      setReservations(fetchedReservations);
      console.log("DEBUG: Fetched reservations for user rooms:", fetchedReservations); 

      const monthStartFormatted = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const monthEndFormatted = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      console.log(`DEBUG: Fetching housekeeping tasks for room IDs: ${roomIdsAsNumbers.join(', ')} from ${monthStartFormatted} to ${monthEndFormatted}`);
      const fetchedTasks = await fetchKrossbookingHousekeepingTasks(monthStartFormatted, monthEndFormatted, roomIdsAsNumbers);
      setHousekeepingTasks(fetchedTasks);

    } catch (err: any) {
      setError(`Erreur lors du chargement des données : ${err.message}`);
      console.error("DEBUG: Error in loadData:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentMonth]);

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
  const dayCellWidth = isMobile ? 40 : 80; // Smaller cells on mobile
  const propertyColumnWidth = isMobile ? 100 : 150; // Smaller property column on mobile

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
    setIsActionsDialogOpen(false); // Close actions dialog
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
        label: bookingToCancel.guest_name, // Use original guest name
        arrival: bookingToCancel.check_in_date,
        departure: bookingToCancel.check_out_date,
        email: bookingToCancel.email || '', // Use original email or empty string
        phone: bookingToCancel.phone || '', // Use original phone or empty string
        cod_reservation_status: "CANC",
        id_room: bookingToCancel.krossbooking_room_id,
      });
      toast.success("Réservation annulée avec succès !");
      setIsActionsDialogOpen(false); // Close actions dialog
      loadData(); // Refresh data
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
        {loading && <p className="text-gray-500">Chargement des réservations et tâches...</p>}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {!loading && !error && userRooms.length === 0 && (
          <p className="text-gray-500">
            Aucune chambre configurée. Veuillez ajouter des chambres via la page "Mon Profil" pour les voir ici.
          </p>
        )}
        {!loading && !error && userRooms.length > 0 && (
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
                  style={{ gridRow: `${3 + roomIndex}` }}> {/* Adjust row based on index */}
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
                  .filter(res => res.property_name === room.room_name || res.krossbooking_room_id === room.room_id) // Filter reservations for the current room using krossbooking_room_id
                  .map((reservation) => {
                    const checkIn = isValid(parseISO(reservation.check_in_date)) ? parseISO(reservation.check_in_date) : null;
                    const checkOut = isValid(parseISO(reservation.check_out_date)) ? parseISO(reservation.check_out_date) : null;

                    if (!checkIn || !checkOut) {
                      console.warn(`DEBUG: Skipping reservation ${reservation.id} due to invalid dates: check_in_date=${reservation.check_in_date}, check_out_date=${reservation.check_out_date}`);
                      return null;
                    }

                    const monthStart = startOfMonth(currentMonth);
                    const monthEnd = endOfMonth(currentMonth);

                    // Calculate the number of nights. If 0, it's a same-day arrival/departure.
                    const numberOfNights = differenceInDays(checkOut, checkIn);

                    // The bar visually spans from check-in day to check-out day (inclusive)
                    const barStartDate = checkIn;
                    const barEndDate = checkOut; 

                    // Determine the effective visible start and end of the reservation bar within the current month
                    const visibleBarStart = max([barStartDate, monthStart]);
                    const visibleBarEnd = min([barEndDate, monthEnd]);

                    // If reservation doesn't overlap with current month's visual span, don't render the bar
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
                    const isSingleDayStay = numberOfNights === 0; // 0 nights means arrival and departure on the same day

                    if (isSingleDayStay) {
                      // For single-day stays, center the bar within the cell and give it half the cell's width
                      calculatedLeft = propertyColumnWidth + (startIndex * dayCellWidth) + (dayCellWidth / 4); // Start at 1/4 of the cell
                      calculatedWidth = dayCellWidth / 2; // Span half the cell
                    } else {
                      // For multi-day stays, start at the center of the first day and end at the center of the last day
                      calculatedLeft = propertyColumnWidth + (startIndex * dayCellWidth) + (dayCellWidth / 2);
                      // Width spans from center of startIndex to center of endIndex
                      calculatedWidth = (endIndex - startIndex) * dayCellWidth;
                    }

                    const channelInfo = channelColors[reservation.channel_identifier || 'UNKNOWN'] || channelColors['UNKNOWN'];

                    const isArrivalDayVisible = isSameDay(checkIn, visibleBarStart);
                    const isDepartureDayVisible = isSameDay(checkOut, visibleBarEnd);
                    
                    const barClasses = cn(
                      `absolute h-9 flex items-center justify-center font-semibold overflow-hidden whitespace-nowrap ${channelInfo.bgColor} ${channelInfo.textColor} shadow-sm cursor-pointer hover:opacity-90 transition-opacity`,
                      isMobile ? 'text-[0.6rem] px-0.5' : 'text-xs px-1', // Smaller text and padding on mobile
                      {
                        'rounded-full': isSingleDayStay, // Full round for single day
                        'rounded-l-full': isArrivalDayVisible && !isSingleDayStay, // Left round for multi-day arrival
                        'rounded-r-full': isDepartureDayVisible && !isSingleDayStay, // Right round for multi-day departure
                        // No rounding if it's a middle segment of a long reservation spanning across months
                      }
                    );

                    return (
                      <Tooltip key={reservation.id}>
                        <TooltipTrigger asChild>
                          <div
                            className={barClasses}
                            style={{
                              gridRow: `${3 + roomIndex}`, // Position in the correct row for the room
                              left: `${calculatedLeft}px`,
                              width: `${calculatedWidth}px`,
                              height: '36px', // Adjusted for better vertical centering
                              marginTop: '2px', // Small margin from the top of the grid row
                              marginBottom: '2px', // Small margin from the bottom of the grid row
                              zIndex: 5, // Ensure bars are above background cells but below icons
                              display: 'flex', // Ensure flexbox for icon positioning
                              justifyContent: 'space-between', // Distribute items
                              alignItems: 'center',
                            }}
                            onClick={() => handleReservationClick(reservation)} // Add click handler here
                          >
                            {/* Render LogIn icon at the start of the bar if it's the check-in day */}
                            {isArrivalDayVisible && !isSingleDayStay && <LogIn className={cn("h-4 w-4 flex-shrink-0", isMobile && "h-3 w-3")} />}
                            
                            {/* Render Sparkles icon for single-day reservations (arrival and departure on same day) */}
                            {isSingleDayStay && <Sparkles className={cn("h-4 w-4 flex-shrink-0", isMobile && "h-3 w-3")} />}

                            <span className="flex-grow text-center px-1 truncate">
                              <span className="mr-1">{channelInfo.name.charAt(0).toUpperCase()}.</span>
                              <span className="mr-1">€ {numberOfNights}</span>
                              <span className="mx-1">|</span>
                              <span className="truncate">{reservation.guest_name}</span>
                            </span>

                            {/* Render LogOut icon at the end of the bar if it's the check-out day (or same day for 0 nights) */}
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
        )}

        {/* Legend for OTA Platforms */}
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
        onReservationCreated={loadData} // Reload data after create/edit
        initialBooking={bookingToEdit} // Pass the booking to edit
      />
    </Card>
  );
};

export default BookingPlanningGrid;