import React, { useCallback } from 'react';
import { KrossbookingReservation } from '@/lib/krossbooking';
import { UserRoom } from '@/lib/user-room-api';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, parseISO, startOfDay, addDays, isValid, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowRight, ArrowLeft } from 'lucide-react';

interface TwelveMonthViewProps {
  userRooms: UserRoom[];
  reservations: KrossbookingReservation[];
}

const TwelveMonthView: React.FC<TwelveMonthViewProps> = ({ userRooms, reservations }) => {
  const today = new Date();
  const months = Array.from({ length: 12 }, (_, i) => addMonths(today, i));

  const getDayStatus = useCallback((day: Date) => {
    const dayStart = startOfDay(day);
    
    const arrivals = new Set<string>();
    const departures = new Set<string>();
    const bookedRooms = new Set<string>();

    for (const reservation of reservations) {
      if (reservation.status === 'CANC') continue;

      const checkIn = parseISO(reservation.check_in_date);
      const checkOut = parseISO(reservation.check_out_date);

      if (isValid(checkIn) && isValid(checkOut)) {
        if (isSameDay(dayStart, checkIn)) {
          arrivals.add(reservation.krossbooking_room_id);
        }
        if (isSameDay(dayStart, checkOut)) {
          departures.add(reservation.krossbooking_room_id);
        }
        if (checkOut > checkIn) {
          const interval = { start: startOfDay(checkIn), end: startOfDay(addDays(checkOut, -1)) };
          if (isWithinInterval(dayStart, interval)) {
            bookedRooms.add(reservation.krossbooking_room_id);
          }
        }
      }
    }

    const userRoomIds = new Set(userRooms.map(r => r.room_id));

    const isArrival = [...arrivals].some(id => userRoomIds.has(id));
    const isDeparture = [...departures].some(id => userRoomIds.has(id));
    
    const bookedUserRoomsCount = userRooms.filter(room => bookedRooms.has(room.room_id)).length;
    
    const allRoomsBooked = userRooms.length > 0 && bookedUserRoomsCount >= userRooms.length;

    return { isArrival, isDeparture, allRoomsBooked };
  }, [reservations, userRooms]);

  if (userRooms.length === 0) {
    return (
      <p className="text-gray-500 mt-4">
        Aucune chambre configurée. Veuillez ajouter des chambres pour voir la vue annuelle.
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {months.map((month, index) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
          const startingDayOffset = monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1;

          return (
            <Card key={index} className="shadow-md">
              <CardHeader>
                <CardTitle className="text-center text-base font-semibold capitalize">
                  {format(month, 'MMMM yyyy', { locale: fr })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500">
                  <div>Lu</div>
                  <div>Ma</div>
                  <div>Me</div>
                  <div>Je</div>
                  <div>Ve</div>
                  <div>Sa</div>
                  <div>Di</div>
                </div>
                <div className="grid grid-cols-7 gap-1 mt-2">
                  {Array.from({ length: startingDayOffset }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {days.map((day, dayIndex) => {
                    const { isArrival, isDeparture, allRoomsBooked } = getDayStatus(day);
                    return (
                      <div
                        key={dayIndex}
                        className={cn(
                          'h-8 w-8 flex items-center justify-center rounded-full text-xs relative overflow-hidden',
                          allRoomsBooked ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800',
                          isSameDay(day, today) && 'ring-2 ring-blue-500'
                        )}
                      >
                        {isArrival && (
                          <div className="absolute left-0 top-0 h-full w-1/2 bg-black/20" style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }} />
                        )}
                        {isDeparture && (
                          <div className="absolute right-0 top-0 h-full w-1/2 bg-black/20" style={{ clipPath: 'polygon(100% 0, 0 50%, 100% 100%)' }} />
                        )}
                        <span className="relative z-10 font-semibold">{format(day, 'd')}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="mt-8 p-4 border rounded-md bg-gray-50 dark:bg-gray-800">
        <h3 className="text-md font-semibold mb-3">Légende</h3>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <div className="flex items-center">
            <span className="w-4 h-4 rounded-full mr-2 bg-green-200"></span>
            <span className="text-sm text-gray-700 dark:text-gray-300">Disponible</span>
          </div>
          <div className="flex items-center">
            <span className="w-4 h-4 rounded-full mr-2 bg-red-200"></span>
            <span className="text-sm text-gray-700 dark:text-gray-300">Tout réservé</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 relative mr-2">
              <div className="absolute left-0 top-0 h-full w-1/2 bg-black/20" style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }} />
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Jour d'arrivée</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 relative mr-2">
              <div className="absolute right-0 top-0 h-full w-1/2 bg-black/20" style={{ clipPath: 'polygon(100% 0, 0 50%, 100% 100%)' }} />
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Jour de départ</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwelveMonthView;