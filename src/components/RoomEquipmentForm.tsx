import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserRoomsByUserId, updateRoomAppliances, UserRoom } from '@/lib/user-room-api';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface RoomEquipmentFormProps {
  userId: string;
  onComplete: () => void; // Callback to notify parent when complete
}

const RoomEquipmentForm: React.FC<RoomEquipmentFormProps> = ({ userId, onComplete }) => {
  const queryClient = useQueryClient();
  const { data: rooms, isLoading: isLoadingRooms, error: roomsError } = useQuery<UserRoom[]>({
    queryKey: ['userRooms', userId],
    queryFn: () => getUserRoomsByUserId(userId),
  });

  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>(undefined);
  const [appliancesList, setAppliancesList] = useState<string>('');

  useEffect(() => {
    if (rooms && rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0].id);
      setAppliancesList(rooms[0].appliances_list || '');
    }
  }, [rooms, selectedRoomId]);

  const updateAppliancesMutation = useMutation({
    mutationFn: ({ roomId, list }: { roomId: string; list: string }) => updateRoomAppliances(roomId, list),
    onSuccess: () => {
      toast.success("Équipements du logement mis à jour avec succès !");
      queryClient.invalidateQueries({ queryKey: ['userRooms', userId] });
      onComplete(); // Trigger onboarding status update in parent
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la mise à jour des équipements : ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoomId) {
      updateAppliancesMutation.mutate({ roomId: selectedRoomId, list: appliancesList });
    } else {
      toast.error("Veuillez sélectionner un logement.");
    }
  };

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    const room = rooms?.find(r => r.id === roomId);
    setAppliancesList(room?.appliances_list || '');
  };

  if (isLoadingRooms) {
    return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-32 w-full" /></div>;
  }

  if (roomsError) {
    return <p className="text-red-500">Erreur de chargement des logements: {roomsError.message}</p>;
  }

  if (!rooms || rooms.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Ajout des paramètres de votre logement</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aucun logement n'est encore assigné à votre compte. Veuillez contacter l'administrateur.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajout des paramètres de votre logement</CardTitle>
        <CardDescription>Veuillez renseigner les équipements et spécificités de votre logement pour finaliser sa mise en ligne.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {rooms.length > 1 && (
            <div>
              <Label htmlFor="room-select">Sélectionner un logement</Label>
              <Select onValueChange={handleRoomSelect} value={selectedRoomId}>
                <SelectTrigger id="room-select">
                  <SelectValue placeholder="Sélectionner un logement" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map(room => (
                    <SelectItem key={room.id} value={room.id}>{room.room_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="appliances-list">Liste des équipements (séparés par des virgules ou sur des lignes différentes)</Label>
            <Textarea
              id="appliances-list"
              value={appliancesList}
              onChange={(e) => setAppliancesList(e.target.value)}
              placeholder="Ex: Lave-linge, Sèche-linge, Four, Micro-ondes, Cafetière Nespresso, Bouilloire, Grille-pain..."
              rows={6}
            />
          </div>
          <Button type="submit" disabled={updateAppliancesMutation.isPending}>
            {updateAppliancesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer et continuer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default RoomEquipmentForm;