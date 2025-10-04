"use client";

import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BookingPlanningGrid from '@/components/BookingPlanningGrid';
import BookingPlanningGridMobile from '@/components/BookingPlanningGridMobile';
import BookingListMobile from '@/components/BookingListMobile';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { PlusCircle, DollarSign, RefreshCw } from 'lucide-react';
import OwnerReservationDialog from '@/components/OwnerReservationDialog';
import PriceRestrictionDialog from '@/components/PriceRestrictionDialog';
import { getUserRooms, UserRoom } from '@/lib/user-room-api';
import { fetchKrossbookingReservations, KrossbookingReservation, fetchKrossbookingRoomTypes, clearReservationsCache } from '@/lib/krossbooking';
import { getOverrides } from '@/lib/price-override-api';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocation } from 'react-router-dom';
import { useSession } from "@/components/SessionContextProvider";
import BannedUserMessage from "@/components/BannedUserMessage";
import SuspendedAccountMessage from "@/components/SuspendedAccountMessage";
import { addDays, format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TwelveMonthView from '@/components/TwelveMonthView';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const COOLDOWN_KEY = 'calendar_refresh_cooldown';
const COOLDOWN_DURATION = 50 * 60 * 1000; // 50 minutes in milliseconds

const CalendarPage: React.FC = () => {
  const { profile, session } = useSession();
  const isMobile = useIsMobile();
  const [isOwnerReservationDialogOpen, setIsOwnerReservationDialogOpen] = useState(false);
  const [isPriceRestrictionDialogOpen, setIsPriceRestrictionDialogOpen] = useState(false);
  const [isAccessDeniedDialogOpen, setIsAccessDeniedDialogOpen] = useState(false);
  const [userRooms, setUserRooms] = useState<UserRoom[]>([]);
  const [reservations, setReservations] = useState<KrossbookingReservation[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const location = useLocation();
  const [cooldownEndTime, setCooldownEndTime] = useState<number>(() => {
    const savedTime = localStorage.getItem(COOLDOWN_KEY);
    return savedTime ? parseInt(savedTime, 10) : 0;
  });
  const [remainingTime, setRemainingTime] = useState<string>('');

  console.log("CalendarPage - profile from useSession:", profile); // <-- Added this line

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeLeft = cooldownEndTime - now;

      if (timeLeft > 0) {
        const minutes = Math.floor((timeLeft / 1000) / 60);
        const seconds = Math.floor((timeLeft / 1000) % 60);
        setRemainingTime(`${minutes}m ${seconds.toString().padStart(2, '0')}s`);
      } else {
        setRemainingTime('');
        if (cooldownEndTime !== 0) {
          setCooldownEndTime(0);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownEndTime]);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        // 1. Fetch the user's configured rooms from Supabase
        const configuredUserRooms = await getUserRooms();
        console.log("DEBUG: configuredUserRooms (from Supabase):", configuredUserRooms);

        if (configuredUserRooms.length === 0) {
          setUserRooms([]);
          setReservations([]);
          setLoadingData(false);
          return;
        }

        // 2. Fetch all room definitions from Krossbooking to validate configured rooms
        const krossbookingRoomTypes = await fetchKrossbookingRoomTypes(refreshTrigger > 0);
        console.log("DEBUG: krossbookingRoomTypes (from Krossbooking):", krossbookingRoomTypes);

        if (krossbookingRoomTypes.length === 0) {
          console.warn("Krossbooking returned no room types. Calendar will be empty.");
          setUserRooms([]);
          setReservations([]);
          setLoadingData(false);
          return;
        }

        const flattenedKrossbookingRooms: { id_room: number; label: string; }[] = [];
        krossbookingRoomTypes.forEach(type => {
          flattenedKrossbookingRooms.push(...type.rooms);
        });
        console.log("DEBUG: flattenedKrossbookingRooms (all Krossbooking rooms):", flattenedKrossbookingRooms);

        // 3. Process configured rooms to build a flat list of actual rooms to display and fetch reservations for.
        const validUserRooms: UserRoom[] = [];

        configuredUserRooms.forEach(configuredRoom => {
          const matchingActualRoom = flattenedKrossbookingRooms.find(
            actualRoom => actualRoom.id_room.toString() === configuredRoom.room_id
          );

          if (matchingActualRoom) {
            validUserRooms.push({
              id: configuredRoom.id,
              user_id: configuredRoom.user_id,
              room_id: matchingActualRoom.id_room.toString(),
              room_name: configuredRoom.room_name,
              room_id_2: configuredRoom.room_id_2, // Ensure room_id_2 is passed along
            });
          } else {
            console.warn(`Configured room with ID "${configuredRoom.room_id}" and name "${configuredRoom.room_name}" was not found as an individual room in Krossbooking. It will not be displayed.`);
            console.warn(`DEBUG: Failed to match configured room:`, configuredRoom);
            console.warn(`DEBUG: Available Krossbooking room IDs:`, flattenedKrossbookingRooms.map(r => r.id_room));
          }
        });
        console.log("DEBUG: validUserRooms (after Krossbooking validation):", validUserRooms);

        // 4. Finalize list of unique rooms and fetch reservations for them.
        const uniqueValidUserRooms = Array.from(new Map(validUserRooms.map(room => [room.room_id, room])).values());
        console.log("DEBUG: uniqueValidUserRooms (after uniqueness check by Krossbooking room_id):", uniqueValidUserRooms);
        setUserRooms(uniqueValidUserRooms);

        let fetchedReservations: KrossbookingReservation[] = [];
        if (uniqueValidUserRooms.length > 0) {
          fetchedReservations = await fetchKrossbookingReservations(uniqueValidUserRooms, refreshTrigger > 0);
        } else {
          console.warn("No matching rooms found in Krossbooking for the current configuration.");
        }

        // 5. Fetch price overrides and convert them to reservation-like blocks
        const priceOverrides = await getOverrides();
        const closedBlocks = priceOverrides
          .filter(override => override.closed)
          .map((override): KrossbookingReservation => ({
            id: `override-${override.id}`, // Prefix to avoid ID collision
            label: 'Période bloquée',
            guest_name: 'Période bloquée',
            property_name: override.room_name,
            krossbooking_room_id: override.room_id,
            check_in_date: override.start_date,
            // end_date is inclusive, so checkout is the next day
            check_out_date: format(addDays(new Date(override.end_date), 1), 'yyyy-MM-dd'),
            status: 'BLOCKED',
            amount: '',
            cod_channel: 'OWNER_BLOCK',
            channel_identifier: 'OWNER_BLOCK',
            email: '',
            phone: '',
            tourist_tax_amount: 0,
          }));
        
        console.log("DEBUG: Owner blocks created from overrides:", closedBlocks);

        setReservations([...fetchedReservations, ...closedBlocks]);

      } catch (error) {
        console.error("Error fetching data for CalendarPage:", error);
      } finally {
        setLoadingData(false);
      }
    };
    if (!profile?.is_banned && !profile?.is_payment_suspended) {
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
    const now = Date.now();
    if (now < cooldownEndTime) {
      toast.info(`Veuillez attendre la fin du délai avant de rafraîchir à nouveau.`);
      return;
    }

    clearReservationsCache();
    setRefreshTrigger(prev => prev + 1);

    const newCooldownEndTime = now + COOLDOWN_DURATION;
    localStorage.setItem(COOLDOWN_KEY, newCooldownEndTime.toString());
    setCooldownEndTime(newCooldownEndTime);
    toast.success("Le calendrier est en cours de rafraîchissement.");
  };

  const handlePriceRestrictionClick = () => {
    if (profile?.can_manage_prices) {
      setIsPriceRestrictionDialogOpen(true);
    } else {
      setIsAccessDeniedDialogOpen(true);
    }
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

  if (profile?.is_payment_suspended) {
    return (
      <MainLayout>
        <SuspendedAccountMessage />
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
            <Button onClick={handlePriceRestrictionClick} variant="outline" className="flex items-center w-full sm:w-auto">
              <DollarSign className="h-4 w-4 mr-2" />
              Configurer Prix & Restrictions
            </Button>
            <Button 
              onClick={handleReservationChange} 
              variant="outline" 
              className="flex items-center w-full sm:w-auto"
              disabled={Date.now() < cooldownEndTime}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {Date.now() < cooldownEndTime ? `Attendre ${remainingTime}` : 'Rafraîchir'}
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="monthly" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monthly">Vue Mensuelle</TabsTrigger>
            <TabsTrigger value="yearly">Vue 12 Mois</TabsTrigger>
          </TabsList>
          <TabsContent value="monthly" className="mt-6">
            {isMobile ? (
              <BookingPlanningGridMobile 
                reservations={reservations.map(r => ({
                  id: r.id,
                  room_id: r.krossbooking_room_id || r.property_name,
                  room_name: r.property_name,
                  start_date: r.check_in_date,
                  end_date: r.check_out_date,
                  guest_name: r.guest_name,
                  status: r.status,
                  platform: r.channel_identifier || 'Unknown',
                  total_amount: parseFloat(r.amount) || 0
                }))} 
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
          </TabsContent>
          <TabsContent value="yearly" className="mt-6">
            <TwelveMonthView 
              userRooms={userRooms}
              reservations={reservations}
            />
          </TabsContent>
        </Tabs>
      
      </div>
      <OwnerReservationDialog
        isOpen={isOwnerReservationDialogOpen}
        onOpenChange={setIsOwnerReservationDialogOpen}
        userRooms={userRooms}
        allReservations={reservations}
        onReservationCreated={handleReservationChange}
        profile={profile}
      />
      <PriceRestrictionDialog
        isOpen={isPriceRestrictionDialogOpen}
        onOpenChange={setIsPriceRestrictionDialogOpen}
        userRooms={userRooms}
        onSettingsSaved={handlePriceRestrictionSaved}
      />
      <AlertDialog open={isAccessDeniedDialogOpen} onOpenChange={setIsAccessDeniedDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accès non autorisé</AlertDialogTitle>
            <AlertDialogDescription>
              Vous n'avez pas la permission de configurer les prix et les restrictions. Veuillez contacter un administrateur pour demander l'accès à cette fonctionnalité.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsAccessDeniedDialogOpen(false)}>Compris</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default CalendarPage;