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

const CalendarPage: React.FC = () => {
  const isMobile = useIsMobile();
  const [isOwnerReservationDialogOpen, setIsOwnerReservationDialogOpen] = useState(false);
  const [userRooms, setUserRooms] = useState<UserRoom[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // State to trigger data refresh

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const rooms = await getUserRooms();
        setUserRooms(rooms);
      } catch (error) {
        console.error("Error fetching user rooms for CalendarPage:", error);
      }
    };
    fetchRooms();
  }, [refreshTrigger]); // Re-fetch rooms if refreshTrigger changes

  const handleReservationCreated = () => {
    setRefreshTrigger(prev => prev + 1); // Increment to trigger data refresh in BookingPlanningGrid/CalendarGridMobile
  };

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
          <CalendarGridMobile refreshTrigger={refreshTrigger} />
        ) : (
          <BookingPlanningGrid refreshTrigger={refreshTrigger} />
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
        onReservationCreated={handleReservationCreated}
      />
    </MainLayout>
  );
};

export default CalendarPage;