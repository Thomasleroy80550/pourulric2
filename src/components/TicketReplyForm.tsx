import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { replyToTicket, ReplyToTicketPayload } from '@/lib/tickets-api';
import { showSuccess, showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/components/SessionContextProvider';

const formSchema = z.object({
  body: z.string().min(1, { message: 'La réponse ne peut pas être vide.' }),
});

interface TicketReplyFormProps {
  ticketId: number;
}

export const TicketReplyForm: React.FC<TicketReplyFormProps> = ({ ticketId }) => {
  const queryClient = useQueryClient();
  const { session } = useSession();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      body: '',
    },
  });

  const replyMutation = useMutation({
    mutationFn: (reply: ReplyToTicketPayload) => replyToTicket(reply),
    onSuccess: (data) => {
      console.log('Reply sent successfully:', data);
      showSuccess('Votre réponse a été envoyée.');
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      form.reset();
    },
    onError: (error) => {
      console.error('Error sending reply:', error);
      showError(`Erreur lors de l'envoi de la réponse: ${error.message}`);
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!session?.user?.email) {
      showError("Impossible d'envoyer la réponse : l'email de l'utilisateur n'est pas disponible.");
      return;
    }
    
    const payload: ReplyToTicketPayload = { 
      ticketId, 
      body: values.body,
    };
    
    replyMutation.mutate(payload);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder="Écrivez votre réponse ici..."
                  className="resize-none"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={replyMutation.isPending}>
            {replyMutation.isPending ? 'Envoi...' : 'Répondre'}
          </Button>
        </div>
      </form>
    </Form>
  );
};