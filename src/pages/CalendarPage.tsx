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
import { useLocation } from 'react-router-dom'; // Corrected syntax
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

        // 3. Process configured rooms to build a flat list of actual rooms to display and fetch reservations for.
        const flattenedUserRooms: UserRoom[] = [];

        configuredUserRooms.forEach(configuredRoom => {
          // Case A: Check if the configured ID matches a ROOM TYPE ID
          const matchingKrossbookingType = krossbookingRoomTypes.find(
            kType => kType.id_room_type.toString() === configuredRoom.room_id
          );

          if (matchingKrossbookingType) {
            // It's a room type. Add all its actual rooms to the display list, prepending the user-defined group name.
            matchingKrossbookingType.rooms.forEach(actualRoom => {
              flattenedUserRooms.push({
                id: `${configuredRoom.id}-${actualRoom.id_room}`,
                user_id: configuredRoom.user_id,
                room_id: actualRoom.id_room.toString(),
                room_name: `${configuredRoom.room_name} - ${actualRoom.label}`,
              });
            });
          } else {
            // Case B: Check if the configured ID matches an ACTUAL ROOM ID inside any type
            let roomFound = false;
            for (const kType of krossbookingRoomTypes) {
              const matchingActualRoom = kType.rooms.find(
                actualRoom => actualRoom.id_room.toString() === configuredRoom.room_id
              );
              if (matchingActualRoom) {
                // It's an actual room. Use the user-defined name for it.
                flattenedUserRooms.push({
                  id: configuredRoom.id,
                  user_id: configuredRoom.user_id,
                  room_id: matchingActualRoom.id_room.toString(),
                  room_name: configuredRoom.room_name,
                });
                roomFound = true;
                break; // Found it, move to the next configured room
              }
            }
            if (!roomFound) {
              console.warn(`Configured room with ID ${configuredRoom.room_id} and name "${configuredRoom.room_name}" was not found in any Krossbooking room type.`);
            }
          }
        });

        // 4. Finalize list of unique rooms and fetch reservations for them.
        const uniqueFlattenedUserRooms = Array.from(new Map(flattenedUserRooms.map(room => [room.room_id, room])).values());
        setUserRooms(uniqueFlattenedUserRooms);

        if (uniqueFlattenedUserRooms.length > 0) {
          const fetchedReservations = await fetchKrossbookingReservations(uniqueFlattenedUserRooms);
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
            profile={profile}
          />
        ) : (
          <BookingPlanningGrid 
            refreshTrigger={refreshTrigger} 
            userRooms={userRooms} 
            reservations={reservations}
            onReservationChange={handleReservationChange}
            profile={profile}
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