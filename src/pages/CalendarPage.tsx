"use client";

import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BookingPlanningGrid from '@/components/BookingPlanningGrid';
import BookingPlanningGridMobile from '@/components/BookingPlanningGridMobile';
import BookingListMobile from '@/components/BookingListMobile';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { PlusCircle, DollarSign, RefreshCw, Sparkles } from 'lucide-react';
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
import BookingPlanningGridV2 from '@/components/BookingPlanningGridV2';
import BookingPlanningGridStudio from '@/components/BookingPlanningGridStudio';
import IcalCalendarTab from '@/components/IcalCalendarTab';
import { fetchIcalReservationsForRoom } from '@/lib/ical';
import { toast } from 'sonner';

import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import EcowattForecastBox from "@/components/EcowattForecastBox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const COOLDOWN_KEY = 'calendar_refresh_cooldown';
const COOLDOWN_DURATION = 50 * 60 * 1000; // 50 minutes in milliseconds

const CalendarPage: React.FC = () => {
  const { profile, session } = useSession();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [isOwnerReservationDialogOpen, setIsOwnerReservationDialogOpen] = useState(false);
  const [isPriceRestrictionDialogOpen, setIsPriceRestrictionDialogOpen] = useState(false);
  const [isAccessDeniedDialogOpen, setIsAccessDeniedDialogOpen] = useState(false);
  const [isFeatureUnavailableDialogOpen, setIsFeatureUnavailableDialogOpen] = useState(false);
  const [unavailableFeatureLabel, setUnavailableFeatureLabel] = useState('');
  const [userRooms, setUserRooms] = useState<UserRoom[]>([]);

  const [reservations, setReservations] = useState<KrossbookingReservation[]>([]);
  const [icalReservations, setIcalReservations] = useState<KrossbookingReservation[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingIcalData, setLoadingIcalData] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const location = useLocation();
  const [cooldownEndTime, setCooldownEndTime] = useState<number>(() => {
    const savedTime = localStorage.getItem(COOLDOWN_KEY);
    return savedTime ? parseInt(savedTime, 10) : 0;
  });
  const [remainingTime, setRemainingTime] = useState<string>('');
  const [monthlyDesignV2, setMonthlyDesignV2] = useState(false);
  const [activeTab, setActiveTab] = useState<'planning' | 'new-planning' | 'twelve' | 'debug' | 'ical'>('planning');
  const [showNewPlanningMobile, setShowNewPlanningMobile] = useState(false);

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
        setUserRooms(configuredUserRooms);

        if (isMobile) {
          const linkedRooms = configuredUserRooms.filter((room) => room.ical_url?.trim());

          if (linkedRooms.length === 0) {
            setIcalReservations([]);
            setLoadingIcalData(false);
          } else {
            setLoadingIcalData(true);

            const icalResults = await Promise.allSettled(
              linkedRooms.map(async (room) => fetchIcalReservationsForRoom(room))
            );

            const loadedIcalReservations = icalResults
              .filter((result): result is PromiseFulfilledResult<KrossbookingReservation[]> => result.status === 'fulfilled')
              .flatMap((result) => result.value);

            const failedIcalResults = icalResults.filter(
              (result): result is PromiseRejectedResult => result.status === 'rejected'
            );

            setIcalReservations(loadedIcalReservations);

            if (failedIcalResults.length > 0) {
              const message = failedIcalResults[0].reason instanceof Error
                ? failedIcalResults[0].reason.message
                : 'Impossible de synchroniser un ou plusieurs flux iCal.';
              toast.error(message);
            }

            setLoadingIcalData(false);
          }
        } else {
          setIcalReservations([]);
          setLoadingIcalData(false);
        }

        if (configuredUserRooms.length === 0) {
          setUserRooms([]);
          setReservations([]);
          return;
        }

        // 2. Fetch all room definitions from Krossbooking to validate configured rooms
        const krossbookingRoomTypes = await fetchKrossbookingRoomTypes(refreshTrigger > 0);

        console.log("DEBUG: krossbookingRoomTypes (from Krossbooking):", krossbookingRoomTypes);

        if (krossbookingRoomTypes.length === 0) {
          console.warn("Krossbooking returned no room types. Le planning Krossbooking restera vide mais l'onglet iCal reste disponible.");
          setReservations([]);
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
              room_id_2: configuredRoom.room_id_2,
              ical_url: configuredRoom.ical_url,
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
            id: `override-${override.id}`,
            guest_name: 'Période bloquée',
            property_name: override.room_name,
            krossbooking_room_id: override.room_id,
            check_in_date: override.start_date,
            check_out_date: format(addDays(new Date(override.end_date), 1), 'yyyy-MM-dd'),
            status: 'BLOCKED',
            amount: '',
            cod_channel: 'OWNER_BLOCK',
            channel_identifier: 'OWNER_BLOCK',
            email: '',
            phone: '',
            tourist_tax_amount: 0,
            property_id: 0,
          }));

        console.log("DEBUG: Owner blocks created from overrides:", closedBlocks);

        setReservations([...fetchedReservations, ...closedBlocks]);
      } catch (error) {
        console.error("Error fetching data for CalendarPage:", error);
      } finally {
        setLoadingData(false);
        setLoadingIcalData(false);
      }
    };
    if (!profile?.is_banned && !profile?.is_payment_suspended) {
      fetchData();
    } else {
      setLoadingData(false);
      setLoadingIcalData(false);
    }
  }, [isMobile, refreshTrigger, profile, session]);

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

  const handleOwnerReservationClick = () => {
    setIsOwnerReservationDialogOpen(true);
  };

  const handleFeatureUnavailableClick = (featureLabel: string) => {
    setUnavailableFeatureLabel(featureLabel);
    setIsFeatureUnavailableDialogOpen(true);
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
        <div className="w-full py-6 px-2 sm:px-4">
          <div className="flex justify-between items-center mb-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-48" />
          </div>
          <Card className="shadow-md">
            <CardHeader>
              <Skeleton className="h-6 w-64" />
            </CardHeader>
            <CardContent className="w-full p-2 sm:p-4">
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

  // Si c'est mobile, afficher directement la vue liste
  if (isMobile) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6 px-2 sm:px-4 max-w-full overflow-hidden">
          <div className="mb-4">
            <EcowattForecastBox />
          </div>
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Information importante</AlertTitle>
            <AlertDescription>
              Un bug connu peut afficher certaines réservations au mauvais jour après le chargement.
              Pour les voir au bon endroit, changez de mois puis revenez au mois actuel.
            </AlertDescription>
          </Alert>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold">Calendrier</h1>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  onClick={() => setShowNewPlanningMobile((prev) => !prev)}
                  className="flex items-center w-full sm:w-auto text-sm sm:text-base bg-gradient-to-r from-[hsl(var(--sidebar-foreground))] to-[hsl(var(--accent))] text-white hover:opacity-90"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {showNewPlanningMobile ? 'Vue liste' : 'Nouveau planning'}
                </Button>
                <Button onClick={handleOwnerReservationClick} className="flex items-center w-full sm:w-auto text-sm sm:text-base">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Réservation Propriétaire
                </Button>
                <Button onClick={handlePriceRestrictionClick} variant="outline" className="flex items-center w-full sm:w-auto text-sm sm:text-base">
  
                <DollarSign className="h-4 w-4 mr-2" />
                Configurer Prix
              </Button>

              <Button 
                onClick={handleReservationChange} 
                variant="outline" 
                className="flex items-center w-full sm:w-auto text-sm sm:text-base"
                disabled={Date.now() < cooldownEndTime}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {Date.now() < cooldownEndTime ? `Attendre ${remainingTime}` : 'Rafraîchir'}
              </Button>
            </div>
          </div>
          
          {/* Vue liste mobile directe avec contraintes de largeur */}
          {showNewPlanningMobile ? (
            <div className="w-full max-w-full overflow-x-auto">
              {userRooms.length === 0 ? (
                <p className="text-muted-foreground">
                  Aucune chambre configurée. Veuillez ajouter des chambres via la page "Mon Profil".
                </p>
              ) : (
                <BookingPlanningGridV2 userRooms={userRooms} reservations={reservations} />
              )}
            </div>
          ) : (
            <div className="w-full max-w-full space-y-4 overflow-x-hidden">
              <BookingListMobile
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
                isLoading={loadingData}
              />
              <BookingListMobile
                title="Réservations iCal à venir"
                emptyMessage="Aucune réservation iCal à venir"
                showAmount={false}
                isLoading={loadingIcalData}
                reservations={icalReservations.map(r => ({
                  id: r.id,
                  room_id: r.krossbooking_room_id || r.property_name,
                  room_name: r.property_name,
                  start_date: r.check_in_date,
                  end_date: r.check_out_date,
                  guest_name: r.guest_name,
                  status: r.status,
                  platform: 'iCal',
                  total_amount: 0,
                }))}
              />
            </div>
          )}
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
        <AlertDialog open={isFeatureUnavailableDialogOpen} onOpenChange={setIsFeatureUnavailableDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Fonctionnalité temporairement hors service</AlertDialogTitle>
              <AlertDialogDescription>
                {unavailableFeatureLabel} est actuellement indisponible pendant la maintenance en cours. Nous la réactiverons dès que le service sera de nouveau opérationnel.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setIsFeatureUnavailableDialogOpen(false)}>Compris</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
  }

  return (
    <MainLayout>
      <div className="w-full py-6 px-2 sm:px-4">
        <div className="mb-4">
          <EcowattForecastBox />
        </div>
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Information importante</AlertTitle>
          <AlertDescription>
            Un bug connu peut afficher certaines réservations au mauvais jour après le chargement.
            Pour les voir au bon endroit, changez de mois puis revenez au mois actuel.
          </AlertDescription>
        </Alert>

        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Calendrier</h1>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setActiveTab('new-planning')}
              className="flex items-center bg-gradient-to-r from-[hsl(var(--sidebar-foreground))] to-[hsl(var(--accent))] text-white hover:opacity-90"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Nouveau planning
              <span className="ml-2 inline-block h-2 w-2 rounded-full bg-white animate-pulse" />
            </Button>
            <Button onClick={handleOwnerReservationClick} className="flex items-center">
              <PlusCircle className="h-4 w-4 mr-2" />
              Réservation Propriétaire
            </Button>
            <Button onClick={handlePriceRestrictionClick} variant="outline" className="flex items-center">

              <DollarSign className="h-4 w-4 mr-2" />
              Configurer Prix
            </Button>

            <Button
              onClick={handleReservationChange}
              variant="outline"
              className="flex items-center"
              disabled={Date.now() < cooldownEndTime}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {Date.now() < cooldownEndTime ? `Attendre ${remainingTime}` : 'Rafraîchir'}
            </Button>
          </div>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Calendrier</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'planning' | 'new-planning' | 'twelve' | 'debug' | 'ical')} className="w-full">
              <TabsList className="mb-4 flex flex-wrap h-auto">
                <TabsTrigger value="new-planning" className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Nouveau planning
                </TabsTrigger>
                <TabsTrigger value="planning">Planning des Réservations</TabsTrigger>
                <TabsTrigger value="ical">iCal</TabsTrigger>
                <TabsTrigger value="twelve">Vue 12 mois</TabsTrigger>
                <TabsTrigger value="debug">Vue debug</TabsTrigger>
              </TabsList>

              <TabsContent value="new-planning">
                {loadingData ? (
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-[400px] w-full" />
                  </div>
                ) : userRooms.length === 0 ? (
                  <p className="text-muted-foreground">
                    Aucune chambre configurée. Veuillez ajouter des chambres via la page "Mon Profil" pour voir le nouveau planning ici.
                  </p>
                ) : (
                  <div className="w-full min-w-0 overflow-x-auto">
                    <BookingPlanningGridV2
                      userRooms={userRooms}
                      reservations={reservations}
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="planning">
                {loadingData ? (
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-[400px] w-full" />
                  </div>
                ) : userRooms.length === 0 ? (
                  <p className="text-muted-foreground">
                    Aucune chambre configurée. Veuillez ajouter des chambres via la page "Mon Profil" pour voir les réservations ici.
                  </p>
                ) : (
                  <div className="w-full min-w-0 overflow-x-visible">
                    <BookingPlanningGridStudio
                      refreshTrigger={refreshTrigger}
                      userRooms={userRooms}
                      reservations={reservations}
                      onReservationChange={handleReservationChange}
                      profile={profile}
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="twelve">
                {loadingData ? (
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-[400px] w-full" />
                  </div>
                ) : userRooms.length === 0 ? (
                  <p className="text-muted-foreground">
                    Aucune chambre configurée. Veuillez ajouter des chambres via la page "Mon Profil" pour voir la vue annuelle ici.
                  </p>
                ) : (
                  <div className="w-full">
                    <TwelveMonthView userRooms={userRooms} reservations={reservations} />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="ical">
                <IcalCalendarTab userRooms={userRooms} profile={profile} />
              </TabsContent>

              <TabsContent value="debug">
                {loadingData ? (
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-[400px] w-full" />
                  </div>
                ) : userRooms.length === 0 ? (
                  <p className="text-muted-foreground">Aucune chambre configurée.</p>
                ) : (
                  <div className="w-full overflow-x-hidden">
                    <BookingPlanningGridStudio
                      refreshTrigger={refreshTrigger}
                      userRooms={userRooms}
                      reservations={reservations}
                      onReservationChange={handleReservationChange}
                      profile={profile}
                      debugFullWidth
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>

          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
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
      <AlertDialog open={isFeatureUnavailableDialogOpen} onOpenChange={setIsFeatureUnavailableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fonctionnalité temporairement hors service</AlertDialogTitle>
            <AlertDialogDescription>
              {unavailableFeatureLabel} est actuellement indisponible pendant la maintenance en cours. Nous la réactiverons dès que le service sera de nouveau opérationnel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsFeatureUnavailableDialogOpen(false)}>Compris</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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