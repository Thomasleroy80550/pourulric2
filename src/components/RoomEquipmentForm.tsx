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

const equipmentSchema = z.object({
  appliances_list: z.string().optional(),
  bedding_description: z.string().optional(),
  has_baby_cot: z.boolean().optional(),
  has_high_chair: z.boolean().optional(),
  outdoor_equipment: z.string().optional(),
  specific_appliances: z.string().optional(),
  has_cleaning_equipment: z.boolean().optional(),
});

interface RoomEquipmentFormProps {
  room: UserRoom;
}

export function RoomEquipmentForm({ room }: RoomEquipmentFormProps) {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof equipmentSchema>>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      appliances_list: room.appliances_list || '',
      bedding_description: room.bedding_description || '',
      has_baby_cot: room.has_baby_cot || false,
      has_high_chair: room.has_high_chair || false,
      outdoor_equipment: room.outdoor_equipment || '',
      specific_appliances: room.specific_appliances || '',
      has_cleaning_equipment: room.has_cleaning_equipment || false,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof equipmentSchema>) => updateUserRoom(room.id, values),
    onSuccess: () => {
      toast.success("Équipements mis à jour.");
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
          name="bedding_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre et type de couchages</FormLabel>
              <FormControl>
                <Textarea placeholder="Ex: 1 lit double (160x200), 1 canapé-lit (140x190)..." {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="appliances_list"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Équipements électroménagers</FormLabel>
              <FormControl>
                <Textarea placeholder="Four, cafetière, lave-vaisselle, micro-ondes..." {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="specific_appliances"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Appareils spécifiques</FormLabel>
              <FormControl>
                <Textarea placeholder="Sèche-cheveux, aspirateur, fer à repasser..." {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="outdoor_equipment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Équipement extérieur</FormLabel>
              <FormControl>
                <Textarea placeholder="Salon de jardin, barbecue, chaises longues..." {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
                control={form.control}
                name="has_baby_cot"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <FormLabel>Lit bébé</FormLabel>
                    </div>
                    <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="has_high_chair"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <FormLabel>Chaise haute</FormLabel>
                    </div>
                    <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="has_cleaning_equipment"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <FormLabel>Matériel ménage</FormLabel>
                    </div>
                    <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    </FormItem>
                )}
            />
        </div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </form>
    </Form>
  );
}