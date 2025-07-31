import React from 'react';
import { KrossbookingReservation } from '@/lib/krossbooking';
import { UserRoom } from '@/lib/user-room-api';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, parseISO, startOfDay, addDays, isValid, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TwelveMonthViewProps {
  userRooms: UserRoom[];
  reservations: KrossbookingReservation[];
}

const TwelveMonthView: React.FC<TwelveMonthViewProps> = ({ userRooms, reservations }) => {
  const today = new Date();
  const months = Array.from({ length: 12 }, (_, i) => addMonths(today, i));

  const isDayBooked = (day: Date): boolean => {
    const dayStart = startOfDay(day);
    for (const reservation of reservations) {
      // Skip cancelled or blocked reservations for this view
      if (reservation.status === 'CANC' || reservation.status === 'BLOCKED') continue;

      const checkIn = parseISO(reservation.check_in_date);
      const checkOut = parseISO(reservation.check_out_date);

      if (isValid(checkIn) && isValid(checkOut) && checkOut > checkIn) {
        // Interval is inclusive of start, exclusive of end for booking purposes
        const interval = { start: startOfDay(checkIn), end: startOfDay(addDays(checkOut, -1)) };
        if (isWithinInterval(dayStart, interval)) {
          return true;
        }
      }
    }
    return false;
  };

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
          // Adjust for Monday-first week (fr locale)
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
                    const booked = isDayBooked(day);
                    return (
                      <div
                        key={dayIndex}
                        className={cn(
                          'h-8 w-8 flex items-center justify-center rounded-full text-xs',
                          booked ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800',
                          isSameDay(day, today) && 'ring-2 ring-blue-500'
                        )}
                      >
                        {format(day, 'd')}
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
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center">
            <span className="w-4 h-4 rounded-full mr-2 bg-green-200"></span>
            <span className="text-sm text-gray-700 dark:text-gray-300">Disponible</span>
          </div>
          <div className="flex items-center">
            <span className="w-4 h-4 rounded-full mr-2 bg-red-200"></span>
            <span className="text-sm text-gray-700 dark:text-gray-300">Réservé</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwelveMonthView;