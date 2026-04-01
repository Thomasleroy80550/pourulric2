import { FormEvent, useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { Link, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertCircle, ArrowLeft, Loader2, Mail, Send, Shield } from 'lucide-react';
import { toast } from 'sonner';
import MainLayout from '@/components/MainLayout';
import { useSession } from '@/components/SessionContextProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  getTicketDetails,
  OwnerTicketConversation,
  OwnerTicketConversationDirection,
  OwnerTicketDetail,
  OwnerTicketPriority,
  OwnerTicketStatus,
  replyToTicket,
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
      return 'Réponse';
    case 'internal':
      return 'Note interne';
    default:
      return 'Message';
  }
}

function getMessageTone(direction: OwnerTicketConversationDirection) {
  switch (direction) {
    case 'outgoing':
      return 'border-l-slate-300';
    case 'internal':
      return 'border-l-amber-300';
    default:
      return 'border-l-sky-300';
  }
}

const MailMessage = ({
  authorName,
  authorEmail,
  date,
  label,
  body,
  bodyHtml,
  isPrivate = false,
  tone = 'border-l-slate-300',
}: {
  authorName: string;
  authorEmail?: string | null;
  date: string | null;
  label: string;
  body?: string | null;
  bodyHtml?: string | null;
  isPrivate?: boolean;
  tone?: string;
}) => {
  const safeHtml = bodyHtml ? DOMPurify.sanitize(bodyHtml) : null;

  return (
    <article className={`border-b border-l-4 border-slate-200 bg-white last:border-b-0 ${tone}`}>
      <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-slate-900">{authorName}</p>
            <Badge variant="outline" className="rounded-full text-slate-600">
              {label}
            </Badge>
            {isPrivate && (
              <Badge variant="secondary" className="rounded-full">
                <Shield className="mr-1 h-3 w-3" />
                Privé
              </Badge>
            )}
          </div>

          <div className="mt-2 space-y-1 text-sm text-slate-500">
            {authorEmail && (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                <span className="truncate">De : {authorEmail}</span>
              </div>
            )}
            <div>Envoyé le {formatDate(date)}</div>
          </div>
        </div>

        <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
          Message
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-5 text-[15px] leading-7 text-slate-700">
        {safeHtml ? (
          <div
            className="prose prose-sm max-w-none text-slate-700 prose-p:leading-7 prose-p:text-slate-700 prose-a:text-slate-900 prose-strong:text-slate-900"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        ) : (
          <p className="whitespace-pre-wrap">{body || 'Message sans contenu.'}</p>
        )}
      </div>
    </article>
  );
};

const TicketDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { profile, session } = useSession();
  const [ticket, setTicket] = useState<OwnerTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [optimisticReplies, setOptimisticReplies] = useState<OwnerTicketConversation[]>([]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('Ticket introuvable.');
      return;
    }

    let isMounted = true;
    setOptimisticReplies([]);

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

  const conversationMessages = useMemo(
    () => [...(ticket?.conversations ?? []), ...optimisticReplies],
    [ticket, optimisticReplies],
  );

  const handleReplySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!ticket) return;

    const message = replyBody.trim();
    if (!message) {
      toast.error('Votre réponse est vide.');
      return;
    }

    try {
      setSendingReply(true);
      await replyToTicket(ticket.id, ticket.subject, message);

      const sentAt = new Date().toISOString();
      const displayName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Vous';

      setOptimisticReplies((current) => [
        ...current,
        {
          id: `local-reply-${Date.now()}`,
          created_at: sentAt,
          author_name: displayName,
          author_email: session?.user?.email || ticket.from_email,
          direction: 'outgoing',
          is_private: false,
          body: message,
          body_html: null,
        },
      ]);

      setTicket((current) =>
        current
          ? {
              ...current,
              last_activity_at: sentAt,
            }
          : current,
      );

      setReplyBody('');
      toast.success('Réponse envoyée.', {
        description: 'Elle apparaît maintenant dans le fil de discussion.',
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible d’envoyer votre réponse.');
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        <div className="mb-5 space-y-4">
          <Button asChild variant="ghost" size="sm" className="w-fit px-0 text-slate-600 hover:bg-transparent hover:text-slate-900">
            <Link to="/tickets">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux tickets
            </Link>
          </Button>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              {loading ? 'Chargement du ticket…' : ticket?.subject || 'Ticket'}
            </h1>

            {ticket && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span>Ticket #{ticket.id}</span>
                <span className="text-slate-300">•</span>
                <span>{ticket.from_email || 'Email inconnu'}</span>
                <span className="text-slate-300">•</span>
                <span>{formatDate(ticket.created_at)}</span>
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
              <Card className="overflow-hidden border-slate-200 shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="mt-3 h-4 w-48" />
                </div>
                <div className="space-y-0">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="border-b border-slate-200 px-5 py-5 last:border-b-0">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="mt-4 h-4 w-full" />
                      <Skeleton className="mt-2 h-4 w-5/6" />
                      <Skeleton className="mt-2 h-4 w-3/4" />
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="mt-4 h-36 w-full" />
                  <Skeleton className="mt-4 h-10 w-36" />
                </CardContent>
              </Card>
            </>
          ) : ticket ? (
            <>
              <Card className="overflow-hidden border-slate-200 shadow-sm">
                <div className="border-b border-slate-200 bg-white px-5 py-4">
                  <div className="text-sm font-semibold text-slate-900">Fil de conversation</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {conversationMessages.length + 1} message{conversationMessages.length + 1 > 1 ? 's' : ''}
                  </div>
                </div>

                {(ticket.description_html || ticket.description || ticket.preview) && (
                  <MailMessage
                    authorName={ticket.from_email || 'Expéditeur'}
                    authorEmail={ticket.from_email}
                    date={ticket.created_at}
                    label="Message initial"
                    body={ticket.description || ticket.preview}
                    bodyHtml={ticket.description_html}
                  />
                )}

                {conversationMessages.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-slate-600">
                    Aucun message supplémentaire pour ce ticket.
                  </div>
                ) : (
                  conversationMessages.map((message: OwnerTicketConversation) => (
                    <MailMessage
                      key={message.id}
                      authorName={message.author_name || 'Support'}
                      authorEmail={message.author_email}
                      date={message.created_at}
                      label={getDirectionLabel(message.direction)}
                      body={message.body}
                      bodyHtml={message.body_html}
                      isPrivate={message.is_private}
                      tone={getMessageTone(message.direction)}
                    />
                  ))
                )}
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="mb-4">
                    <h2 className="text-base font-semibold text-slate-900">Répondre</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Écris ta réponse comme un mail. Elle sera envoyée au support sur ce ticket.
                    </p>
                  </div>

                  <form onSubmit={handleReplySubmit} className="space-y-4">
                    <Textarea
                      value={replyBody}
                      onChange={(event) => setReplyBody(event.target.value)}
                      placeholder="Écrivez votre réponse..."
                      className="min-h-[180px] resize-y"
                    />

                    <div className="flex justify-end">
                      <Button type="submit" disabled={sendingReply || replyBody.trim().length === 0}>
                        {sendingReply ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Envoi...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Envoyer
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
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