import { useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { Link, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertCircle,
  ArrowLeft,
  Clock3,
  Mail,
  MessageSquare,
  Shield,
  Sparkles,
  Ticket,
} from 'lucide-react';
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
  if (!date) {
    return '—';
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

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

function getDirectionTone(direction: OwnerTicketConversationDirection) {
  switch (direction) {
    case 'outgoing':
      return {
        container: 'ml-auto border-sky-200 bg-sky-50/80',
        icon: 'bg-sky-100 text-sky-700',
        label: 'Réponse support',
      };
    case 'internal':
      return {
        container: 'border-amber-200 bg-amber-50/80',
        icon: 'bg-amber-100 text-amber-700',
        label: 'Note interne',
      };
    case 'incoming':
      return {
        container: 'border-slate-200 bg-white',
        icon: 'bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]',
        label: 'Message reçu',
      };
    default:
      return {
        container: 'border-slate-200 bg-slate-50/70',
        icon: 'bg-slate-100 text-slate-700',
        label: 'Message',
      };
  }
}

const ConversationItem = ({ message }: { message: OwnerTicketConversation }) => {
  const safeHtml = message.body_html ? DOMPurify.sanitize(message.body_html) : null;
  const tone = getDirectionTone(message.direction);

  return (
    <div className={`max-w-3xl rounded-[24px] border p-5 shadow-sm ${tone.container}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`rounded-2xl p-2.5 ${tone.icon}`}>
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-[hsl(var(--sidebar-foreground))]">
                {message.author_name || 'Support'}
              </p>
              <Badge variant="outline" className="border-white/60 bg-white/60 text-slate-600">
                {tone.label}
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
        </div>

        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
          {formatDate(message.created_at)}
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white/70 p-4">
        {safeHtml ? (
          <div
            className="prose prose-sm max-w-none text-foreground"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {message.body || 'Message sans contenu.'}
          </p>
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

  const conversationCount = useMemo(() => ticket?.conversations.length ?? 0, [ticket]);

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6">
        <div className="relative overflow-hidden rounded-[32px] border border-[hsl(var(--sidebar-border))] bg-gradient-to-br from-white via-[hsl(var(--sidebar-background))] to-sky-50 shadow-[0_24px_80px_rgba(37,95,133,0.10)]">
          <BrandBackdrop variant="blue" className="opacity-80" />

          <div className="relative p-5 sm:p-8 lg:p-10">
            <div className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur sm:p-7">
              <div className="flex flex-col gap-6 border-b border-sky-100 pb-8">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-3xl space-y-4">
                    <Button asChild variant="outline" className="rounded-full border-sky-200 bg-white text-[hsl(var(--sidebar-foreground))] hover:bg-sky-50 w-fit">
                      <Link to="/tickets">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Retour à mes tickets
                      </Link>
                    </Button>

                    <div className="flex flex-wrap items-center gap-3">
                      <Badge className="bg-[hsl(var(--sidebar-foreground))] text-white hover:bg-[hsl(var(--sidebar-foreground))]">
                        Détail ticket
                      </Badge>
                      {ticket && (
                        <Badge variant="outline" className={getStatusClasses(ticket.status)}>
                          {getStatusLabel(ticket.status)}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <h1 className="text-3xl font-semibold tracking-tight text-[hsl(var(--sidebar-foreground))] sm:text-4xl lg:text-5xl">
                        {loading ? 'Chargement du ticket…' : ticket?.subject || 'Ticket'}
                      </h1>
                      <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                        Une lecture plus claire du contexte, des métadonnées et de l’historique complet de conversation,
                        dans l’esprit éditorial du dashboard V2.
                      </p>
                    </div>
                  </div>

                  {ticket && (
                    <div className="rounded-[24px] border border-sky-100 bg-white p-5 shadow-sm xl:max-w-sm">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                        <Sparkles className="h-4 w-4 text-sky-600" />
                        Vue rapide
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Ticket</div>
                          <div className="mt-2 font-medium text-[hsl(var(--sidebar-foreground))]">#{ticket.id}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Messages</div>
                          <div className="mt-2 font-medium text-[hsl(var(--sidebar-foreground))]">{conversationCount}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Dernière activité</div>
                          <div className="mt-2 font-medium text-[hsl(var(--sidebar-foreground))]">{formatDate(ticket.last_activity_at)}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 space-y-6">
                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50/80">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Chargement impossible</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {loading ? (
                  <div className="space-y-6">
                    <div className="rounded-[24px] border border-sky-100 bg-white p-5 shadow-sm">
                      <Skeleton className="h-7 w-2/3" />
                      <Skeleton className="mt-3 h-4 w-40" />
                      <div className="mt-5 grid gap-3 lg:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <Skeleton key={index} className="h-16 w-full" />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} className="h-40 w-full rounded-[24px]" />
                      ))}
                    </div>
                  </div>
                ) : ticket ? (
                  <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-6">
                      <Card className="border-sky-100 bg-white/90 shadow-sm">
                        <CardContent className="p-5 sm:p-6">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={getStatusClasses(ticket.status)}>
                              {getStatusLabel(ticket.status)}
                            </Badge>
                            {ticket.priority && (
                              <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                                Priorité {getPriorityLabel(ticket.priority)}
                              </Badge>
                            )}
                            {ticket.unread_count > 0 && (
                              <Badge className="bg-[hsl(var(--sidebar-foreground))] text-white hover:bg-[hsl(var(--sidebar-foreground))]">
                                {ticket.unread_count} non lu{ticket.unread_count > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>

                          {(ticket.description_html || ticket.description || ticket.preview) && (
                            <div className="mt-5 rounded-[24px] border border-sky-100 bg-sky-50/50 p-5">
                              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
                                <Ticket className="h-4 w-4 text-sky-600" />
                                Résumé du ticket
                              </div>
                              {ticket.description_html ? (
                                <div
                                  className="prose prose-sm max-w-none text-foreground"
                                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ticket.description_html) }}
                                />
                              ) : (
                                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                  {ticket.description || ticket.preview}
                                </p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="border-sky-100 bg-white/90 shadow-sm">
                        <CardContent className="p-5 sm:p-6">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-[hsl(var(--sidebar-foreground))]" />
                            <div>
                              <h2 className="text-2xl font-semibold text-[hsl(var(--sidebar-foreground))]">Historique des conversations</h2>
                              <p className="text-sm text-slate-600">
                                {conversationCount > 0
                                  ? `${conversationCount} message${conversationCount > 1 ? 's' : ''}`
                                  : 'Aucun historique disponible pour ce ticket.'}
                              </p>
                            </div>
                          </div>

                          <div className="mt-6 space-y-4">
                            {conversationCount === 0 ? (
                              <div className="rounded-[24px] border border-dashed border-sky-200 bg-sky-50/50 p-8 text-center text-sm text-slate-600">
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
                    </div>

                    <div className="space-y-6">
                      <Card className="border-sky-100 bg-white/90 shadow-sm">
                        <CardContent className="p-5 sm:p-6">
                          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Métadonnées</p>
                          <h2 className="mt-2 text-2xl font-semibold text-[hsl(var(--sidebar-foreground))]">
                            Informations du ticket
                          </h2>

                          <div className="mt-6 space-y-3">
                            {[
                              { label: 'Créé le', value: formatDate(ticket.created_at) },
                              { label: 'Dernière activité', value: formatDate(ticket.last_activity_at) },
                              { label: 'Email source', value: ticket.from_email || '—' },
                              { label: 'Source', value: ticket.source_provider || '—' },
                              { label: 'ID email source', value: ticket.source_email_id || '—' },
                              { label: 'État avancé', value: ticket.archived_at ? 'Archivé' : ticket.spam_at ? 'Spam' : 'Actif' },
                            ].map((item) => (
                              <div key={item.label} className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
                                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
                                <div className="mt-2 text-sm font-medium break-all text-[hsl(var(--sidebar-foreground))]">{item.value}</div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-sky-100 bg-white/90 shadow-sm">
                        <CardContent className="p-5 sm:p-6">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                            <Clock3 className="h-4 w-4 text-sky-600" />
                            Dernier repère
                          </div>
                          <p className="mt-3 text-lg font-semibold text-[hsl(var(--sidebar-foreground))]">
                            Mise à jour du ticket le {formatDate(ticket.last_activity_at)}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            Cette vue rassemble uniquement l’historique lié à votre compte propriétaire connecté.
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
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
