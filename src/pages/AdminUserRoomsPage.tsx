import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useQuery } from '@tanstack/react-query';
import { getAllUserRooms, AdminUserRoom } from '@/lib/admin-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Building } from 'lucide-react';
import { DownloadRoomSummaryButton } from '@/components/DownloadRoomSummaryButton';

const AdminUserRoomsPage: React.FC = () => {
  const { data: userRooms, isLoading, error } = useQuery<AdminUserRoom[]>({
    queryKey: ['adminUserRooms'],
    queryFn: getAllUserRooms,
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Building className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Logements Utilisateurs</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Liste des Logements</CardTitle>
            <CardDescription>Visualisez et gérez les informations de tous les logements enregistrés par les utilisateurs.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            )}
            {error && <p className="text-red-500">Erreur lors du chargement des logements : {error.message}</p>}
            {userRooms && userRooms.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom du Logement</TableHead>
                      <TableHead>Propriétaire</TableHead>
                      <TableHead>Type de Propriété</TableHead>
                      <TableHead>Code Boîte à Clés</TableHead>
                      <TableHead>Code Wi-Fi</TableHead>
                      <TableHead>Instructions Arrivée</TableHead>
                      <TableHead>Infos Parking</TableHead>
                      <TableHead>Règlement Intérieur</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userRooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell className="font-medium">{room.room_name}</TableCell>
                        <TableCell>{room.profiles ? `${room.profiles.first_name} ${room.profiles.last_name}` : 'N/A'}</TableCell>
                        <TableCell>{room.property_type || '-'}</TableCell>
                        <TableCell>{room.keybox_code || '-'}</TableCell>
                        <TableCell>{room.wifi_code || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{room.arrival_instructions || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{room.parking_info || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{room.house_rules || '-'}</TableCell>
                        <TableCell className="text-right">
                          <DownloadRoomSummaryButton room={room} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              !isLoading && <p className="text-center py-4">Aucun logement utilisateur trouvé.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminUserRoomsPage;