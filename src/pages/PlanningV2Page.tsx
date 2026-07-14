"use client";

import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import PlanningGanttV2 from '@/components/planning-v2/PlanningGanttV2';
import { getUserRooms, UserRoom } from '@/lib/user-room-api';
import {
  fetchKrossbookingReservations,
  fetchKrossbookingRoomTypes,
  KrossbookingReservation,
} from '@/lib/krossbooking';
import { getOverrides } from '@/lib/price-override-api';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FlaskConical } from 'lucide-react';
import { addDays, format } from 'date-fns';

/**
 * Version PRIVÉE / DEV du planning (Gantt horizontal).
 * Route non listée dans le menu : /planning-v2
 * Branchée sur les mêmes données que la page Calendrier (Krossbooking + blocs propriétaire).
 */
const PlanningV2Page: React.FC = () => {
  const [userRooms, setUserRooms] = useState<UserRoom[]>([]);
  const [reservations, setReservations] = useState<KrossbookingReservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const configuredUserRooms = await getUserRooms();
        if (configuredUserRooms.length === 0) {
          setUserRooms([]);
          setReservations([]);
          return;
        }

        const roomTypes = await fetchKrossbookingRoomTypes();
        const flattenedRooms: { id_room: number }[] = [];
        roomTypes.forEach((type) => flattenedRooms.push(...type.rooms));

        const validRooms: UserRoom[] = [];
        configuredUserRooms.forEach((configuredRoom) => {
          const match = flattenedRooms.find(
            (r) => r.id_room.toString() === configuredRoom.room_id,
          );
          if (match) validRooms.push(configuredRoom);
        });

        const uniqueRooms = Array.from(
          new Map(validRooms.map((r) => [r.room_id, r])).values(),
        );
        setUserRooms(uniqueRooms);

        let fetched: KrossbookingReservation[] = [];
        if (uniqueRooms.length > 0) {
          fetched = await fetchKrossbookingReservations(uniqueRooms);
        }

        // Blocs propriétaire (périodes bloquées)
        const overrides = await getOverrides();
        const closedBlocks: KrossbookingReservation[] = overrides
          .filter((o) => o.closed)
          .map((o) => ({
            id: `override-${o.id}`,
            guest_name: 'Période bloquée',
            property_name: o.room_name,
            krossbooking_room_id: o.room_id,
            check_in_date: o.start_date,
            check_out_date: format(addDays(new Date(o.end_date), 1), 'yyyy-MM-dd'),
            status: 'BLOCKED',
            amount: '',
            cod_channel: 'OWNER_BLOCK',
            channel_identifier: 'OWNER_BLOCK',
            email: '',
            phone: '',
            tourist_tax_amount: 0,
            property_id: 0,
          }));

        setReservations([...fetched, ...closedBlocks]);
      } catch (error) {
        console.error('Error fetching data for PlanningV2Page:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <MainLayout>
      <div className="w-full py-6 px-2 sm:px-4 space-y-4">
        <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <FlaskConical className="h-4 w-4 text-amber-600" />
          <AlertTitle>Version privée (développement)</AlertTitle>
          <AlertDescription>
            Nouvelle version du planning en cours de développement. Accessible uniquement via{' '}
            <code className="text-xs">/planning-v2</code>. La version actuelle n'est pas modifiée.
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : userRooms.length === 0 ? (
          <p className="text-muted-foreground">
            Aucune chambre configurée. Ajoutez des chambres via la page « Mon Profil » pour voir le planning.
          </p>
        ) : (
          <PlanningGanttV2 userRooms={userRooms} reservations={reservations} />
        )}
      </div>
    </MainLayout>
  );
};

export default PlanningV2Page;
