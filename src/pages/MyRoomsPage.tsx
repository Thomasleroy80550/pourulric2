import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUserRooms } from '@/lib/user-room-api';
import MainLayout from '@/components/MainLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RoomManagementDialog } from '@/components/RoomManagementDialog';
import RoomQrCodeDialog from '@/components/RoomQrCodeDialog';
import { Badge } from '@/components/ui/badge';
import { Building, Loader2, Star, MessageSquareQuote } from 'lucide-react';
import { useSession } from '@/components/SessionContextProvider';
import SuspendedAccountMessage from '@/components/SuspendedAccountMessage';
import {
  formatMonthLabel,
  getCurrentMonthInputValue,
  getMonthlyFeaturedRooms,
} from '@/lib/user-room-api';

const MyRoomsPage = () => {
  const { data: rooms, isLoading, isFetching, error } = useQuery({
    queryKey: ['userRooms'],
    queryFn: getUserRooms,
  });
  const { profile } = useSession();
  const currentMonth = getCurrentMonthInputValue();
  const currentMonthLabel = formatMonthLabel(currentMonth);

  const { data: featuredRooms = [] } = useQuery({
    queryKey: ['ownerMonthlyFeaturedRooms', currentMonth],
    queryFn: () => getMonthlyFeaturedRooms(currentMonth),
    enabled: Boolean(rooms?.length),
  });

  const featuredRoomById = useMemo(
    () => new Map(featuredRooms.map((room) => [room.user_room_id, room])),
    [featuredRooms]
  );

  if (profile?.is_payment_suspended) {
    return (
      <MainLayout>
        <SuspendedAccountMessage />
      </MainLayout>
    );
  }

  const showInitialLoading = isLoading && !rooms;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mes Logements</h1>
            <p className="text-muted-foreground">Gérez les informations et l'inventaire de vos propriétés.</p>
          </div>

          {isFetching && !showInitialLoading && (
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Mise à jour…
            </div>
          )}
        </div>

        {showInitialLoading && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
          </div>
        )}

        {error && <p className="text-red-500">Erreur: {error.message}</p>}

        {rooms && rooms.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => {
              const featuredRoom = featuredRoomById.get(room.id);
              return (
                <Card key={room.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center">
                          <Building className="mr-2 h-5 w-5" />
                          {room.room_name}
                        </CardTitle>
                        <CardDescription>{room.property_type || 'Type de propriété non défini'}</CardDescription>
                      </div>
                      {featuredRoom && (
                        <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                          <Star className="mr-1 h-3 w-3" />
                          Top {currentMonthLabel}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-4">
                    {featuredRoom ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                          <MessageSquareQuote className="h-4 w-4" />
                          Message du mois
                        </div>
                        <p className="text-sm leading-6">
                          {featuredRoom.message || 'Bravo, votre logement fait partie des meilleurs logements sélectionnés ce mois-ci.'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Aucune mise en avant enregistrée pour {currentMonthLabel}.
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="flex-wrap gap-2">
                    <RoomManagementDialog room={room} />
                    <RoomQrCodeDialog roomId={room.id} roomName={room.room_name} />
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {rooms && rooms.length === 0 && !showInitialLoading && (
          <div className="rounded-lg border-2 border-dashed py-12 text-center">
            <h3 className="text-xl font-semibold">Aucun logement trouvé</h3>
            <p className="mt-2 text-muted-foreground">Aucun logement ne vous a encore été assigné par un administrateur.</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default MyRoomsPage;