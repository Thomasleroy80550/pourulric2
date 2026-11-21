import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUserRooms } from '@/lib/user-room-api';
import MainLayout from '@/components/MainLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RoomManagementDialog } from '@/components/RoomManagementDialog';
import { Badge } from '@/components/ui/badge';
import { Building, Loader2, Star, MessageSquareQuote } from 'lucide-react';
import { useSession } from '@/components/SessionContextProvider';
import SuspendedAccountMessage from '@/components/SuspendedAccountMessage';
import {
  formatMonthLabel,
  getCurrentMonthInputValue,
  getMonthlyFeaturedRooms,
} from '@/lib/user-room-api';
import { getMyChannelProperties, type ChannelProperty } from '@/lib/owner-channel-api';
import { channelPropertyPhotos, channelPropertyTitle } from '@/lib/channel-property-display';

async function getAllMyChannelProperties(): Promise<ChannelProperty[]> {
  const properties: ChannelProperty[] = [];
  let cursor: string | null = null;
  do {
    const page = await getMyChannelProperties(cursor);
    properties.push(...page.properties);
    cursor = page.next_cursor;
  } while (cursor);
  return properties;
}

const MyRoomsPage = () => {
  const { profile } = useSession();
  const { data: rooms, isLoading, isFetching, error } = useQuery({
    queryKey: ['userRooms'],
    queryFn: getUserRooms,
  });
  const { data: channelProperties = [], isFetching: channelFetching } = useQuery({
    queryKey: ['myChannelProperties', profile?.id],
    queryFn: getAllMyChannelProperties,
    enabled: Boolean(profile?.id && profile.role === 'user'),
    staleTime: 60 * 1000,
    retry: false,
  });
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
  const channelPropertyByRoomId = useMemo(
    () => new Map(channelProperties.filter(property => property.user_room_id).map(property => [property.user_room_id as string, property])),
    [channelProperties]
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

          {(isFetching || channelFetching) && !showInitialLoading && (
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
              const channelProperty = channelPropertyByRoomId.get(room.id);
              const photo = channelProperty ? channelPropertyPhotos(channelProperty)[0] : undefined;
              const displayName = channelProperty ? channelPropertyTitle(channelProperty) : room.room_name;
              return (
                <Card key={room.id} className="flex flex-col overflow-hidden">
                  {photo && (
                    <img
                      src={photo.url}
                      alt={photo.caption || displayName}
                      loading="lazy"
                      className="h-44 w-full object-cover"
                    />
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center">
                          <Building className="mr-2 h-5 w-5" />
                          {displayName}
                        </CardTitle>
                        <CardDescription>{channelProperty ? 'Données Cadence' : room.property_type || 'Type de propriété non défini'}</CardDescription>
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
                  <CardFooter className="gap-2">
                    <RoomManagementDialog room={room} channelProperty={channelProperty} />
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