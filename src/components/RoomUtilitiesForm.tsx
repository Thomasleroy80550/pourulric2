"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { UserRoom, updateUserRoom } from "@/lib/user-room-api";

const FormSchema = z.object({
  utility_locations: z.string().optional(),
});

interface RoomUtilitiesFormProps {
  room: UserRoom;
}

export function RoomUtilitiesForm({ room }: RoomUtilitiesFormProps) {
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      utility_locations: room.utility_locations || "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof FormSchema>) => updateUserRoom(room.id, values),
    onSuccess: () => {
      toast.success("Informations sur les compteurs mises à jour avec succès.");
      queryClient.invalidateQueries({ queryKey: ['userRooms'] });
      queryClient.invalidateQueries({ queryKey: ['userRoom', room.id] });
    },
    onError: (error) => {
      toast.error(`Erreur lors de la mise à jour : ${error.message}`);
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    mutation.mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="utility_locations"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Emplacement des compteurs</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Décrivez où se trouvent les compteurs d'eau, d'électricité, de gaz, etc."
                  className="min-h-[150px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Soyez aussi précis que possible pour faciliter l'accès en cas de besoin.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </Button>
      </form>
    </Form>
  );
}