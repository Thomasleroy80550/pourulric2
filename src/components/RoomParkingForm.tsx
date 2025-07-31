import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserRoom, updateUserRoom } from '@/lib/user-room-api';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';

const parkingSchema = z.object({
  parking_info: z.string().optional(),
  parking_address: z.string().optional(),
  parking_spots: z.coerce.number().optional(),
  parking_type: z.string().optional(),
  parking_badge_or_disk: z.boolean().optional(),
  parking_regulated_zone_instructions: z.string().optional(),
});

interface RoomParkingFormProps {
  room: UserRoom;
}

export function RoomParkingForm({ room }: RoomParkingFormProps) {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof parkingSchema>>({
    resolver: zodResolver(parkingSchema),
    defaultValues: {
      parking_info: room.parking_info || '',
      parking_address: room.parking_address || '',
      parking_spots: room.parking_spots || 0,
      parking_type: room.parking_type || '',
      parking_badge_or_disk: room.parking_badge_or_disk || false,
      parking_regulated_zone_instructions: room.parking_regulated_zone_instructions || '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof parkingSchema>) => updateUserRoom(room.id, values),
    onSuccess: () => {
      toast.success("Informations de stationnement mises à jour.");
      queryClient.invalidateQueries({ queryKey: ['userRooms'] });
    },
    onError: (error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
        <FormField
          control={form.control}
          name="parking_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adresse du stationnement (si différente)</FormLabel>
              <FormControl>
                <Input placeholder="Adresse complète" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex space-x-4">
            <FormField
            control={form.control}
            name="parking_spots"
            render={({ field }) => (
                <FormItem className="w-1/2">
                <FormLabel>Nombre de places</FormLabel>
                <FormControl>
                    <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="parking_type"
            render={({ field }) => (
                <FormItem className="w-1/2">
                <FormLabel>Type de stationnement</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un type" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    <SelectItem value="Privé">Privé</SelectItem>
                    <SelectItem value="Public">Public</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
          control={form.control}
          name="parking_badge_or_disk"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Badge ou disque à disposition ?</FormLabel>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="parking_regulated_zone_instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instructions si zone réglementée</FormLabel>
              <FormControl>
                <Textarea placeholder="Instructions pour disque, horaires, etc." {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="parking_info"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Autres informations sur le parking</FormLabel>
              <FormControl>
                <Textarea placeholder="Où se garer ? Y a-t-il des règles spécifiques ?" {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </form>
    </Form>
  );
}