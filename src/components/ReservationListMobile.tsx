"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Calendar, User, DollarSign, MapPin } from 'lucide-react';
import { format, parseISO, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
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

interface ReservationListMobileProps {
  reservations: Reservation[];
  isLoading?: boolean;
}

const ReservationListMobile: React.FC<ReservationListMobileProps> = ({
  reservations,
  isLoading = false,
}) => {
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

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

  // Filtrer les réservations par statut
  const filteredReservations = useMemo(() => {
    if (selectedStatus === 'all') return reservations;
    return reservations.filter(r => r.status === selectedStatus);
  }, [reservations, selectedStatus]);

  // Obtenir les réservations pour une chambre spécifique
  const getReservationsForRoom = (roomId: string) => {
    return filteredReservations.filter(r => r.room_id === roomId)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  };

  // Basculer l'expansion d'une chambre
  const toggleRoomExpansion = (roomId: string) => {
    const newExpanded = new Set(expandedRooms);
    if (newExpanded.has(roomId)) {
      newExpanded.delete(roomId);
    } else {
      newExpanded.add(roomId);
    }
    setExpandedRooms(newExpanded);
  };

  // Obtenir le nombre total de réservations par statut
  const getReservationCount = (status?: string) => {
    if (!status) return reservations.length;
    return reservations.filter(r => r.status === status).length;
  };

  // Formater la date pour mobile
  const formatMobileDate = (dateString: string) => {
    const date = parseISO(dateString);
    const today = new Date();
    const isToday = isSameDay(date, today);
    
    if (isToday) {
      return "Aujourd'hui";
    }
    return format(date, 'dd MMM', { locale: fr });
  };

  // Obtenir la couleur du badge selon le statut
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      case 'BLOCKED':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // Obtenir le libellé du statut
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

  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardHeader className="p-3">
        <div className="flex flex-col gap-3">
          <CardTitle className="text-lg">Réservations</CardTitle>
          
          {/* Filtres par statut */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus('all')}
              className="text-xs whitespace-nowrap"
            >
              Toutes ({getReservationCount()})
            </Button>
            <Button
              variant={selectedStatus === 'confirmed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus('confirmed')}
              className="text-xs whitespace-nowrap"
            >
              Confirmées ({getReservationCount('confirmed')})
            </Button>
            <Button
              variant={selectedStatus === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus('pending')}
              className="text-xs whitespace-nowrap"
            >
              En attente ({getReservationCount('pending')})
            </Button>
            <Button
              variant={selectedStatus === 'cancelled' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus('cancelled')}
              className="text-xs whitespace-nowrap"
            >
              Annulées ({getReservationCount('cancelled')})
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[70vh] w-full">
          <div className="p-3 space-y-3">
            {rooms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Aucune réservation trouvée</p>
              </div>
            ) : (
              rooms.map((room) => {
                const roomReservations = getReservationsForRoom(room.id);
                const isExpanded = expandedRooms.has(room.id);
                const hasReservations = roomReservations.length > 0;

                return (
                  <div key={room.id} className="border rounded-lg overflow-hidden">
                    {/* En-tête du logement */}
                    <button
                      onClick={() => toggleRoomExpansion(room.id)}
                      className={cn(
                        "w-full p-3 flex items-center justify-between transition-colors",
                        "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-orange-500",
                        isExpanded && "bg-muted/30"
                      )}
                      disabled={!hasReservations}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <MapPin className="h-4 w-4 text-orange-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0 text-left">
                          <h3 className="font-semibold text-sm truncate">{room.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {roomReservations.length} réservation{roomReservations.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasReservations && (
                          <>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </>
                        )}
                      </div>
                    </button>

                    {/* Liste des réservations */}
                    {isExpanded && hasReservations && (
                      <div className="border-t bg-muted/10">
                        {roomReservations.map((reservation, index) => (
                          <div
                            key={reservation.id}
                            className={cn(
                              "p-3 border-b last:border-b-0",
                              index % 2 === 0 && "bg-white/50"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  <h4 className="font-medium text-sm truncate">{reservation.guest_name}</h4>
                                </div>
                                
                                <div className="flex items-center gap-2 mb-2">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {formatMobileDate(reservation.start_date)} - {formatMobileDate(reservation.end_date)}
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
                                <Badge variant={getStatusBadgeVariant(reservation.status)} className="text-xs">
                                  {getStatusLabel(reservation.status)}
                                </Badge>
                                {reservation.status === 'BLOCKED' && (
                                  <span className="text-xs text-muted-foreground">Période bloquée</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ReservationListMobile;