import React, { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useQuery } from '@tanstack/react-query';
import { getAllUserRooms, AdminUserRoom } from '@/lib/admin-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PlugZap, Droplet, Building, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DownloadRoomSummaryButton } from '@/components/DownloadRoomSummaryButton';
import EditUserRoomDialog from '@/components/EditUserRoomDialog';

const AdminUserRoomsPage: React.FC = () => {
  const { data: userRooms, isLoading, error, refetch } = useQuery<AdminUserRoom[]>({
    queryKey: ['adminUserRooms'],
    queryFn: getAllUserRooms,
  });

  const [editingRoom, setEditingRoom] = useState<AdminUserRoom | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleEdit = (room: AdminUserRoom) => {
    setEditingRoom(room);
    setDialogOpen(true);
  };

  const handleRoomSaved = () => {
    refetch();
    setDialogOpen(false);
    setEditingRoom(null);
  };

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
                      <TableHead>ID Chambre</TableHead>
                      <TableHead>Type de Propriété</TableHead>
                      <TableHead>Code Boîte à Clés</TableHead>
                      <TableHead>Code Wi-Fi</TableHead>
                      <TableHead>Instructions Arrivée</TableHead>
                      <TableHead>Infos Parking</TableHead>
                      <TableHead>Règlement Intérieur</TableHead>
                      <TableHead>Statut Compteurs</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userRooms.map((room) => {
                      const clientName = `${room.profiles?.first_name || ''} ${room.profiles?.last_name || ''}`.trim() || '—';
                      return (
                        <TableRow key={room.id}>
                          <TableCell className="font-medium">{room.room_name}</TableCell>
                          <TableCell>{clientName}</TableCell>
                          <TableCell className="text-muted-foreground">{room.room_id}</TableCell>
                          <TableCell>{room.property_type || '—'}</TableCell>
                          <TableCell>{room.keybox_code || '—'}</TableCell>
                          <TableCell>{room.wifi_code || '—'}</TableCell>
                          <TableCell>{room.arrival_instructions || '—'}</TableCell>
                          <TableCell>{room.parking_info || '—'}</TableCell>
                          <TableCell>{room.house_rules || '—'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {room.is_electricity_cut && (
                                <Badge variant="secondary" className="text-amber-700 border-amber-300">
                                  <PlugZap className="h-3 w-3 mr-1" /> Élec coupée
                                </Badge>
                              )}
                              {room.is_water_cut && (
                                <Badge variant="secondary" className="text-sky-700 border-sky-300">
                                  <Droplet className="h-3 w-3 mr-1" /> Eau coupée
                                </Badge>
                              )}
                              {!room.is_electricity_cut && !room.is_water_cut && (
                                <Badge variant="outline">Tous actifs</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(room)}>
                              <Edit className="h-4 w-4 mr-1" /> Modifier
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              !isLoading && <p className="text-center py-4">Aucun logement utilisateur trouvé.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {editingRoom && (
        <EditUserRoomDialog
          isOpen={dialogOpen}
          onOpenChange={setDialogOpen}
          userId={editingRoom.user_id}
          initialRoom={editingRoom}
          onRoomSaved={handleRoomSaved}
        />
      )}
    </AdminLayout>
  );
};

export default AdminUserRoomsPage;