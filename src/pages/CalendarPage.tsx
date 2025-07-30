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
  const { profile, session } = useSession(); // Added session to dependencies for logging
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
      console.log("CalendarPage: Starting fetchData. Current user ID:", session?.user?.id);
      try {
        // 1. Fetch the user-configured room types (where room_id is id_room_type)
        const configuredRoomTypes = await getUserRooms();
        console.log("CalendarPage: configuredRoomTypes from getUserRooms:", configuredRoomTypes);

        if (configuredRoomTypes.length === 0) {
          console.log("CalendarPage: No configured room types found for user.");
          setUserRooms([]);
          setReservations([]);
          setLoadingData(false);
          return;
        }

        // 2. Fetch all room type definitions from Krossbooking to get the actual rooms
        const krossbookingRoomTypes = await fetchKrossbookingRoomTypes();
        console.log("CalendarPage: krossbookingRoomTypes from Krossbooking API:", krossbookingRoomTypes);

        // 3. Create a flattened list of actual rooms to be displayed in the calendar grid
        const flattenedUserRooms: UserRoom[] = [];
        configuredRoomTypes.forEach(configuredType => {
          const matchingKrossbookingType = krossbookingRoomTypes.find(
            kType => kType.id_room_type.toString() === configuredType.room_id
          );

          if (matchingKrossbookingType && matchingKrossbookingType.rooms) {
            matchingKrossbookingType.rooms.forEach(actualRoom => {
              flattenedUserRooms.push({
                id: `${configuredType.id}-${actualRoom.id_room}`, // Create a unique ID for React keys
                user_id: configuredType.user_id,
                room_id: actualRoom.id_room.toString(), // This is the ACTUAL room ID
                room_name: actualRoom.label, // This is the ACTUAL room name
              });
            });
          } else {
            console.warn(`CalendarPage: No matching Krossbooking room type found for configuredType.room_id: ${configuredType.room_id} or no rooms associated.`);
          }
        });
        console.log("CalendarPage: flattenedUserRooms (actual rooms for display):", flattenedUserRooms);
        setUserRooms(flattenedUserRooms); // This state now holds individual rooms for rendering rows

        // 4. Fetch reservations using the original configured types (for efficiency)
        //    and pass the flattened list for correct name mapping.
        const fetchedReservations = await fetchKrossbookingReservations(configuredRoomTypes, flattenedUserRooms);
        console.log("CalendarPage: fetchedReservations:", fetchedReservations);
        setReservations(fetchedReservations);

      } catch (error) {
        console.error("CalendarPage: Error fetching data for CalendarPage:", error);
      } finally {
        setLoadingData(false);
        console.log("CalendarPage: fetchData finished. Loading state set to false.");
      }
    };
    if (!profile?.is_banned) {
      fetchData();
    } else {
      setLoadingData(false);
      console.log("CalendarPage: User is banned, skipping data fetch.");
    }
  }, [refreshTrigger, profile, session]); // Added session to dependencies

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