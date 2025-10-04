"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, Calendar, ZoomIn, ZoomOut, Filter } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Reservation {
  id: string;
  room_id: string;
  room_name: string;
  start_date: string;
  end_date: string;
  guest_name: string;
  status: string;
  platform: string;
  total_amount: number;
}

interface BookingPlanningGridMobileProps {
  reservations: Reservation[];
  isLoading?: boolean;
}

const BookingPlanningGridMobile: React.FC<BookingPlanningGridMobileProps> = ({
  reservations,
  isLoading = false,
}) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');

  // Calculer la plage de dates de la semaine
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  }, [weekStart]);

  // Obtenir la liste des chambres uniques
  const rooms = useMemo(() => {
    const uniqueRooms = Array.from(new Set(reservations.map(r => r.room_id)));
    return uniqueRooms.map(roomId => {
      const reservation = reservations.find(r => r.room_id === roomId);
      return {
        id: roomId,
        name: reservation?.room_name || roomId,
      };
    });
  }, [reservations]);

  // Filtrer les réservations par chambre sélectionnée
  const filteredReservations = useMemo(() => {
    if (selectedRoom === 'all') return reservations;
    return reservations.filter(r => r.room_id === selectedRoom);
  }, [reservations, selectedRoom]);

  // Obtenir les réservations pour une chambre et un jour spécifiques
  const getReservationsForRoomAndDay = (roomId: string, day: Date) => {
    return filteredReservations.filter(reservation => {
      if (reservation.room_id !== roomId) return false;
      const startDate = parseISO(reservation.start_date);
      const endDate = parseISO(reservation.end_date);
      return day >= startDate && day <= endDate;
    });
  };

  // Navigation entre les semaines
  const goToPreviousWeek = () => {
    setCurrentWeek(prev => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    setCurrentWeek(prev => addDays(prev, 7));
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(new Date());
  };

  // Contrôle du zoom
  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 1.5));
  };

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.6));
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardHeader className="p-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Planning des réservations</CardTitle>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={zoomOut}
                className="h-8 w-8"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={zoomIn}
                className="h-8 w-8"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Navigation et contrôles */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousWeek}
                className="h-8 px-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={goToCurrentWeek}
                className="h-8 px-3 text-sm"
              >
                <Calendar className="h-4 w-4 mr-1" />
                {format(currentWeek, 'MMM yyyy', { locale: fr })}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextWeek}
                className="h-8 px-2"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Sélecteur de chambre et mode de vue */}
            <div className="flex gap-2">
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger className="h-8 text-sm flex-1">
                  <SelectValue placeholder="Toutes les chambres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les chambres</SelectItem>
                  {rooms.map(room => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={viewMode} onValueChange={(value: 'week' | 'day') => setViewMode(value)}>
                <SelectTrigger className="h-8 text-sm w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Semaine</SelectItem>
                  <SelectItem value="day">Jour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="w-full" style={{ maxWidth: '100vw' }}>
          <div 
            className="min-w-full"
            style={{ 
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top left'
            }}
          >
            {/* En-tête des jours */}
            <div className="grid grid-cols-8 border-b bg-muted/50">
              <div className="p-2 text-xs font-medium text-center border-r min-w-[80px]">
                Chambres
              </div>
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="p-2 text-xs font-medium text-center border-r min-w-[60px]">
                  <div className="font-semibold">
                    {format(day, 'EEE', { locale: fr })}
                  </div>
                  <div className={cn(
                    "text-lg",
                    isSameDay(day, new Date()) && "bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center mx-auto"
                  )}>
                    {format(day, 'd')}
                  </div>
                </div>
              ))}
            </div>

            {/* Corps du planning */}
            <div className="min-w-full">
              {(selectedRoom === 'all' ? rooms : [{ id: selectedRoom, name: rooms.find(r => r.id === selectedRoom)?.name || selectedRoom }]).map((room) => (
                <div key={room.id} className="grid grid-cols-8 border-b hover:bg-muted/30">
                  {/* Nom de la chambre */}
                  <div className="p-2 text-xs font-medium border-r bg-muted/20 flex items-center justify-center text-center min-w-[80px]">
                    <span className="truncate">{room.name}</span>
                  </div>
                  
                  {/* Cases pour chaque jour */}
                  {weekDays.map((day) => {
                    const dayReservations = getReservationsForRoomAndDay(room.id, day);
                    const isToday = isSameDay(day, new Date());
                    
                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "p-1 border-r min-h-[60px] min-w-[60px] relative",
                          isToday && "bg-orange-500/10",
                          "hover:bg-orange-500/5"
                        )}
                      >
                        {dayReservations.map((reservation) => (
                          <div
                            key={reservation.id}
                            className={cn(
                              "text-xs p-1 rounded mb-1 truncate cursor-pointer transition-all",
                              "hover:scale-105 hover:shadow-md",
                              reservation.status === 'confirmed' && "bg-green-500/20 text-green-700 border border-green-500/30",
                              reservation.status === 'pending' && "bg-yellow-500/20 text-yellow-700 border border-yellow-500/30",
                              reservation.status === 'cancelled' && "bg-red-500/20 text-red-700 border border-red-500/30",
                              "bg-opacity-80 backdrop-blur-sm"
                            )}
                            title={`${reservation.guest_name} - ${reservation.platform} - ${reservation.total_amount}€`}
                          >
                            <div className="font-semibold truncate text-[10px]">{reservation.guest_name}</div>
                            <div className="text-[9px] opacity-75">{reservation.platform}</div>
                            <div className="text-[9px] font-bold">{reservation.total_amount}€</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default BookingPlanningGridMobile;