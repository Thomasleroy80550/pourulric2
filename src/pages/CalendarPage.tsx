import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BookingPlanningGrid from '@/components/BookingPlanningGrid';
import CalendarGridMobile from '@/components/CalendarGridMobile'; // Import the new mobile grid component
import { useIsMobile } from '@/hooks/use-mobile'; // Import useIsMobile hook
import { Button } from '@/components/ui/button'; // Import Button
import { PlusCircle } from 'lucide-react'; // Import PlusCircle icon
import OwnerReservationDialog from '@/components/OwnerReservationDialog'; // Import the new dialog
import { getUserRooms, UserRoom } from '@/lib/user-room-api'; // Import user room API
import { fetchKrossbookingReservations, KrossbookingReservation } from '@/lib/krossbooking'; // Import KrossbookingReservation and fetch function

const CalendarPage: React.FC = () => {
  const isMobile = useIsMobile();
  const [isOwnerReservationDialogOpen, setIsOwnerReservationDialogOpen] = useState(false);
  const [userRooms, setUserRooms] = useState<UserRoom[]>([]);
  const [reservations, setReservations] = useState<KrossbookingReservation[]>([]);
  const [loadingData, setLoadingData] = useState(true); // New loading state for all data
  const [refreshTrigger, setRefreshTrigger] = useState(0); // State to trigger data refresh

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const fetchedUserRooms = await getUserRooms();
        setUserRooms(fetchedUserRooms);

        const roomIds = fetchedUserRooms.map(room => room.room_id);
        const fetchedReservations = await fetchKrossbookingReservations(roomIds);
        setReservations(fetchedReservations);
      } catch (error) {
        console.error("Error fetching data for CalendarPage:", error);
        // Optionally, show a toast error here
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [refreshTrigger]); // Re-fetch all data if refreshTrigger changes

  const handleReservationCreated = () => {
    setRefreshTrigger(prev => prev + 1); // Increment to trigger data refresh
  };

  if (loadingData) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6 text-center">
          <p className="text-gray-500">Chargement des données du calendrier...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Calendrier</h1>
          <Button onClick={() => setIsOwnerReservationDialogOpen(true)} className="flex items-center">
            <PlusCircle className="h-4 w-4 mr-2" />
            Réservation Propriétaire
          </Button>
        </div>
        
        {isMobile ? (
          <CalendarGridMobile 
            refreshTrigger={refreshTrigger} 
            userRooms={userRooms} 
            reservations={reservations} 
          />
        ) : (
          <BookingPlanningGrid 
            refreshTrigger={refreshTrigger} 
            userRooms={userRooms} 
            reservations={reservations} 
          />
        )}
        
        <Card className="shadow-md mt-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Événements à venir (Exemple)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                <p className="font-medium">15 juillet 2025 : Arrivée de M. Dupont</p>
                <p className="text-sm text-gray-500">Appartement Paris - 3 nuits</p>
              </li>
              <li className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                <p className="font-medium">20 juillet 2025 : Départ de Mme. Martin</p>
                <p className="text-sm text-gray-500">Studio Nice</p>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
      <OwnerReservationDialog
        isOpen={isOwnerReservationDialogOpen}
        onOpenChange={setIsOwnerReservationDialogOpen}
        userRooms={userRooms}
        allReservations={reservations} // Pass all reservations
        onReservationCreated={handleReservationCreated}
      />
    </MainLayout>
  );
};

export default CalendarPage;