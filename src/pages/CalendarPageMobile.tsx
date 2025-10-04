"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import BookingListMobile from '@/components/BookingListMobile';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchKrossbookingReservations, KrossbookingReservation, fetchKrossbookingRoomTypes, clearReservationsCache } from '@/lib/krossbooking';
import { getUserRooms, UserRoom } from '@/lib/user-room-api';
import { getOverrides } from '@/lib/price-override-api';
import { addDays, format } from 'date-fns';
import { useSession } from "@/components/SessionContextProvider";

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

const CalendarPageMobile: React.FC = () => {
  const { toast } = useToast();
  const { profile } = useSession();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch des données
  useEffect(() => {
    const fetchData = async () => {
      if (!profile || profile.is_banned || profile.is_payment_suspended) {
        setLoadingData(false);
        return;
      }

      setLoadingData(true);
      try {
        // 1. Récupérer les chambres configurées
        const configuredUserRooms = await getUserRooms();
        
        if (configuredUserRooms.length === 0) {
          setReservations([]);
          setLoadingData(false);
          return;
        }

        // 2. Récupérer les types de chambres Krossbooking
        const krossbookingRoomTypes = await fetchKrossbookingRoomTypes(refreshTrigger > 0);
        
        if (krossbookingRoomTypes.length === 0) {
          setReservations([]);
          setLoadingData(false);
          return;
        }

        // 3. Mapper les chambres configurées avec Krossbooking
        const flattenedKrossbookingRooms: { id_room: number; label: string; }[] = [];
        krossbookingRoomTypes.forEach(type => {
          flattenedKrossbookingRooms.push(...type.rooms);
        });

        const validUserRooms = configuredUserRooms.filter(configuredRoom => 
          flattenedKrossbookingRooms.some(actualRoom => 
            actualRoom.id_room.toString() === configuredRoom.room_id
          )
        );

        // 4. Récupérer les réservations
        let fetchedReservations: KrossbookingReservation[] = [];
        if (validUserRooms.length > 0) {
          fetchedReservations = await fetchKrossbookingReservations(validUserRooms, refreshTrigger > 0);
        }

        // 5. Convertir les périodes bloquées en réservations
        const priceOverrides = await getOverrides();
        const closedBlocks = priceOverrides
          .filter(override => override.closed)
          .map((override): Reservation => ({
            id: `override-${override.id}`,
            room_id: override.room_id,
            room_name: override.room_name,
            start_date: override.start_date,
            end_date: format(addDays(new Date(override.end_date), 1), 'yyyy-MM-dd'),
            guest_name: 'Période bloquée',
            status: 'BLOCKED',
            platform: 'OWNER_BLOCK',
            total_amount: 0
          }));

        // 6. Convertir les réservations Krossbooking au format local
        const convertedReservations: Reservation[] = fetchedReservations.map(r => ({
          id: r.id,
          room_id: r.krossbooking_room_id || r.property_name,
          room_name: r.property_name,
          start_date: r.check_in_date,
          end_date: r.check_out_date,
          guest_name: r.guest_name,
          status: r.status,
          platform: r.channel_identifier || 'Unknown',
          total_amount: parseFloat(r.amount) || 0
        }));

        setReservations([...convertedReservations, ...closedBlocks]);

      } catch (error) {
        console.error("Error fetching data for CalendarPageMobile:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les réservations",
          variant: "destructive",
        });
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [refreshTrigger, profile, toast]);

  const handleRefresh = () => {
    clearReservationsCache();
    setRefreshTrigger(prev => prev + 1);
    toast({
      title: "Actualisation",
      description: "Le calendrier est en cours de rafraîchissement",
    });
  };

  if (loadingData) {
    return (
      <div className="container mx-auto p-2 space-y-4">
        <Card>
          <CardHeader className="p-3">
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="p-2">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2 space-y-4 max-w-full overflow-hidden">
      <Card>
        <CardHeader className="p-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Réservations
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="h-8 px-2"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <BookingListMobile 
            reservations={reservations} 
            isLoading={loadingData}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarPageMobile;