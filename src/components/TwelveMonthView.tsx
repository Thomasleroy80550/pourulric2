import React, { useState, useCallback } from 'react';
import { KrossbookingReservation } from '@/lib/krossbooking';
import { UserRoom } from '@/lib/user-room-api';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, startOfDay, addDays, isValid, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TwelveMonthViewProps {
  userRooms: UserRoom[];
  reservations: KrossbookingReservation[];
}

const TwelveMonthView: React.FC<TwelveMonthViewProps> = ({ userRooms, reservations }) => {
  const today = new Date();
  const months = Array.from({ length: 12 }, (_, i) => addMonths(today, i));
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');

  const getDayStatus = useCallback((day: Date) => {
    const dayStart = startOfDay(day);
    
    const roomsToConsider = selectedRoomId === 'all'
      ? userRooms
      : userRooms.filter(r => r.room_id === selectedRoomId);
    
    if (roomsToConsider.length === 0) {
        return { isArrival: false, isDeparture: false, isBooked: false };
    }

    const consideredRoomIds = new Set(roomsToConsider.map(r => r.room_id));
    
    const arrivals = new Set<string>();
    const departures = new Set<string>();
    const bookedRooms = new Set<string>();

    for (const reservation of reservations) {
      if (reservation.status === 'CANC') continue;

      const [ciYear, ciMonth, ciDay] = reservation.check_in_date.split('-').map(Number);
      const checkIn = new Date(ciYear, ciMonth - 1, ciDay);

      const [coYear, coMonth, coDay] = reservation.check_out_date.split('-').map(Number);
      const checkOut = new Date(coYear, coMonth - 1, coDay);

      if (isValid(checkIn) && isValid(checkOut)) {
        if (isSameDay(dayStart, checkIn)) {
          arrivals.add(reservation.krossbooking_room_id);
        }
        if (isSameDay(dayStart, checkOut)) {
          departures.add(reservation.krossbooking_room_id);
        }
        if (checkOut > checkIn) {
          const interval = { start: checkIn, end: addDays(checkOut, -1) };
          if (isWithinInterval(dayStart, interval)) {
            bookedRooms.add(reservation.krossbooking_room_id);
          }
        }
      }
    }

    const isArrival = [...arrivals].some(id => consideredRoomIds.has(id));
    const isDeparture = [...departures].some(id => consideredRoomIds.has(id));
    
    const bookedConsideredRoomsCount = roomsToConsider.filter(room => bookedRooms.has(room.room_id)).length;
    
    const isBooked = roomsToConsider.length > 0 && bookedConsideredRoomsCount >= roomsToConsider.length;

    return { isArrival, isDeparture, isBooked };
  }, [reservations, userRooms, selectedRoomId]);

  if (userRooms.length === 0) {
    return (
      <p className="text-gray-500 mt-4">
        Aucune chambre configurée. Veuillez ajouter des chambres pour voir la vue annuelle.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-6 max-w-sm">
        <label htmlFor="room-select" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
          Afficher le calendrier pour :
        </label>
        <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
          <SelectTrigger id="room-select">
            <SelectValue placeholder="Sélectionner un logement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les logements</SelectItem>
            {userRooms.map(room => (
              <SelectItem key={room.id} value={room.room_id}>
                {room.room_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
                    const { isArrival, isBooked, isDeparture } = getDayStatus(day);
                    
                    const isChangeover = isDeparture && isBooked && isArrival;
                    const isOnlyDeparture = isDeparture && !isBooked && !isArrival;
                    const isOnlyArrival = isArrival && isBooked && !isDeparture;

                    return (
                      <div
                        key={dayIndex}
                        className={cn(
                          'h-8 w-8 flex items-center justify-center text-xs',
                          isSameDay(day, today) && 'ring-2 ring-blue-500',
                          {
                            "bg-[linear-gradient(to_bottom_right,theme(colors.red.200)_49%,theme(colors.green.200)_51%)] text-gray-800": isChangeover,
                            "bg-[linear-gradient(to_right,theme(colors.green.200)_60%,theme(colors.red.200)_60%)] text-red-800": isOnlyArrival,
                            "bg-[linear-gradient(to_right,theme(colors.red.200)_40%,theme(colors.green.200)_40%)] text-gray-800": isOnlyDeparture,
                            'bg-red-200 text-red-800': isBooked && !isOnlyArrival && !isChangeover,
                            'bg-green-200 text-green-800': !isBooked && !isOnlyDeparture,
                          }
                        )}
                      >
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
            <span className="w-4 h-4 mr-2 bg-green-200"></span>
            <span className="text-sm text-gray-700 dark:text-gray-300">Disponible</span>
          </div>
          <div className="flex items-center">
            <span className="w-4 h-4 mr-2 bg-red-200"></span>
            <span className="text-sm text-gray-700 dark:text-gray-300">{selectedRoomId === 'all' ? 'Tout réservé' : 'Réservé'}</span>
          </div>
          <div className="flex items-center">
            <span className="w-4 h-4 mr-2 bg-[linear-gradient(to_right,theme(colors.green.200)_60%,theme(colors.red.200)_60%)]"></span>
            <span className="text-sm text-gray-700 dark:text-gray-300">Jour d'arrivée</span>
          </div>
          <div className="flex items-center">
            <span className="w-4 h-4 mr-2 bg-[linear-gradient(to_right,theme(colors.red.200)_40%,theme(colors.green.200)_40%)]"></span>
            <span className="text-sm text-gray-700 dark:text-gray-300">Jour de départ</span>
          </div>
          <div className="flex items-center">
            <span className="w-4 h-4 mr-2 bg-[linear-gradient(to_bottom_right,theme(colors.red.200)_49%,theme(colors.green.200)_51%)]"></span>
            <span className="text-sm text-gray-700 dark:text-gray-300">Départ & Arrivée</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwelveMonthView;