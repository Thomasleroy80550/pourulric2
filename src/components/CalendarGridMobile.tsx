import React, { useState, useEffect, useMemo } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isValid, getDay, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Home, LogIn, LogOut, Sparkles, CheckCircle, Clock, XCircle, CalendarDays } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { fetchKrossbookingReservations, fetchKrossbookingHousekeepingTasks, KrossbookingHousekeepingTask, KrossbookingReservation, saveKrossbookingReservation } from '@/lib/krossbooking';
import { getUserRooms, UserRoom } from '@/lib/user-room-api';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReservationActionsDialog from './ReservationActionsDialog'; // Import the new dialog
import OwnerReservationDialog from './OwnerReservationDialog'; // Import OwnerReservationDialog
import { toast } from 'sonner';

// KrossbookingReservation interface is now imported from krossbooking.ts
// interface KrossbookingReservation { ... }

const channelColors: { [key: string]: { name: string; bgColor: string; textColor: string; } } = {
  'AIRBNB': { name: 'Airbnb', bgColor: 'bg-red-600', textColor: 'text-white' },
  'BOOKING': { name: 'Booking.com', bgColor: 'bg-blue-700', textColor: 'text-white' },
  'ABRITEL': { name: 'Abritel', bgColor: 'bg-orange-600', textColor: 'text-white' },
  'DIRECT': { name: 'Direct', bgColor: 'bg-purple-600', textColor: 'text-white' },
  'HELLOKEYS': { name: 'Hello Keys', bgColor: 'bg-green-600', textColor: 'text-white' },
  'UNKNOWN': { name: 'Autre', bgColor: 'bg-gray-600', textColor: 'text-white' },
};

const getTaskIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed': return <CheckCircle className="h-3 w-3 text-green-500" />;
    case 'pending': return <Clock className="h-3 w-3 text-yellow-500" />;
    case 'cancelled': return <XCircle className="h-3 w-3 text-red-500" />;
    default: return <Sparkles className="h-3 w-3 text-purple-500" />;
  }
};

