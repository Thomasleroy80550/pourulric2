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
import { Input } from './ui/input';

const houseRulesSchema = z.object({
  house_rules: z.string().optional(),
  is_non_smoking: z.boolean().optional(),
  are_pets_allowed: z.boolean().optional(),
  noise_limit_time: z.string().optional(),
  waste_sorting_instructions: z.string().optional(),
  forbidden_areas: z.string().optional(),
});

interface RoomHouseRulesFormProps {
  room: UserRoom;
}

export function RoomHouseRulesForm({ room }: RoomHouseRulesFormProps) {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof houseRulesSchema>>({
    resolver: zodResolver(houseRulesSchema),
    defaultValues: {
      house_rules: room.house_rules || '',
      is_non_smoking: room.is_non_smoking || false,
      are_pets_allowed: room.are_pets_allowed || false,
      noise_limit_time: room.noise_limit_time || '',
      waste_sorting_instructions: room.waste_sorting_instructions || '',
      forbidden_areas: room.forbidden_areas || '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof houseRulesSchema>) => updateUserRoom(room.id, values),
    onSuccess: () => {
      toast.success("Règlement intérieur mis à jour.");
      queryClient.invalidateQueries({ queryKey: ['userRooms'] });
    },
    onError: (error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
        <div className="flex space-x-4">
          <FormField
            control={form.control}
            name="is_non_smoking"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 w-1/2">
                <div className="space-y-0.5">
                  <FormLabel>Logement non-fumeur</FormLabel>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="are_pets_allowed"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 w-1/2">
                <div className="space-y-0.5">
                  <FormLabel>Animaux autorisés</FormLabel>
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
          name="noise_limit_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bruit toléré jusqu'à</FormLabel>
              <FormControl>
                <Input type="time" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="waste_sorting_instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Consignes de tri des déchets</FormLabel>
              <FormControl>
                <Textarea placeholder="Détaillez les consignes spécifiques pour le tri..." {...field} rows={4} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="forbidden_areas"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Espaces interdits au locataire</FormLabel>
              <FormControl>
                <Textarea placeholder="Caves, greniers, placards privés..." {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="house_rules"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Autres règles</FormLabel>
              <FormControl>
                <Textarea placeholder="Autres règles spécifiques..." {...field} rows={5} />
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