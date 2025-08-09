import React, { useState, useEffect, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isWeekend,
  addMonths,
  subMonths,
  isValid,
  parseISO,
  differenceInDays,
  max,
  min,
  isSameDay,
  subDays, // Added subDays import
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { UserRoom } from '@/lib/user-room-api';
import { KrossbookingReservation } from '@/lib/krossbooking';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LogIn, LogOut, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Correction ici
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from 'sonner';

// Define channel colors and names
const channelColors: { [key: string]: { bgColor: string; textColor: string; name: string } } = {
  BOOKINGCOM: { bgColor: 'bg-blue-500', textColor: 'text-white', name: 'Booking.com' },
  AIRBNB: { bgColor: 'bg-red-500', textColor: 'text-white', name: 'Airbnb' },
  EXPEDIA: { bgColor: 'bg-green-500', textColor: 'text-white', name: 'Expedia' },
  DIRECT: { bgColor: 'bg-purple-500', textColor: 'text-white', name: 'Direct' },
  OWNER_BLOCK: { bgColor: 'bg-gray-700', textColor: 'text-white', name: 'Bloqué (Propriétaire)' },
  PROPRI: { bgColor: 'bg-gray-700', textColor: 'text-white', name: 'Bloqué (Propriétaire)' }, // Alias for owner blocks
  PROP0: { bgColor: 'bg-gray-700', textColor: 'text-white', name: 'Bloqué (Propriétaire)' }, // Alias for owner blocks
  BLOCKED: { bgColor: 'bg-gray-700', textColor: 'text-white', name: 'Bloqué' }, // For price overrides
  UNKNOWN: { bgColor: 'bg-yellow-500', textColor: 'text-gray-800', name: 'Inconnu' },
  CANC: { bgColor: 'bg-red-300', textColor: 'text-gray-800', name: 'Annulé' },
  // Add more channels as needed
};

interface BookingPlanningGridProps {
  refreshTrigger: number;
  userRooms: UserRoom[];
  reservations: KrossbookingReservation[];
  onReservationChange: () => void;
  profile: any; // Adjust type as per your profile structure
}

const BookingPlanningGrid: React.FC<BookingPlanningGridProps> = ({
  refreshTrigger,
  userRooms,
  reservations,
  onReservationChange,
  profile,
}) => {
  const isMobile = useIsMobile();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [selectedReservation, setSelectedReservation] = useState<KrossbookingReservation | null>(null);
  const [isReservationDetailsDialogOpen, setIsReservationDetailsDialogOpen] = useState(false);

  useEffect(() => {
    // This effect can be used to re-render or re-fetch data if refreshTrigger changes
    // For now, it just ensures the component re-renders with new data
  }, [refreshTrigger, reservations, userRooms]);

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

  const handleReservationClick = (reservation: KrossbookingReservation) => {
    setSelectedReservation(reservation);
    setIsReservationDetailsDialogOpen(true);
  };

  // Constants for grid layout (adjust as needed for responsiveness)
  const propertyColumnWidth = isMobile ? 80 : 150; // Width for room names column
  const dayCellWidth = isMobile ? 25 : 40; // Width for each day column

  const gridWidth = propertyColumnWidth + (daysInMonth.length * dayCellWidth);

  return (
    <div className="overflow-x-auto relative">
      <div className="flex items-center justify-between mb-4 sticky left-0 z-10 bg-background p-2 rounded-md shadow-sm">
        <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {format(currentMonth, 'MMMM yyyy', { locale: fr })}
        </h2>
        <Button variant="outline" size="sm" onClick={goToNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div
        className="grid border rounded-lg overflow-hidden"
        style={{
          gridTemplateColumns: `${propertyColumnWidth}px repeat(${daysInMonth.length}, ${dayCellWidth}px)`,
          width: `${gridWidth}px`,
        }}
      >
        {/* Header Row: Room Names */}
        <div className="sticky left-0 z-20 bg-gray-100 dark:bg-gray-800 p-2 border-b border-r font-semibold text-sm flex items-center justify-center">
          Chambres
        </div>
        {/* Header Row: Days of Month */}
        {daysInMonth.map((day, index) => (
          <div
            key={index}
            className={cn(
              'p-2 border-b text-center text-xs font-semibold',
              isWeekend(day) ? 'bg-gray-50 dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-800',
              isToday(day) && 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100'
            )}
          >
            {format(day, 'dd', { locale: fr })}
            <br />
            {format(day, 'EEE', { locale: fr })}
          </div>
        ))}

        {/* Room Rows */}
        {userRooms.map((room, roomIndex) => (
          <React.Fragment key={room.id}>
            {/* Room Name Cell */}
            <div className="sticky left-0 z-10 bg-white dark:bg-gray-900 p-2 border-r font-medium text-sm flex items-center justify-center">
              {room.room_name}
            </div>
            {/* Day Cells */}
            {daysInMonth.map((day, dayIndex) => (
              <div
                key={`${room.id}-${dayIndex}`}
                className={cn(
                  'p-2 border-b border-r h-10',
                  isWeekend(day) ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900',
                  isToday(day) && 'bg-blue-50 dark:bg-blue-950'
                )}
              ></div>
            ))}

            {/* Reservation Bars */}
            {reservations
              .filter(reservation => {
                const matches = reservation.krossbooking_room_id === room.room_id;
                console.log(`DEBUG BookingPlanningGrid: Checking reservation ${reservation.id} (${reservation.guest_name}) - krossbooking_room_id: ${reservation.krossbooking_room_id} against user room ${room.room_name} (ID: ${room.room_id}). Matches: ${matches}`);
                return matches;
              })
              .map((reservation) => {
                const checkIn = isValid(parseISO(reservation.check_in_date)) ? parseISO(reservation.check_in_date) : null;
                const checkOut = isValid(parseISO(reservation.check_out_date)) ? parseISO(reservation.check_out_date) : null;

                if (!checkIn || !checkOut) {
                  console.warn(`DEBUG: Skipping reservation ${reservation.id} due to invalid dates: check_in_date=${reservation.check_in_date}, check_out_date=${reservation.check_out_date}`);
                  return null;
                }

                const numberOfNights = differenceInDays(checkOut, checkIn);

                const monthStart = startOfMonth(currentMonth);
                const monthEnd = endOfMonth(currentMonth);

                // The bar should visually end on the last occupied night, not the checkout day
                // For a 0-night stay (check-in and check-out same day), the visual end date is the check-in date itself.
                const barEndDateVisual = (numberOfNights === 0) ? checkIn : subDays(checkOut, 1); 

                // Clamp the bar to the visible month
                const visibleBarStart = max([checkIn, monthStart]);
                const visibleBarEnd = min([barEndDateVisual, monthEnd]);

                // If the visible range is invalid (e.g., reservation ends before it starts in this month's view)
                if (visibleBarStart > visibleBarEnd) {
                  return null;
                }

                const startIndex = daysInMonth.findIndex(d => isSameDay(d, visibleBarStart));
                const endIndex = daysInMonth.findIndex(d => isSameDay(d, visibleBarEnd));

                if (startIndex === -1 || endIndex === -1) {
                  // This should ideally not happen if visibleBarStart/End are clamped to month range
                  // and daysInMonth is correctly populated.
                  console.warn(`DEBUG: Reservation ${reservation.id} visible bar dates not found in current month's days array. Visible bar range: ${format(visibleBarStart, 'yyyy-MM-dd')} to ${format(visibleBarEnd, 'yyyy-MM-dd')}. Start Index: ${startIndex}, End Index: ${endIndex}`);
                  return null;
                }

                let calculatedLeft: number;
                let calculatedWidth: number;
                const isSingleDayStay = numberOfNights === 0;

                if (isSingleDayStay) {
                  // Center the dot in the day cell for 0-night stays
                  calculatedLeft = propertyColumnWidth + (startIndex * dayCellWidth) + (dayCellWidth / 4);
                  calculatedWidth = dayCellWidth / 2;
                } else {
                  // For multi-night stays, span from start of check-in day to end of last occupied day
                  calculatedLeft = propertyColumnWidth + (startIndex * dayCellWidth);
                  calculatedWidth = (endIndex - startIndex + 1) * dayCellWidth; // +1 because it's inclusive range
                }

                // Determine the effective channel key for color mapping
                const isOwnerBlock = reservation.status === 'PROPRI' || reservation.status === 'PROP0' || reservation.status === 'BLOCKED';
                const effectiveChannelKey = isOwnerBlock ? reservation.status : (reservation.cod_channel || 'UNKNOWN');
                const channelInfo = channelColors[effectiveChannelKey] || channelColors['UNKNOWN'];

                const isArrivalDayVisible = isSameDay(checkIn, visibleBarStart);
                const isDepartureDayVisible = isSameDay(checkOut, visibleBarEnd);

                const barClasses = cn(
                  `absolute h-9 flex items-center justify-center font-semibold overflow-hidden whitespace-nowrap ${channelInfo.bgColor} ${channelInfo.textColor} shadow-sm transition-opacity`,
                  !isOwnerBlock && 'cursor-pointer hover:opacity-90', // Only allow click if not an owner block
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
                          gridRow: `${3 + roomIndex}`, // +1 for the header row, +1 for the days row
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
                        onClick={() => {
                          if (!isOwnerBlock) { // Only allow click if not an owner block
                            handleReservationClick(reservation);
                          }
                        }}
                      >
                        {isArrivalDayVisible && !isSingleDayStay && <LogIn className={cn("h-4 w-4 flex-shrink-0", isMobile && "h-3 w-3")} />}

                        {isSingleDayStay && <Sparkles className={cn("h-4 w-4 flex-shrink-0", isMobile && "h-3 w-3")} />}

                        <span className="flex-grow text-center px-1 truncate">
                          <span className="mr-1">{channelInfo.name.charAt(0).toUpperCase()}.</span>
                          <span className="mr-1">{numberOfNights}n</span>
                          <span className="mx-1">|</span>
                          <span className="truncate">{reservation.guest_name}</span>
                        </span>

                        {isDepartureDayVisible && !isSingleDayStay && <LogOut className={cn("h-4 w-4 flex-shrink-0", isMobile && "h-3 w-3")} />}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="p-2 text-sm">
                      <p className="font-bold">{reservation.guest_name}</p>
                      <p>Chambre: {reservation.property_name}</p>
                      <p>Du {format(checkIn, 'dd/MM/yyyy', { locale: fr })} au {format(checkOut, 'dd/MM/yyyy', { locale: fr })}</p>
                      <p>{numberOfNights} nuit(s)</p>
                      <p>Statut: {channelInfo.name}</p> {/* Display the descriptive name */}
                      <p>Montant: {reservation.amount}</p>
                      <p>Canal: {reservation.cod_channel || 'N/A'}</p> {/* Show original channel if available */}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
          </React.Fragment>
        ))}
      </div>

      {selectedReservation && (
        <Dialog open={isReservationDetailsDialogOpen} onOpenChange={setIsReservationDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Détails de la Réservation</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="guestName" className="text-right">
                  Client
                </Label>
                <Input id="guestName" value={selectedReservation.guest_name} className="col-span-3" readOnly />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="roomName" className="text-right">
                  Chambre
                </Label>
                <Input id="roomName" value={selectedReservation.property_name} className="col-span-3" readOnly />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="checkIn" className="text-right">
                  Arrivée
                </Label>
                <Input id="checkIn" value={format(parseISO(selectedReservation.check_in_date), 'dd/MM/yyyy', { locale: fr })} className="col-span-3" readOnly />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="checkOut" className="text-right">
                  Départ
                </Label>
                <Input id="checkOut" value={format(parseISO(selectedReservation.check_out_date), 'dd/MM/yyyy', { locale: fr })} className="col-span-3" readOnly />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nights" className="text-right">
                  Nuits
                </Label>
                <Input id="nights" value={differenceInDays(parseISO(selectedReservation.check_out_date), parseISO(selectedReservation.check_in_date))} className="col-span-3" readOnly />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Statut
                </Label>
                <Input id="status" value={channelColors[selectedReservation.status]?.name || selectedReservation.status} className="col-span-3" readOnly />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Montant
                </Label>
                <Input id="amount" value={selectedReservation.amount} className="col-span-3" readOnly />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="channel" className="text-right">
                  Canal
                </Label>
                <Input id="channel" value={selectedReservation.cod_channel || 'N/A'} className="col-span-3" readOnly />
              </div>
              {selectedReservation.email && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input id="email" value={selectedReservation.email} className="col-span-3" readOnly />
                </div>
              )}
              {selectedReservation.phone && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">
                    Téléphone
                  </Label>
                  <Input id="phone" value={selectedReservation.phone} className="col-span-3" readOnly />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default BookingPlanningGrid;