const CalendarGridMobile: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [userRooms, setUserRooms] = useState<UserRoom[]>([]);
  const [reservations, setReservations] = useState<KrossbookingReservation[]>([]);
  const [housekeepingTasks, setHousekeepingTasks] = useState<KrossbookingHousekeepingTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date()); // Default to today

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

      // Fetch reservations for a wider range to cover month transitions
      const fetchStart = subMonths(currentMonth, 1); // Fetch from previous month
      const fetchEnd = addMonths(currentMonth, 1);   // Fetch to next month
      const fetchedReservations = await fetchKrossbookingReservations(roomIds);
      setReservations(fetchedReservations);

      const monthStartFormatted = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const monthEndFormatted = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      const fetchedTasks = await fetchKrossbookingHousekeepingTasks(monthStartFormatted, monthEndFormatted, roomIdsAsNumbers);
      setHousekeepingTasks(fetchedTasks);

    } catch (err: any) {
      setError(`Erreur lors du chargement des données : ${err.message}`);
      console.error("Error in CalendarGridMobile loadData:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentMonth]); // Re-fetch when month changes

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    // Add leading empty days for the first week (Monday start)
    const firstDayOfWeek = getDay(start); // 0 for Sunday, 1 for Monday
    const leadingEmptyDaysCount = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // If Sunday (0), need 6 empty days to start on Monday. If Monday (1), need 0.
    const leadingEmptyDays = Array.from({ length: leadingEmptyDaysCount }, (_, i) => null);

    return [...leadingEmptyDays, ...days];
  }, [currentMonth]);

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
    setSelectedDay(startOfMonth(subMonths(currentMonth, 1))); // Select first day of new month
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
    setSelectedDay(startOfMonth(addMonths(currentMonth, 1))); // Select first day of new month
  };

  const getEventsForDay = (day: Date) => {
    const events: any[] = [];
    userRooms.forEach(room => {
      reservations.forEach(res => {
        const checkIn = isValid(parseISO(res.check_in_date)) ? parseISO(res.check_in_date) : null;
        const checkOut = isValid(parseISO(res.check_out_date)) ? parseISO(res.check_out_date) : null;

        if (!checkIn || !checkOut) return;

        // Check if the day is within the reservation period (inclusive of check-in, exclusive of check-out)
        // For display purposes, we want to show check-out on the day of departure.
        const isCheckInDay = isSameDay(checkIn, day);
        const isCheckOutDay = isSameDay(checkOut, day);
        const isStayDay = day > checkIn && day < checkOut;

        if (isCheckInDay || isCheckOutDay || isStayDay) {
          let type: 'check_in' | 'check_out' | 'stay' | 'check_in_out' = 'stay';
          if (isCheckInDay) type = 'check_in';
          if (isCheckOutDay && !isCheckInDay) type = 'check_out'; // Only mark as check-out if not also check-in
          if (isCheckInDay && isCheckOutDay) type = 'check_in_out'; // New type for same-day arrival/departure

          events.push({ type, data: res, roomName: room.room_name, roomId: room.room_id });
        }
      });

      housekeepingTasks.forEach(task => {
        const taskDate = isValid(parseISO(task.date)) ? parseISO(task.date) : null;
        if (taskDate && isSameDay(taskDate, day) && task.id_room.toString() === room.room_id) {
          events.push({ type: 'task', data: task, roomName: room.room_name, roomId: room.room_id });
        }
      });
    });

    // Filter unique events for display in the cell
    const uniqueEvents = Array.from(new Map(events.map(item => {
      if (item.type === 'task') return [`task-${(item.data as KrossbookingHousekeepingTask).id_task}-${item.roomName}`, item];
      return [`${item.type}-${(item.data as KrossbookingReservation).id}-${item.roomName}`, item];
    })).values());

    // Sort events for better display: check-in, check-in_out, check-out, task, then stay
    uniqueEvents.sort((a, b) => {
      const order = { 'check_in': 1, 'check_in_out': 2, 'check_out': 3, 'task': 4, 'stay': 5 };
      return order[a.type] - order[b.type];
    });

    return uniqueEvents;
  };

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const eventsForSelectedDay = getEventsForDay(selectedDay);

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

      console.log("DEBUG: Booking object before cancellation payload creation (CalendarGridMobile):", bookingToCancel);

      // Call saveKrossbookingReservation with CANC status, using original booking details
      await saveKrossbookingReservation({
        id_reservation: bookingToCancel.id,
        label: bookingToCancel.guest_name || "Annulation", // Use original guest name or generic label
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
        <CardTitle className="text-lg font-semibold">Calendrier Mobile</CardTitle>
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
      <CardContent className="p-2">
        {loading && <p className="text-gray-500 text-center py-4">Chargement du calendrier...</p>}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {!loading && !error && userRooms.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            Aucune chambre configurée. Veuillez ajouter des chambres via la page "Mon Profil" pour les voir ici.
          </p>
        )}
        {!loading && !error && userRooms.length > 0 && (
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekDays.map((day) => (
              <div key={day} className="text-sm font-semibold text-gray-600 dark:text-gray-400 py-2">
                {day}
              </div>
            ))}
            {daysInMonth.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="h-20"></div>; // Empty cell for padding
              }

              const isToday = isSameDay(day, new Date());
              const isSelected = isSameDay(day, selectedDay);
              const eventsForCell = getEventsForDay(day);

              // Prioritize display: check-in, check-out, task, then others
              const displayEvents = eventsForCell.slice(0, 3); // Show up to 3 indicators
              const remainingEventsCount = eventsForCell.length - displayEvents.length;

              return (
                <div
                  key={format(day, 'yyyy-MM-dd')}
                  className={cn(
                    "h-20 flex flex-col items-center justify-start p-1 rounded-md cursor-pointer border",
                    isToday ? "bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                    isSelected && "ring-2 ring-offset-2 ring-blue-500 dark:ring-blue-400", // Highlight selected day
                    "hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  )}
                  onClick={() => setSelectedDay(day)}
                >
                  <span className={cn("text-sm font-semibold", isToday ? "text-blue-800 dark:text-blue-200" : "text-gray-800 dark:text-gray-200")}>
                    {format(day, 'd')}
                  </span>
                  <div className="flex flex-wrap justify-center gap-0.5 mt-1">
                    {displayEvents.map((event, idx) => {
                      if (event.type === 'task') {
                        const task = event.data as KrossbookingHousekeepingTask;
                        return (
                          <div key={`cell-task-${task.id_task}-${event.roomName}-${idx}`} className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600">
                            {getTaskIcon(task.status)}
                          </div>
                        );
                      } else {
                        const reservation = event.data as KrossbookingReservation;
                        const channelInfo = channelColors[reservation.channel_identifier || 'UNKNOWN'] || channelColors['UNKNOWN'];
                        let icon = null;
                        if (event.type === 'check_in' || event.type === 'check_in_out') icon = <LogIn className="h-3 w-3" />;
                        else if (event.type === 'check_out') icon = <LogOut className="h-3 w-3" />;
                        else if (event.type === 'stay') icon = <CalendarDays className="h-3 w-3" />; // Generic icon for stay

                        return (
                          <div key={`cell-res-${reservation.id}-${event.type}-${event.roomName}-${idx}`} className={cn("w-4 h-4 flex items-center justify-center rounded-full", channelInfo.bgColor, channelInfo.textColor)}>
                            {icon}
                          </div>
                        );
                      }
                    })}
                    {remainingEventsCount > 0 && (
                      <div className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-400 dark:bg-gray-500 text-white text-[0.6rem] font-bold">
                        +{remainingEventsCount}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Section for selected day's events */}
      <CardContent className="p-4 border-t mt-4">
        <h3 className="text-lg font-bold mb-3">Événements du {format(selectedDay, 'EEEE dd MMMM yyyy', { locale: fr })}</h3>
        <ScrollArea className="h-[200px] pr-4">
          <div className="space-y-3">
            {eventsForSelectedDay.length === 0 ? (
              <p className="text-gray-500">Aucun événement pour ce jour.</p>
            ) : (
              eventsForSelectedDay.map((event, index) => {
                if (event.type === 'task') {
                  const task = event.data as KrossbookingHousekeepingTask;
                  return (
                    <div key={`detail-task-${task.id_task}-${event.roomName}-${index}`} className="flex items-center p-2 border rounded-md bg-gray-100 dark:bg-gray-700">
                      {getTaskIcon(task.status)}
                      <div className="ml-3 text-sm">
                        <p className="font-semibold">{event.roomName}: Tâche {task.task_type.replace('_', ' ')}</p>
                        <p className="text-gray-600 dark:text-gray-400">Statut: {task.status}</p>
                        {task.notes && <p className="text-gray-600 dark:text-gray-400">Notes: {task.notes}</p>}
                      </div>
                    </div>
                  );
                } else {
                  const reservation = event.data as KrossbookingReservation;
                  const channelInfo = channelColors[reservation.channel_identifier || 'UNKNOWN'] || channelColors['UNKNOWN'];
                  const checkIn = isValid(parseISO(reservation.check_in_date)) ? parseISO(reservation.check_in_date) : null;
                  const checkOut = isValid(parseISO(reservation.check_out_date)) ? parseISO(reservation.check_out_date) : null;
                  const numberOfNights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;

                  let icon = null;
                  let eventLabel = '';

                  if (event.type === 'check_in') {
                    icon = <LogIn className="h-5 w-5 flex-shrink-0" />;
                    eventLabel = `Arrivée de ${reservation.guest_name}`;
                  } else if (event.type === 'check_out') {
                    icon = <LogOut className="h-5 w-5 flex-shrink-0" />;
                    eventLabel = `Départ de ${reservation.guest_name}`;
                  } else if (event.type === 'check_in_out') {
                    icon = <Sparkles className="h-5 w-5 flex-shrink-0" />;
                    eventLabel = `Arrivée & Départ de ${reservation.guest_name}`;
                  } else if (event.type === 'stay') {
                    icon = <CalendarDays className="h-5 w-5 flex-shrink-0" />;
                    eventLabel = `Séjour de ${reservation.guest_name}`;
                  }

                  return (
                    <div
                      key={`detail-res-${reservation.id}-${event.type}-${event.roomName}-${index}`}
                      className={cn(
                        `flex items-center p-2 rounded-md text-sm font-medium ${channelInfo.bgColor} ${channelInfo.textColor} shadow-sm cursor-pointer hover:opacity-90 transition-opacity`
                      )}
                      onClick={() => handleReservationClick(reservation)} // Add click handler here
                    >
                      {icon && <span className="mr-3">{icon}</span>}
                      <div className="flex-grow">
                        <p className="font-semibold">{event.roomName}: {eventLabel}</p>
                        <p className="text-xs opacity-90">
                          Du {checkIn ? format(checkIn, 'dd/MM/yyyy', { locale: fr }) : 'N/A'} au {checkOut ? format(checkOut, 'dd/MM/yyyy', { locale: fr }) : 'N/A'} ({numberOfNights} nuit(s))
                        </p>
                        <p className="text-xs opacity-90">Statut: {reservation.status} | Montant: {reservation.amount} | Canal: {channelInfo.name}</p>
                      </div>
                    </div>
                  );
                }
              })
            )}
          </div>
        </ScrollArea>
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

export default CalendarGridMobile;