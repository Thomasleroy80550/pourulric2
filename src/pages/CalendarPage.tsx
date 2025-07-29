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
import { fetchKrossbookingReservations, KrossbookingReservation } from '@/lib/krossbooking';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocation } from 'react-router-dom';
import { useSession } from "@/components/SessionContextProvider";
import BannedUserMessage from "@/components/BannedUserMessage";

const CalendarPage: React.FC = () => {
  const { profile } = useSession();
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
        const fetchedUserRooms = await getUserRooms();
        setUserRooms(fetchedUserRooms);

        const fetchedReservations = await fetchKrossbookingReservations(fetchedUserRooms);
        setReservations(fetchedReservations);
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
  }, [refreshTrigger, profile]);

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