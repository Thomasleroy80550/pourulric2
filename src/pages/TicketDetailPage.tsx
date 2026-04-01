import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { Link, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertCircle, ArrowLeft, Clock3, Mail, MessageSquare, Shield } from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getTicketDetails,
  OwnerTicketConversation,
  OwnerTicketConversationDirection,
  OwnerTicketDetail,
  OwnerTicketPriority,
  OwnerTicketStatus,
} from '@/lib/tickets-api';

function formatDate(date: string | null) {
  if (!date) {
    return '—';
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return format(parsed, 'dd MMM yyyy à HH:mm', { locale: fr });
}

function getStatusBadgeVariant(status: OwnerTicketStatus): 'default' | 'secondary' | 'outline' {
  switch (status) {
    case 'open':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'closed':
      return 'outline';
    default:
      return 'secondary';
  }
}

function getStatusLabel(status: OwnerTicketStatus) {
  switch (status) {
    case 'open':
      return 'Ouvert';
    case 'pending':
      return 'En attente';
    case 'closed':
      return 'Fermé';
    default:
      return status;
  }
}

function getPriorityLabel(priority: OwnerTicketPriority | null) {
  switch (priority) {
    case 'low':
      return 'Basse';
    case 'medium':
      return 'Moyenne';
    case 'high':
      return 'Haute';
    default:
      return priority;
  }
}

function getDirectionStyle(direction: OwnerTicketConversationDirection) {
  switch (direction) {
    case 'outgoing':
      return 'ml-auto border-blue-200 bg-blue-50';
    case 'internal':
      return 'border-amber-200 bg-amber-50';
    case 'incoming':
      return 'border-border bg-background';
    default:
      return 'border-border bg-muted/40';
  }
}

function getDirectionLabel(direction: OwnerTicketConversationDirection) {
  switch (direction) {
    case 'incoming':
      return 'Message reçu';
    case 'outgoing':
      return 'Réponse support';
    case 'internal':
      return 'Note interne';
    default:
      return 'Message';
  }
}

const ConversationItem = ({ message }: { message: OwnerTicketConversation }) => {
  const safeHtml = message.body_html ? DOMPurify.sanitize(message.body_html) : null;

  return (
    <div className={`max-w-3xl rounded-xl border p-4 shadow-sm ${getDirectionStyle(message.direction)}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{getDirectionLabel(message.direction)}</Badge>
        {message.is_private && (
          <Badge variant="secondary">
            <Shield className="mr-1 h-3 w-3" />
            Privé
          </Badge>
        )}
        <span>{formatDate(message.created_at)}</span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{message.author_name || 'Support'}</span>
        {message.author_email && (
          <span className="inline-flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" />
            {message.author_email}
          </span>
        )}
      </div>

      {safeHtml ? (
        <div
          className="prose prose-sm max-w-none text-foreground"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
          {message.body || 'Message sans contenu.'}
        </p>
      )}
    </div>
  );
};

const TicketDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<OwnerTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('Ticket introuvable.');
      return;
    }

    let isMounted = true;

    const loadTicket = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getTicketDetails(id);
        if (isMounted) {
          setTicket(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Impossible de charger ce ticket.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTicket();

    return () => {
      isMounted = false;
    };
  }, [id]);

  return (
    <MainLayout>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Button asChild variant="outline" size="sm" className="w-fit">
              <Link to="/tickets">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à mes tickets
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Détail ticket</h1>
              <p className="text-muted-foreground">
                Consultez l’historique complet des échanges liés à votre ticket.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Chargement impossible</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-32 w-full" />
                ))}
              </CardContent>
            </Card>
          </div>
        ) : ticket ? (
          <>
            <Card>
              <CardHeader className="gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(ticket.status)}>{getStatusLabel(ticket.status)}</Badge>
                  {ticket.priority && <Badge variant="outline">Priorité {getPriorityLabel(ticket.priority)}</Badge>}
                  {ticket.unread_count > 0 && <Badge className="bg-blue-600 text-white hover:bg-blue-600">{ticket.unread_count} non lu{ticket.unread_count > 1 ? 's' : ''}</Badge>}
                </div>
                <div>
                  <CardTitle className="text-2xl leading-tight">{ticket.subject}</CardTitle>
                  <CardDescription>
                    Ticket #{ticket.id}
                    {ticket.from_email ? ` • ${ticket.from_email}` : ''}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {(ticket.description_html || ticket.description || ticket.preview) && (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="mb-2 text-sm font-medium text-foreground">Résumé</div>
                    {ticket.description_html ? (
                      <div
                        className="prose prose-sm max-w-none text-foreground"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ticket.description_html) }}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {ticket.description || ticket.preview}
                      </p>
                    )}
                  </div>
                )}

                <div className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border bg-background p-4">
                    <div className="mb-1 font-medium text-foreground">Créé le</div>
                    <div className="text-muted-foreground">{formatDate(ticket.created_at)}</div>
                  </div>
                  <div className="rounded-lg border bg-background p-4">
                    <div className="mb-1 font-medium text-foreground">Dernière activité</div>
                    <div className="text-muted-foreground">{formatDate(ticket.last_activity_at)}</div>
                  </div>
                  <div className="rounded-lg border bg-background p-4">
                    <div className="mb-1 font-medium text-foreground">Source</div>
                    <div className="text-muted-foreground">{ticket.source_provider || '—'}</div>
                  </div>
                  <div className="rounded-lg border bg-background p-4">
                    <div className="mb-1 font-medium text-foreground">Statut avancé</div>
                    <div className="text-muted-foreground">
                      {ticket.archived_at ? 'Archivé' : ticket.spam_at ? 'Spam' : 'Actif'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  <CardTitle>Historique des conversations</CardTitle>
                </div>
                <CardDescription>
                  {ticket.conversations.length > 0
                    ? `${ticket.conversations.length} message${ticket.conversations.length > 1 ? 's' : ''}`
                    : 'Aucun historique disponible pour ce ticket.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ticket.conversations.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Aucun message n’a été remonté pour ce ticket.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ticket.conversations.map((message: OwnerTicketConversation) => (
                      <ConversationItem key={message.id} message={message} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock3 className="h-4 w-4" />
              Dernière mise à jour du ticket : {formatDate(ticket.last_activity_at)}
            </div>
          </>
        ) : null}
      </div>
    </MainLayout>
  );
};

export default TicketDetailPage;
