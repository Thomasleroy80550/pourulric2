import { useQuery } from '@tanstack/react-query';
import { getUserRooms } from '@/lib/user-room-api';
import MainLayout from '@/components/MainLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RoomManagementDialog } from '@/components/RoomManagementDialog';
import { Building } from 'lucide-react';
import { useSession } from '@/components/SessionContextProvider';
import SuspendedAccountMessage from '@/components/SuspendedAccountMessage';

const MyRoomsPage = () => {
  const { data: rooms, isLoading, error } = useQuery({
    queryKey: ['userRooms'],
    queryFn: getUserRooms,
  });
  const { profile } = useSession();

  if (profile?.is_payment_suspended) {
    return (
      <MainLayout>
        <SuspendedAccountMessage />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mes Logements</h1>
          <p className="text-muted-foreground">Gérez les informations et l'inventaire de vos propriétés.</p>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
          </div>
        )}

        {error && <p className="text-red-500">Erreur: {error.message}</p>}

        {rooms && rooms.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <Card key={room.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building className="mr-2 h-5 w-5" />
                    {room.room_name}
                  </CardTitle>
                  <CardDescription>{room.property_type || 'Type de propriété non défini'}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  {/* On pourra ajouter un aperçu des infos ici plus tard */}
                </CardContent>
                <CardFooter className="gap-2">
                  <RoomManagementDialog room={room} />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {rooms && rooms.length === 0 && !isLoading && (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-semibold">Aucun logement trouvé</h3>
            <p className="text-muted-foreground mt-2">Aucun logement ne vous a encore été assigné par un administrateur.</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default MyRoomsPage;