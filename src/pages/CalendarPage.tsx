import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BookingPlanningGrid from '@/components/BookingPlanningGrid';
import CalendarGridMobile from '@/components/CalendarGridMobile';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { PlusCircle, DollarSign } from 'lucide-react';
import OwnerReservationDialog from '@/components/OwnerReservationDialog';
import PriceRestrictionDialog from '@/components/PriceRestrictionDialog';
import { getUserRooms, UserRoom } from '@/lib/user-room-api';
import { fetchKrossbookingReservations, KrossbookingReservation, fetchKrossbookingRoomTypes } from '@/lib/krossbooking';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocation } from 'react-router-dom';
import { useSession } from "@/components/SessionContextProvider";
import BannedUserMessage from "@/components/BannedUserMessage";

const CalendarPage: React.FC = () => {
  const { profile, session } = useSession();
  const isMobile = useIsMobile();
  const [isOwnerReservationDialogOpen, setIsOwnerReservationDialogOpen] = useState(false);
  const [isPriceRestrictionDialogOpen, setIsPriceRestrictionDialogOpen] = useState(false);
  const [userRooms, setUserRooms] = useState<UserRoom[]>([]);
  const [reservations, setReservations] = useState<KrossbookingReservation[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        // 1. Fetch the user's configured rooms/types from Supabase
        const configuredUserRooms = await getUserRooms();

        if (configuredUserRooms.length === 0) {
          setUserRooms([]);
          setReservations([]);
          setLoadingData(false);
          return;
        }

        // 2. Fetch all room type definitions from Krossbooking
        const krossbookingRoomTypes = await fetchKrossbookingRoomTypes();
        if (krossbookingRoomTypes.length === 0) {
          console.warn("Krossbooking returned no room types. Calendar will be empty.");
          setUserRooms([]);
          setReservations([]);
          setLoadingData(false);
          return;
        }

        // 3. Process configured rooms to build a list for display and a list for fetching reservations
        const flattenedUserRooms: UserRoom[] = [];
        const roomTypesToFetchReservationsFor = new Map<string, UserRoom>();

        configuredUserRooms.forEach(configuredRoom => {
          // Case A: Check if the configured ID matches a ROOM TYPE ID
          const matchingKrossbookingType = krossbookingRoomTypes.find(
            kType => kType.id_room_type.toString() === configuredRoom.room_id
          );

          if (matchingKrossbookingType) {
            // It's a room type. Add its parent type for fetching reservations.
            if (!roomTypesToFetchReservationsFor.has(configuredRoom.room_id)) {
              roomTypesToFetchReservationsFor.set(configuredRoom.room_id, configuredRoom);
            }
            // Add all its actual rooms to the display list.
            matchingKrossbookingType.rooms.forEach(actualRoom => {
              flattenedUserRooms.push({
                id: `${configuredRoom.id}-${actualRoom.id_room}`,
                user_id: configuredRoom.user_id,
                room_id: actualRoom.id_room.toString(),
                room_name: actualRoom.label,
              });
            });
          } else {
            // Case B: Check if the configured ID matches an ACTUAL ROOM ID inside any type
            for (const kType of krossbookingRoomTypes) {
              const matchingActualRoom = kType.rooms.find(
                actualRoom => actualRoom.id_room.toString() === configuredRoom.room_id
              );
              if (matchingActualRoom) {
                // It's an actual room. Add it to the display list.
                flattenedUserRooms.push({
                  id: configuredRoom.id,
                  user_id: configuredRoom.user_id,
                  room_id: matchingActualRoom.id_room.toString(),
                  room_name: matchingActualRoom.label,
                });
                
                // Add its parent room type for fetching reservations.
                const parentRoomTypeAsUserRoom: UserRoom = {
                  id: kType.id_room_type.toString(),
                  user_id: configuredRoom.user_id,
                  room_id: kType.id_room_type.toString(),
                  room_name: kType.label
                };
                if (!roomTypesToFetchReservationsFor.has(parentRoomTypeAsUserRoom.room_id)) {
                  roomTypesToFetchReservationsFor.set(parentRoomTypeAsUserRoom.room_id, parentRoomTypeAsUserRoom);
                }
                break; // Found it, move to the next configured room
              }
            }
          }
        });

        // 4. Finalize lists and fetch reservations
        const uniqueFlattenedUserRooms = Array.from(new Map(flattenedUserRooms.map(room => [room.room_id, room])).values());
        setUserRooms(uniqueFlattenedUserRooms);

        if (roomTypesToFetchReservationsFor.size > 0) {
          const reservationTypes = Array.from(roomTypesToFetchReservationsFor.values());
          const fetchedReservations = await fetchKrossbookingReservations(reservationTypes, uniqueFlattenedUserRooms);
          setReservations(fetchedReservations);
        } else {
          // This can happen if configured IDs don't match anything in Krossbooking
          console.warn("No matching rooms or room types found in Krossbooking for the current configuration.");
          setReservations([]);
        }

      } catch (error) {
        console.error("Error fetching data for CalendarPage:", error);
      } finally {
        setLoadingData(false);
      }
    };
    if (!profile?.is_banned) {
      fetchData();
    } else {
      setLoadingData(false);
    }
  }, [refreshTrigger, profile, session]);

  useEffect(() => {
    if (location.state?.openOwnerReservationDialog) {
      setIsOwnerReservationDialogOpen(true);
      window.history.replaceState({}, document.title); 
    }
  }, [location.state]);

  const handleReservationChange = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handlePriceRestrictionSaved = () => {
    setIsPriceRestrictionDialogOpen(false);
  };

  if (profile?.is_banned) {
    return (
      <MainLayout>
        <BannedUserMessage />
      </MainLayout>
    );
  }

  if (loadingData) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <div className="flex justify-between items-center mb-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-48" />
          </div>
          <Card className="shadow-md">
            <CardHeader>
              <Skeleton className="h-6 w-64" />
            </CardHeader>
            <CardContent className="p-4">
              <Skeleton className="h-[400px] w-full" />
            </CardContent>
          </Card>
          <Card className="shadow-md mt-6">
            <CardHeader>
              <Skeleton className="h-6 w-56" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold">Calendrier</h1>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={() => setIsOwnerReservationDialogOpen(true)} className="flex items-center w-full sm:w-auto">
              <PlusCircle className="h-4 w-4 mr-2" />
              Réservation Propriétaire
            </Button>
            <Button onClick={() => setIsPriceRestrictionDialogOpen(true)} variant="outline" className="flex items-center w-full sm:w-auto">
              <DollarSign className="h-4 w-4 mr-2" />
              Configurer Prix & Restrictions
            </Button>
          </div>
        </div>
        
        {isMobile ? (
          <CalendarGridMobile 
            refreshTrigger={refreshTrigger} 
            userRooms={userRooms} 
            reservations={reservations}
            onReservationChange={handleReservationChange}
          />
        ) : (
          <BookingPlanningGrid 
            refreshTrigger={refreshTrigger} 
            userRooms={userRooms} 
            reservations={reservations}
            onReservationChange={handleReservationChange}
          />
        )}
      
      </div>
      <OwnerReservationDialog
        isOpen={isOwnerReservationDialogOpen}
        onOpenChange={setIsOwnerReservationDialogOpen}
        userRooms={userRooms}
        allReservations={reservations}
        onReservationCreated={handleReservationChange}
      />
      <PriceRestrictionDialog
        isOpen={isPriceRestrictionDialogOpen}
        onOpenChange={setIsPriceRestrictionDialogOpen}
        userRooms={userRooms}
        onSettingsSaved={handlePriceRestrictionSaved}
      />
    </MainLayout>
  );
};

export default CalendarPage;