import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, PlusCircle, Check, ChevronsUpDown } from 'lucide-react';
import { KrossbookingRoomType, fetchKrossbookingRoomTypes } from '@/lib/krossbooking';
import { UserRoom, getUserRooms, addUserRoom, deleteUserRoom } from '@/lib/user-room-api';
import { toast } from 'sonner';
import { Skeleton } from './ui/skeleton';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface KrossbookingRoomOption {
  id: string;
  name: string;
}

const ManageRooms: React.FC<{ onRoomsUpdate: () => void }> = ({ onRoomsUpdate }) => {
  const [userRooms, setUserRooms] = useState<UserRoom[]>([]);
  const [availableRooms, setAvailableRooms] = useState<KrossbookingRoomOption[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCombobox, setOpenCombobox] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedUserRooms, krossbookingRoomTypes] = await Promise.all([
        getUserRooms(),
        fetchKrossbookingRoomTypes(),
      ]);

      setUserRooms(fetchedUserRooms);

      const options: KrossbookingRoomOption[] = [];
      krossbookingRoomTypes.forEach(type => {
        options.push({ id: type.id_room_type.toString(), name: `${type.label} (Type de logement)` });
        type.rooms.forEach(room => {
          options.push({ id: room.id_room.toString(), name: `    ${room.label}` });
        });
      });
      setAvailableRooms(options);

    } catch (err: any) {
      const msg = `Erreur lors du chargement des logements : ${err.message}`;
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddRoom = async () => {
    if (!selectedRoom) {
      toast.warning("Veuillez sélectionner un logement à ajouter.");
      return;
    }

    const roomToAdd = availableRooms.find(r => r.id === selectedRoom);
    if (!roomToAdd) {
      toast.error("Logement sélectionné invalide.");
      return;
    }

    setLoading(true);
    try {
      await addUserRoom(roomToAdd.id, roomToAdd.name.trim().replace('(Type de logement)', '').trim());
      toast.success("Logement ajouté avec succès !");
      setSelectedRoom('');
      await fetchData();
      onRoomsUpdate();
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    setLoading(true);
    try {
      await deleteUserRoom(roomId);
      toast.success("Logement supprimé avec succès !");
      await fetchData();
      onRoomsUpdate();
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && userRooms.length === 0 && availableRooms.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gérer mes logements</CardTitle>
          <CardDescription>Ajoutez ou supprimez les logements que vous souhaitez gérer via la plateforme.</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gérer mes logements</CardTitle>
        <CardDescription>Ajoutez ou supprimez les logements que vous souhaitez gérer via la plateforme.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-medium mb-2">Ajouter un logement</h3>
          <div className="flex items-center gap-2">
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  className="w-full justify-between"
                >
                  {selectedRoom
                    ? availableRooms.find((room) => room.id === selectedRoom)?.name
                    : "Sélectionner un logement..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Rechercher un logement..." />
                  <CommandList>
                    <CommandEmpty>Aucun logement trouvé.</CommandEmpty>
                    <CommandGroup>
                      {availableRooms.map((room) => (
                        <CommandItem
                          key={room.id}
                          value={room.name}
                          onSelect={() => {
                            setSelectedRoom(room.id);
                            setOpenCombobox(false);
                          }}
                          disabled={userRooms.some(ur => ur.room_id === room.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedRoom === room.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {room.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button onClick={handleAddRoom} disabled={loading || !selectedRoom}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">Mes logements configurés</h3>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du logement</TableHead>
                  <TableHead>ID Krossbooking</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userRooms.length > 0 ? (
                  userRooms.map(room => (
                    <TableRow key={room.id}>
                      <TableCell>{room.room_name}</TableCell>
                      <TableCell>{room.room_id}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRoom(room.id)} disabled={loading}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Aucun logement configuré.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ManageRooms;