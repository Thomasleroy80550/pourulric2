import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { UserRoom, adminAddUserRoom, updateUserRoom } from '@/lib/user-room-api';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

const roomSchema = z.object({
  room_id: z.string().min(1, "L'ID de la chambre est requis."),
  room_name: z.string().min(1, "Le nom de la chambre est requis."),
  room_id_2: z.string().optional().nullable(),
  is_electricity_cut: z.boolean().optional(),
  is_water_cut: z.boolean().optional(),
});

interface EditUserRoomDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userId: string; // Required for adding new rooms
  initialRoom?: UserRoom | null; // Optional, for editing existing rooms
  onRoomSaved: (room: UserRoom) => void;
}

const EditUserRoomDialog: React.FC<EditUserRoomDialogProps> = ({
  isOpen,
  onOpenChange,
  userId,
  initialRoom,
  onRoomSaved,
}) => {
  const form = useForm<z.infer<typeof roomSchema>>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      room_id: '',
      room_name: '',
      room_id_2: '',
      is_electricity_cut: false,
      is_water_cut: false,
    },
  });

  useEffect(() => {
    if (isOpen && initialRoom) {
      form.reset({
        room_id: initialRoom.room_id,
        room_name: initialRoom.room_name,
        room_id_2: initialRoom.room_id_2 || '',
        is_electricity_cut: initialRoom.is_electricity_cut || false,
        is_water_cut: initialRoom.is_water_cut || false,
      });
    } else if (isOpen && !initialRoom) {
      form.reset({
        room_id: '',
        room_name: '',
        room_id_2: '',
        is_electricity_cut: false,
        is_water_cut: false,
      });
    }
  }, [isOpen, initialRoom, form]);

  const handleSubmit = async (values: z.infer<typeof roomSchema>) => {
    try {
      let savedRoom: UserRoom;
      if (initialRoom) {
        // Update existing room
        savedRoom = await updateUserRoom(initialRoom.id, {
          room_id: values.room_id,
          room_name: values.room_name,
          room_id_2: values.room_id_2 || null,
          is_electricity_cut: values.is_electricity_cut,
          is_water_cut: values.is_water_cut,
        });
        toast.success("Chambre mise à jour avec succès !");
      } else {
        // Add new room
        savedRoom = await adminAddUserRoom(userId, values.room_id, values.room_name, values.room_id_2 || undefined);
        toast.success("Chambre ajoutée avec succès !");
      }
      onRoomSaved(savedRoom);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialRoom ? "Modifier la chambre" : "Ajouter une chambre"}</DialogTitle>
          <DialogDescription>
            {initialRoom ? "Modifiez les détails de la chambre." : "Ajoutez une nouvelle chambre pour cet utilisateur."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="room_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID Chambre (Krossbooking)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="room_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la chambre</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="room_id_2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID Chambre Numéro 2 (Prix/Restrictions)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="is_electricity_cut"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Électricité coupée</FormLabel>
                      <p className="text-xs text-muted-foreground">Cocher si le compteur d'électricité est coupé</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_water_cut"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Eau coupée</FormLabel>
                      <p className="text-xs text-muted-foreground">Cocher si le compteur d'eau est coupé</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (initialRoom ? "Mettre à jour" : "Ajouter")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserRoomDialog;