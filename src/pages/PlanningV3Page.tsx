"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CalendarRange, Home, Sparkles } from "lucide-react";

import MainLayout from "@/components/MainLayout";
import BannedUserMessage from "@/components/BannedUserMessage";
import SuspendedAccountMessage from "@/components/SuspendedAccountMessage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/components/SessionContextProvider";
import { getUserRooms, UserRoom } from "@/lib/user-room-api";
import { fetchKrossbookingReservations, KrossbookingReservation } from "@/lib/krossbooking";
import BookingPlanningGridV2 from "@/components/BookingPlanningGridV2";
import OwnerReservationDialog from "@/components/OwnerReservationDialog";

const PlanningV3Page: React.FC = () => {
  const { profile } = useSession();
  const [loading, setLoading] = useState(true);
  const [userRooms, setUserRooms] = useState<UserRoom[]>([]);
  const [reservations, setReservations] = useState<KrossbookingReservation[]>([]);
  const [isOwnerDialogOpen, setIsOwnerDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rooms = await getUserRooms();
      setUserRooms(rooms);

      const resas = rooms.length > 0 ? await fetchKrossbookingReservations(rooms) : [];
      setReservations(resas);
    } catch (error) {
      console.error("[planning-v3] Erreur de chargement:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile?.is_banned || profile?.is_payment_suspended) {
      setLoading(false);
      return;
    }
    load();
  }, [profile, load]);

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

  return (
    <MainLayout>
      <div className="w-full max-w-full overflow-x-hidden break-words px-1 py-5 sm:px-2 sm:py-6">
        {/* En-tête */}
        <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-gradient-to-r from-[hsl(var(--sidebar-foreground))] to-[hsl(var(--accent))] text-white hover:opacity-90">
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Nouveau
              </Badge>
              <Badge
                variant="outline"
                className="border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]"
              >
                Planning
              </Badge>
            </div>
            <h1 className="mt-3 flex items-center gap-2 text-2xl font-bold tracking-tight text-[hsl(var(--sidebar-foreground))] sm:text-3xl">
              <CalendarRange className="h-7 w-7" />
              Nouveau planning
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Une vue repensée de vos réservations, aux couleurs Hello Keys.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="rounded-full"
              onClick={() => setIsOwnerDialogOpen(true)}
              disabled={loading || userRooms.length === 0}
            >
              <Home className="mr-2 h-4 w-4" />
              Séjour propriétaire
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/calendar">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Revenir au calendrier
              </Link>
            </Button>
          </div>
        </div>

        {/* Contenu */}
        <Card className="mt-6 shadow-sm">
          <CardContent className="p-2 sm:p-4">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-[420px] w-full" />
              </div>
            ) : userRooms.length === 0 ? (
              <p className="p-4 text-muted-foreground">
                Aucune chambre configurée. Veuillez ajouter des chambres via la page « Mon Profil »
                pour voir votre planning ici.
              </p>
            ) : (
              <div className="w-full min-w-0 overflow-x-auto">
                <BookingPlanningGridV2 userRooms={userRooms} reservations={reservations} />
              </div>
            )}
          </CardContent>
        </Card>

        <OwnerReservationDialog
          isOpen={isOwnerDialogOpen}
          onOpenChange={setIsOwnerDialogOpen}
          userRooms={userRooms}
          allReservations={reservations}
          onReservationCreated={load}
          profile={profile}
        />
      </div>
    </MainLayout>
  );
};

export default PlanningV3Page;
