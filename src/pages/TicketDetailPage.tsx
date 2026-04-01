import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { Link, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertCircle, ArrowLeft, Mail, MessageSquare, Shield } from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  if (!date) return '—';

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';

  return format(parsed, 'dd MMM yyyy à HH:mm', { locale: fr });
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
      return priority || '—';
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
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-slate-900">{message.author_name || 'Support'}</p>
            <Badge variant="outline" className="text-slate-600">
              {getDirectionLabel(message.direction)}
            </Badge>
            {message.is_private && (
              <Badge variant="secondary">
                <Shield className="mr-1 h-3 w-3" />
                Privé
              </Badge>
            )}
          </div>

          {message.author_email && (
            <div className="inline-flex items-center gap-1 text-sm text-slate-500">
              <Mail className="h-3.5 w-3.5" />
              {message.author_email}
            </div>
          )}
        </div>

        <div className="text-sm text-slate-500">{formatDate(message.created_at)}</div>
      </div>

      <div className="mt-4 text-sm leading-6 text-slate-700">
        {safeHtml ? (
          <div className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: safeHtml }} />
        ) : (
          <p className="whitespace-pre-wrap">{message.body || 'Message sans contenu.'}</p>
        )}
      </div>
    </div>
  );
};

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-1">
    <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</dt>
    <dd className="text-sm text-slate-900 break-all">{value}</dd>
  </div>
);

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
        if (isMounted) setTicket(data);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Impossible de charger ce ticket.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadTicket();

    return () => {
      isMounted = false;
    };
  }, [id]);

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        <div className="mb-6 space-y-4">
          <Button asChild variant="ghost" size="sm" className="w-fit px-0 text-slate-600 hover:bg-transparent hover:text-slate-900">
            <Link to="/tickets">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux tickets
            </Link>
          </Button>

          <div className="space-y-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              {loading ? 'Chargement du ticket…' : ticket?.subject || 'Ticket'}
            </h1>

            {ticket && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span>Ticket #{ticket.id}</span>
                <span className="text-slate-300">•</span>
                <span>{formatDate(ticket.last_activity_at)}</span>
                <Badge variant="outline">{getStatusLabel(ticket.status)}</Badge>
                <Badge variant="outline">Priorité {getPriorityLabel(ticket.priority)}</Badge>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Chargement impossible</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 w-full rounded-md" />
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-56" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-28 w-full rounded-md" />
                  ))}
                </CardContent>
              </Card>
            </>
          ) : ticket ? (
            <>
              {(ticket.description_html || ticket.description || ticket.preview) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Résumé</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm leading-6 text-slate-700">
                    {ticket.description_html ? (
                      <div
                        className="prose prose-sm max-w-none text-foreground"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ticket.description_html) }}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap">{ticket.description || ticket.preview}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Informations</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <InfoItem label="Statut" value={getStatusLabel(ticket.status)} />
                    <InfoItem label="Priorité" value={getPriorityLabel(ticket.priority)} />
                    <InfoItem label="Créé le" value={formatDate(ticket.created_at)} />
                    <InfoItem label="Dernière activité" value={formatDate(ticket.last_activity_at)} />
                    <InfoItem label="Email source" value={ticket.from_email || '—'} />
                    <InfoItem label="Source" value={ticket.source_provider || '—'} />
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-slate-700" />
                    <div>
                      <CardTitle>Historique des échanges</CardTitle>
                      <p className="mt-1 text-sm font-normal text-slate-500">
                        {ticket.conversations.length} message{ticket.conversations.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {ticket.conversations.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
                        Aucun message n’a été remonté pour ce ticket.
                      </div>
                    ) : (
                      ticket.conversations.map((message) => <ConversationItem key={message.id} message={message} />)
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </MainLayout>
  );
};

export default TicketDetailPage;
