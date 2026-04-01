import { useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { Link, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertCircle, ArrowLeft, Mail, MessageSquare, Shield } from 'lucide-react';
import BrandBackdrop from '@/components/BrandBackdrop';
import MainLayout from '@/components/MainLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
      return priority;
  }
}

function getStatusClasses(status: OwnerTicketStatus) {
  switch (status) {
    case 'open':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'pending':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'closed':
      return 'border-slate-200 bg-slate-100 text-slate-700';
    default:
      return 'border-sky-200 bg-sky-50 text-sky-700';
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

function getDirectionClasses(direction: OwnerTicketConversationDirection) {
  switch (direction) {
    case 'outgoing':
      return 'border-sky-200 bg-sky-50/80';
    case 'internal':
      return 'border-amber-200 bg-amber-50/80';
    case 'incoming':
      return 'border-slate-200 bg-white';
    default:
      return 'border-slate-200 bg-slate-50/70';
  }
}

const ConversationItem = ({ message }: { message: OwnerTicketConversation }) => {
  const safeHtml = message.body_html ? DOMPurify.sanitize(message.body_html) : null;

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${getDirectionClasses(message.direction)}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-[hsl(var(--sidebar-foreground))]">
              {message.author_name || 'Support'}
            </p>
            <Badge variant="outline" className="border-white/60 bg-white/70 text-slate-600">
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
            <div className="mt-1 inline-flex items-center gap-1 text-sm text-slate-500">
              <Mail className="h-3.5 w-3.5" />
              {message.author_email}
            </div>
          )}
        </div>

        <div className="text-sm text-slate-500">
          {formatDate(message.created_at)}
        </div>
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

  const metadata = useMemo(
    () =>
      ticket
        ? [
            { label: 'Créé le', value: formatDate(ticket.created_at) },
            { label: 'Dernière activité', value: formatDate(ticket.last_activity_at) },
            { label: 'Email source', value: ticket.from_email || '—' },
            { label: 'Source', value: ticket.source_provider || '—' },
          ]
        : [],
    [ticket],
  );

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="relative overflow-hidden rounded-[28px] border border-[hsl(var(--sidebar-border))] bg-gradient-to-br from-white via-[hsl(var(--sidebar-background))] to-sky-50 shadow-[0_24px_80px_rgba(37,95,133,0.10)]">
          <BrandBackdrop variant="blue" className="opacity-70" />

          <div className="relative p-5 sm:p-8">
            <div className="rounded-[24px] border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur sm:p-6">
              <div className="border-b border-sky-100 pb-6">
                <Button asChild variant="outline" className="w-fit rounded-full border-sky-200 bg-white text-[hsl(var(--sidebar-foreground))] hover:bg-sky-50">
                  <Link to="/tickets">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour à mes tickets
                  </Link>
                </Button>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge className="bg-[hsl(var(--sidebar-foreground))] text-white hover:bg-[hsl(var(--sidebar-foreground))]">
                    Détail ticket
                  </Badge>
                  {ticket && (
                    <Badge variant="outline" className={getStatusClasses(ticket.status)}>
                      {getStatusLabel(ticket.status)}
                    </Badge>
                  )}
                  {ticket?.priority && (
                    <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                      Priorité {getPriorityLabel(ticket.priority)}
                    </Badge>
                  )}
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[hsl(var(--sidebar-foreground))]">
                  {loading ? 'Chargement du ticket…' : ticket?.subject || 'Ticket'}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  Une vue allégée pour lire rapidement le contexte du ticket et son historique de conversation.
                </p>
              </div>

              <div className="mt-6 space-y-6">
                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50/80">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Chargement impossible</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {loading ? (
                  <>
                    <Card className="border-sky-100 bg-white shadow-sm">
                      <CardContent className="p-5">
                        <Skeleton className="h-6 w-2/3" />
                        <Skeleton className="mt-3 h-4 w-full" />
                        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          {Array.from({ length: 4 }).map((_, index) => (
                            <Skeleton key={index} className="h-14 w-full" />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} className="h-36 w-full rounded-2xl" />
                      ))}
                    </div>
                  </>
                ) : ticket ? (
                  <>
                    {(ticket.description_html || ticket.description || ticket.preview) && (
                      <Card className="border-sky-100 bg-white shadow-sm">
                        <CardContent className="p-5">
                          <div className="text-sm font-medium text-slate-500">Résumé</div>
                          <div className="mt-3 text-sm leading-6 text-slate-700">
                            {ticket.description_html ? (
                              <div className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ticket.description_html) }} />
                            ) : (
                              <p className="whitespace-pre-wrap">{ticket.description || ticket.preview}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {metadata.map((item) => (
                        <div key={item.label} className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
                          <div className="mt-2 text-sm font-medium text-[hsl(var(--sidebar-foreground))] break-all">{item.value}</div>
                        </div>
                      ))}
                    </div>

                    <Card className="border-sky-100 bg-white shadow-sm">
                      <CardContent className="p-5 sm:p-6">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-[hsl(var(--sidebar-foreground))]" />
                          <div>
                            <h2 className="text-xl font-semibold text-[hsl(var(--sidebar-foreground))]">Historique des conversations</h2>
                            <p className="text-sm text-slate-600">
                              {ticket.conversations.length} message{ticket.conversations.length > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 space-y-3">
                          {ticket.conversations.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 p-8 text-center text-sm text-slate-600">
                              Aucun message n’a été remonté pour ce ticket.
                            </div>
                          ) : (
                            ticket.conversations.map((message: OwnerTicketConversation) => (
                              <ConversationItem key={message.id} message={message} />
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default TicketDetailPage;
