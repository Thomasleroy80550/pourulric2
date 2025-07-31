import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserRoom, updateUserRoom } from '@/lib/user-room-api';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

const houseRulesSchema = z.object({
  house_rules: z.string().optional(),
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
        <FormField
          control={form.control}
          name="house_rules"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Règlement intérieur</FormLabel>
              <FormControl>
                <Textarea placeholder="Animaux, fêtes, zones non-fumeur, etc." {...field} rows={8} />
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