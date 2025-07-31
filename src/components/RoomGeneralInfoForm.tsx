import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserRoom, updateUserRoom } from '@/lib/user-room-api';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from './ui/switch';

const generalInfoSchema = z.object({
  property_type: z.string().optional(),
  arrival_instructions: z.string().optional(),
  departure_instructions: z.string().optional(),
  logement_specificities: z.string().optional(),
  recent_works: z.string().optional(),
  has_house_manual: z.boolean().optional(),
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
      departure_instructions: room.departure_instructions || '',
      logement_specificities: room.logement_specificities || '',
      recent_works: room.recent_works || '',
      has_house_manual: room.has_house_manual || false,
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
          name="departure_instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instructions de départ</FormLabel>
              <FormControl>
                <Textarea placeholder="Que doivent faire les locataires avant de partir ?" {...field} rows={5} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="logement_specificities"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Particularités du logement</FormLabel>
              <FormControl>
                <Textarea placeholder="Bruit, voisinage, sol glissant, etc." {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="recent_works"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Derniers travaux ou équipements récents</FormLabel>
              <FormControl>
                <Textarea placeholder="Travaux réalisés, nouveaux équipements installés..." {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="has_house_manual"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Manuel de la maison disponible ?</FormLabel>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
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