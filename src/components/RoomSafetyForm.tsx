import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserRoom, updateUserRoom } from '@/lib/user-room-api';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from './ui/switch';

const safetySchema = z.object({
  has_alarm_or_cctv: z.boolean().optional(),
  has_smoke_detector: z.boolean().optional(),
  has_co_detector: z.boolean().optional(),
  utility_locations: z.string().optional(),
  technical_room_location: z.string().optional(),
});

interface RoomSafetyFormProps {
  room: UserRoom;
}

export function RoomSafetyForm({ room }: RoomSafetyFormProps) {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof safetySchema>>({
    resolver: zodResolver(safetySchema),
    defaultValues: {
      has_alarm_or_cctv: room.has_alarm_or_cctv || false,
      has_smoke_detector: room.has_smoke_detector || false,
      has_co_detector: room.has_co_detector || false,
      utility_locations: room.utility_locations || '',
      technical_room_location: room.technical_room_location || '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof safetySchema>) => updateUserRoom(room.id, values),
    onSuccess: () => {
      toast.success("Informations de sécurité mises à jour.");
      queryClient.invalidateQueries({ queryKey: ['userRooms'] });
    },
    onError: (error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
                control={form.control}
                name="has_alarm_or_cctv"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <FormLabel>Alarme / Vidéo</FormLabel>
                    </div>
                    <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="has_smoke_detector"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <FormLabel>Détecteur fumée</FormLabel>
                    </div>
                    <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="has_co_detector"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <FormLabel>Détecteur CO</FormLabel>
                    </div>
                    <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    </FormItem>
                )}
            />
        </div>
        <FormField
          control={form.control}
          name="utility_locations"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Emplacement des compteurs</FormLabel>
              <FormControl>
                <Textarea placeholder="Décrivez où se trouvent les compteurs d'eau, d'électricité, de gaz, etc." {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="technical_room_location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Emplacement du local technique / produits à verrouiller</FormLabel>
              <FormControl>
                <Textarea placeholder="Localisation du local ou des produits d'entretien." {...field} rows={3} />
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