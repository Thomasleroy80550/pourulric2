import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getTicketById, replyToTicket, FreshdeskConversation } from '@/lib/tickets-api';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, ArrowLeft, Send, User, Headset } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

const getStatusVariant = (status: number) => {
  switch (status) {
    case 2: return 'default';
    case 3: return 'warning';
    case 4: return 'success';
    case 5: return 'secondary';
    default: return 'secondary';
  }
};

const getStatusText = (status: number) => {
  switch (status) {
    case 2: return 'Ouvert';
    case 3: return 'En attente';
    case 4: return 'Résolu';
    case 5: return 'Fermé';
    default: return 'Inconnu';
  }
};

const replySchema = z.object({
  body: z.string().min(1, 'La réponse ne peut pas être vide.'),
});

const TicketDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: ticket, isLoading, isError, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => getTicketById(id!),
    enabled: !!id,
  });

  const form = useForm<z.infer<typeof replySchema>>({
    resolver: zodResolver(replySchema),
    defaultValues: { body: '' },
  });

  const replyMutation = useMutation({
    mutationFn: replyToTicket,
    onSuccess: () => {
      showSuccess('Réponse envoyée avec succès !');
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      form.reset();
    },
    onError: (err: Error) => {
      showError(`Erreur lors de l'envoi de la réponse : ${err.message}`);
    },
  });

  const onSubmit = (values: z.infer<typeof replySchema>) => {
    replyMutation.mutate({ ticketId: id!, body: values.body });
  };

  const renderConversation = (conv: FreshdeskConversation) => {
    const isRequester = conv.user_id === ticket?.requester_id;
    return (
      <div key={conv.id} className={cn('flex items-start gap-4 my-4', isRequester ? 'justify-start' : 'justify-end')}>
        {isRequester && (
          <Avatar>
            <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
          </Avatar>
        )}
        <div className={cn('max-w-md rounded-lg p-3', isRequester ? 'bg-muted' : 'bg-primary text-primary-foreground')}>
          <p className="text-sm" dangerouslySetInnerHTML={{ __html: conv.body }}></p>
          <p className="text-xs opacity-70 mt-2 text-right">
            {format(new Date(conv.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
          </p>
        </div>
        {!isRequester && (
          <Avatar>
            <AvatarFallback className="bg-blue-500 text-white"><Headset className="h-4 w-4" /></AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) return <Skeleton className="h-96 w-full" />;
    if (isError) return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
    if (!ticket) return <p>Ticket non trouvé.</p>;

    const isTicketClosed = ticket.status === 4 || ticket.status === 5;

    return (
      <>
        <ScrollArea className="h-[400px] pr-4">
          {ticket.conversations.map(renderConversation)}
        </ScrollArea>
        <div className="mt-6 pt-6 border-t">
          {isTicketClosed ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Ticket fermé</AlertTitle>
              <AlertDescription>Ce ticket est résolu ou fermé. Vous ne pouvez plus y répondre.</AlertDescription>
            </Alert>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <Textarea placeholder="Écrivez votre réponse..." {...field} rows={4} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={replyMutation.isPending}>
                  {replyMutation.isPending ? 'Envoi...' : 'Envoyer la réponse'}
                  <Send className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </Form>
          )}
        </div>
      </>
    );
  };

  return (
    <MainLayout>
      <div className="mb-4">
        <Button asChild variant="outline" size="sm">
          <Link to="/tickets">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{ticket?.subject || <Skeleton className="h-8 w-96" />}</CardTitle>
              <CardDescription>
                Ticket #{ticket?.id} - Créé le {ticket ? format(new Date(ticket.created_at), 'dd/MM/yyyy', { locale: fr }) : '...'}
              </CardDescription>
            </div>
            {ticket && <Badge variant={getStatusVariant(ticket.status)}>{getStatusText(ticket.status)}</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default TicketDetailPage;