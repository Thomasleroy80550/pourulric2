"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Calendar, User, DollarSign, MapPin } from 'lucide-react';
import { format, parseISO, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

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

interface BookingListMobileProps {
  reservations: Reservation[];
  isLoading?: boolean;
}

const BookingListMobile: React.FC<BookingListMobileProps> = ({
  reservations,
  isLoading = false,
}) => {
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Grouper les réservations par logement
  const reservationsByRoom = useMemo(() => {
    const grouped = new Map<string, Reservation[]>();
    
    reservations.forEach(reservation => {
      if (!grouped.has(reservation.room_id)) {
        grouped.set(reservation.room_id, []);
      }
      grouped.get(reservation.room_id)!.push(reservation);
    });

    // Trier les réservations par date dans chaque groupe
    grouped.forEach((roomReservations) => {
      roomReservations.sort((a, b) => 
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );
    });

    return grouped;
  }, [reservations]);

  // Obtenir la liste des logements
  const rooms = useMemo(() => {
    return Array.from(reservationsByRoom.keys()).map(roomId => {
      const roomReservations = reservationsByRoom.get(roomId) || [];
      const firstReservation = roomReservations[0];
      return {
        id: roomId,
        name: firstReservation?.room_name || roomId,
        reservationCount: roomReservations.length,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [reservationsByRoom]);

  // Filtrer par statut
  const filteredRooms = useMemo(() => {
    if (selectedStatus === 'all') return rooms;
    
    return rooms.filter(room => {
      const roomReservations = reservationsByRoom.get(room.id) || [];
      return roomReservations.some(reservation => reservation.status === selectedStatus);
    });
  }, [rooms, selectedStatus, reservationsByRoom]);

  const toggleRoom = (roomId: string) => {
    const newExpanded = new Set(expandedRooms);
    if (newExpanded.has(roomId)) {
      newExpanded.delete(roomId);
    } else {
      newExpanded.add(roomId);
    }
    setExpandedRooms(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'BLOCKED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmé';
      case 'pending':
        return 'En attente';
      case 'cancelled':
        return 'Annulé';
      case 'BLOCKED':
        return 'Bloqué';
      default:
        return status;
    }
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

  if (reservations.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="p-3">
          <CardTitle className="text-lg">Réservations</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucune réservation trouvée</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardHeader className="p-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Réservations par logement</CardTitle>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs border rounded px-2 py-1 bg-background"
          >
            <option value="all">Tous</option>
            <option value="confirmed">Confirmés</option>
            <option value="pending">En attente</option>
            <option value="cancelled">Annulés</option>
            <option value="BLOCKED">Bloqués</option>
          </select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[70vh] w-full">
          <div className="space-y-2 p-2">
            {filteredRooms.map((room) => {
              const roomReservations = reservationsByRoom.get(room.id) || [];
              const isExpanded = expandedRooms.has(room.id);
              const today = new Date();
              
              // Filtrer les réservations par statut sélectionné
              const displayedReservations = selectedStatus === 'all' 
                ? roomReservations 
                : roomReservations.filter(r => r.status === selectedStatus);

              return (
                <div key={room.id} className="border rounded-lg overflow-hidden">
                  {/* En-tête du logement */}
                  <button
                    onClick={() => toggleRoom(room.id)}
                    className={cn(
                      "w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors",
                      "bg-gradient-to-r from-orange-50 to-orange-100"
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <MapPin className="h-4 w-4 text-orange-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0 text-left">
                        <h3 className="font-semibold text-sm truncate">{room.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {displayedReservations.length} réservation{displayedReservations.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-orange-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-orange-600" />
                      )}
                    </div>
                  </button>

                  {/* Liste des réservations */}
                  {isExpanded && displayedReservations.length > 0 && (
                    <div className="border-t bg-white">
                      {displayedReservations.map((reservation) => {
                        const startDate = parseISO(reservation.start_date);
                        const endDate = parseISO(reservation.end_date);
                        const isCurrent = startDate <= today && endDate >= today;
                        
                        return (
                          <div
                            key={reservation.id}
                            className={cn(
                              "p-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors",
                              isCurrent && "bg-orange-50 border-l-4 border-l-orange-500"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium text-sm truncate">{reservation.guest_name}</span>
                                </div>
                                
                                <div className="flex items-center gap-2 mb-2">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {format(startDate, 'dd MMM', { locale: fr })} - {format(endDate, 'dd MMM yyyy', { locale: fr })}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs font-semibold">{reservation.total_amount}€</span>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <span className="text-xs text-muted-foreground">{reservation.platform}</span>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-1">
                                <span className={cn(
                                  'px-2 py-1 rounded-full text-xs font-medium border',
                                  getStatusColor(reservation.status)
                                )}>
                                  {getStatusLabel(reservation.status)}
                                </span>
                                {isCurrent && (
                                  <span className="text-xs text-orange-600 font-medium">
                                    En cours
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Message si aucune réservation après filtrage */}
                  {isExpanded && displayedReservations.length === 0 && (
                    <div className="p-4 text-center text-muted-foreground text-sm border-t">
                      Aucune réservation {selectedStatus !== 'all' ? `avec le statut "${getStatusLabel(selectedStatus)}"` : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default BookingListMobile;