import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserRoom, updateUserRoom } from '@/lib/user-room-api';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const generalInfoSchema = z.object({
  property_type: z.string().optional(),
  arrival_instructions: z.string().optional(),
  parking_info: z.string().optional(),
});

interface RoomGeneralInfoFormProps {
  room: UserRoom;
}

export function RoomGeneralInfoForm({ room }: RoomGeneralInfoFormProps) {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof generalInfoSchema>>({
    resolver: zodResolver(generalInfoSchema),
    defaultValues: {
      property_type: room.property_type || '',
      arrival_instructions: room.arrival_instructions || '',
      parking_info: room.parking_info || '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof generalInfoSchema>) => updateUserRoom(room.id, values),
    onSuccess: () => {
      toast.success("Informations générales mises à jour.");
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
          name="property_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type de propriété</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Appartement">Appartement</SelectItem>
                  <SelectItem value="Maison">Maison</SelectItem>
                  <SelectItem value="Studio">Studio</SelectItem>
                  <SelectItem value="Villa">Villa</SelectItem>
                  <SelectItem value="Chambre">Chambre</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="arrival_instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instructions d'arrivée</FormLabel>
              <FormControl>
                <Textarea placeholder="Détaillez la procédure d'arrivée pour les voyageurs..." {...field} rows={5} />
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
              <FormLabel>Informations sur le parking</FormLabel>
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