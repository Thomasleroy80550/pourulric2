import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getTicketDetails, FreshdeskTicketDetails, replyToTicket } from '@/lib/tickets-api';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, User, MessageSquare } from 'lucide-react';
import DOMPurify from 'dompurify';
import { safeFormat } from '@/lib/date-utils';
import { TicketReplyForm } from '@/components/TicketReplyForm';
import { CardTitle } from '@/components/ui/card';

const getStatusVariant = (status: number): 'success' | 'warning' | 'default' | 'secondary' => {
  switch (status) {
    case 2: return 'default'; // Open
    case 3: return 'warning'; // Pending
    case 4: return 'success'; // Resolved
    case 5: return 'secondary'; // Closed
    default: return 'secondary';
  }
};

const getStatusText = (status: number): string => {
  switch (status) {
    case 2: return 'Ouvert';
    case 3: return 'En attente';
    case 4: return 'Résolu';
    case 5: return 'Fermé';
    default: return 'Inconnu';
  }
};

const TicketDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const ticketId = Number(id);

  const { data: ticket, isLoading, error, isError } = useQuery<FreshdeskTicketDetails, Error>({
    queryKey: ['ticket', ticketId],
    queryFn: () => getTicketDetails(ticketId),
    enabled: !!ticketId,
  });

  const replyToTicketMutation = useMutation({
    mutationFn: replyToTicket,
    onSuccess: () => {
      // Rafraîchir les données du ticket après une réponse réussie
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
    },
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <div>
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/4 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      );
    }

    if (isError) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            Impossible de charger les détails du ticket : {error.message}
          </AlertDescription>
        </Alert>
      );
    }

    if (!ticket) {
      return <div>Ticket non trouvé.</div>;
    }

    const cleanHtml = (html: string) => {
      if (!html) return '';
      return DOMPurify.sanitize(html);
    };

    const conversations = ticket.conversations || [];
    
    let ticketDescription = ticket.description_text || ticket.description || 'Aucune description disponible';

    return (
      <div>
        <div className="flex justify-between items-start mb-4">
          <div>
            <CardTitle className="text-2xl">{ticket.subject}</CardTitle>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <Badge variant={getStatusVariant(ticket.status)}>{getStatusText(ticket.status)}</Badge>
              <span>Créé le: {safeFormat(ticket.created_at, 'dd/MM/yyyy HH:mm')}</span>
            </div>
          </div>
        </div>

        <div className="space-y-6 mt-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="h-6 w-6 text-gray-500" />
            </div>
            <div className="flex-grow">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3">
                <p className="font-semibold">Vous</p>
                <div
                  className="prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: cleanHtml(ticketDescription) }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {safeFormat(ticket.created_at, 'dd MMMM yyyy à HH:mm')}
              </p>
            </div>
          </div>

          {conversations.map((convo) => (
            <div key={convo.id} className={`flex gap-4 ${convo.from_agent ? '' : 'flex-row-reverse'}`}>
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                {convo.from_agent ? (
                  <MessageSquare className="h-6 w-6 text-gray-500" />
                ) : (
                  <User className="h-6 w-6 text-gray-500" />
                )}
              </div>
              <div className={`flex-grow ${convo.from_agent ? '' : 'text-right'}`}>
                <div className={`${convo.from_agent ? 'bg-gray-100 dark:bg-gray-800' : 'bg-blue-100 dark:bg-blue-900'} rounded-lg px-4 py-3`}>
                  <p className="font-semibold">{convo.from_agent ? 'Support' : 'Vous'}</p>
                  <div
                    className="prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: cleanHtml(convo.body) }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {safeFormat(convo.created_at, 'dd MMMM yyyy à HH:mm')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {(ticket.status === 2 || ticket.status === 3) && (
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Répondre</h3>
            <TicketReplyForm ticketId={ticket.id} />
          </div>
        )}
      </div>
    );
  };

  return (
    <MainLayout>
      <Card>
        <CardContent className="pt-6">
          {renderContent()}
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default TicketDetailPage;