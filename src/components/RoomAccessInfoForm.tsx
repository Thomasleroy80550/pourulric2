import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserRoom, updateUserRoom } from '@/lib/user-room-api';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { KeyRound, Wifi } from 'lucide-react';

const accessSchema = z.object({
  keybox_code: z.string().optional(),
  wifi_code: z.string().optional(),
});

interface RoomAccessInfoFormProps {
  room: UserRoom;
}

export function RoomAccessInfoForm({ room }: RoomAccessInfoFormProps) {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof accessSchema>>({
    resolver: zodResolver(accessSchema),
    defaultValues: {
      keybox_code: room.keybox_code || '',
      wifi_code: room.wifi_code || '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof accessSchema>) => updateUserRoom(room.id, values),
    onSuccess: () => {
      toast.success("Informations d'accès mises à jour.");
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
          name="keybox_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center"><KeyRound className="mr-2 h-4 w-4" /> Code de la boîte à clés</FormLabel>
              <FormControl>
                <Input placeholder="Ex: 1234#" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="wifi_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center"><Wifi className="mr-2 h-4 w-4" /> Code Wi-Fi</FormLabel>
              <FormControl>
                <Input placeholder="Ex: MySuperPassword" {...field} />
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