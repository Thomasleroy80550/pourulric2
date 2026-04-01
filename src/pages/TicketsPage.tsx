import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertCircle,
  ArrowRight,
  Clock3,
  Inbox,
  MessageSquare,
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
import { getTickets, OwnerTicketPriority, OwnerTicketStatus, OwnerTicketSummary } from '@/lib/tickets-api';

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

const LoadingCard = () => (
  <div className="rounded-[24px] border border-sky-100 bg-white p-5 shadow-sm">
    <Skeleton className="h-5 w-28" />
    <Skeleton className="mt-4 h-8 w-2/3" />
    <Skeleton className="mt-3 h-4 w-40" />
    <Skeleton className="mt-6 h-16 w-full" />
    <div className="mt-5 grid gap-3 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  </div>
);

const TicketCard = ({ ticket }: { ticket: OwnerTicketSummary }) => (
  <div className="rounded-[24px] border border-sky-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0 flex-1">
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

        <div className="mt-4 space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-[hsl(var(--sidebar-foreground))]">
            {ticket.subject}
          </h2>
          <p className="text-sm text-slate-500">
            Ticket #{ticket.id}
            {ticket.from_email ? ` • ${ticket.from_email}` : ''}
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50/50 p-4 text-sm leading-6 text-slate-600">
          {ticket.preview || 'Aucun aperçu disponible pour ce ticket.'}
        </div>
      </div>

      <Button asChild className="rounded-full bg-[hsl(var(--sidebar-foreground))] text-white hover:bg-[hsl(var(--primary))] xl:mt-1">
        <Link to={`/tickets/${ticket.id}`}>
          Ouvrir
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>

    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-sky-100 bg-white p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Créé le</div>
        <div className="mt-2 text-sm font-medium text-[hsl(var(--sidebar-foreground))]">{formatDate(ticket.created_at)}</div>
      </div>
      <div className="rounded-2xl border border-sky-100 bg-white p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Dernière activité</div>
        <div className="mt-2 text-sm font-medium text-[hsl(var(--sidebar-foreground))]">{formatDate(ticket.last_activity_at)}</div>
      </div>
      <div className="rounded-2xl border border-sky-100 bg-white p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Source</div>
        <div className="mt-2 text-sm font-medium text-[hsl(var(--sidebar-foreground))]">{ticket.source_provider || '—'}</div>
      </div>
      <div className="rounded-2xl border border-sky-100 bg-white p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">État avancé</div>
        <div className="mt-2 text-sm font-medium text-[hsl(var(--sidebar-foreground))]">
          {ticket.archived_at ? 'Archivé' : ticket.spam_at ? 'Spam' : 'Actif'}
        </div>
      </div>
    </div>
  </div>
);

const TicketsPage = () => {
  const [tickets, setTickets] = useState<OwnerTicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadTickets = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getTickets();
        if (isMounted) {
          setTickets(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Impossible de charger vos tickets.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTickets();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const activeTickets = tickets.filter((ticket) => ticket.status !== 'closed').length;
    const unreadMessages = tickets.reduce((sum, ticket) => sum + ticket.unread_count, 0);
    const pendingTickets = tickets.filter((ticket) => ticket.status === 'pending').length;

    return {
      total: tickets.length,
      activeTickets,
      unreadMessages,
      pendingTickets,
    };
  }, [tickets]);

  const featuredTicket = useMemo(() => {
    return tickets.find((ticket) => ticket.unread_count > 0) ?? tickets.find((ticket) => ticket.status !== 'closed') ?? tickets[0] ?? null;
  }, [tickets]);

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
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge className="bg-[hsl(var(--sidebar-foreground))] text-white hover:bg-[hsl(var(--sidebar-foreground))]">
                        Mes tickets
                      </Badge>
                      <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                        {format(new Date(), 'dd MMMM yyyy', { locale: fr })}
                      </Badge>
                    </div>

                    <div>
                      <h1 className="text-3xl font-semibold tracking-tight text-[hsl(var(--sidebar-foreground))] sm:text-4xl lg:text-5xl">
                        Un espace support plus élégant,
                        <span className="block bg-gradient-to-r from-[hsl(var(--sidebar-foreground))] via-sky-600 to-cyan-500 bg-clip-text text-transparent">
                          inspiré du dashboard V2.
                        </span>
                      </h1>
                      <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                        Retrouvez uniquement vos échanges propriétaires, avec une lecture plus claire des priorités,
                        de l’activité récente et de l’historique de support.
                      </p>
                    </div>
                  </div>

                  {featuredTicket && (
                    <div className="rounded-[24px] border border-sky-100 bg-white p-5 shadow-sm xl:max-w-sm">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                        <Sparkles className="h-4 w-4 text-sky-600" />
                        Ticket à suivre
                      </div>
                      <h2 className="mt-3 text-xl font-semibold text-[hsl(var(--sidebar-foreground))]">
                        {featuredTicket.subject}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {featuredTicket.preview || 'Ce ticket mérite probablement votre attention.'}
                      </p>
                      <Button asChild className="mt-4 rounded-full bg-[hsl(var(--sidebar-foreground))] text-white hover:bg-[hsl(var(--primary))]">
                        <Link to={`/tickets/${featuredTicket.id}`}>
                          Voir le détail
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="rounded-[24px] border border-sky-100 bg-white p-5 shadow-sm">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="mt-3 h-10 w-20" />
                        <Skeleton className="mt-4 h-4 w-40" />
                      </div>
                    ))
                  ) : (
                    [
                      { label: 'Tickets', value: stats.total, icon: Ticket, hint: 'Tous les sujets remontés' },
                      { label: 'Encore actifs', value: stats.activeTickets, icon: MessageSquare, hint: 'Ouverts ou en attente' },
                      { label: 'Messages non lus', value: stats.unreadMessages, icon: Inbox, hint: 'Échanges à consulter' },
                      { label: 'En attente', value: stats.pendingTickets, icon: Clock3, hint: 'Côté support ou traitement' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-[24px] border border-sky-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-slate-600">{item.label}</p>
                          <div className="rounded-xl bg-[hsl(var(--sidebar-background))] p-2 text-[hsl(var(--sidebar-foreground))]">
                            <item.icon className="h-4 w-4" />
                          </div>
                        </div>
                        <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                          {item.value.toLocaleString('fr-FR')}
                        </p>
                        <p className="mt-3 text-xs text-slate-500">{item.hint}</p>
                      </div>
                    ))
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
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <LoadingCard key={index} />
                    ))}
                  </div>
                ) : tickets.length === 0 ? (
                  <Card className="border-dashed border-sky-200 bg-sky-50/40 shadow-sm">
                    <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
                      <div className="rounded-full bg-white p-4 text-[hsl(var(--sidebar-foreground))] shadow-sm">
                        <Inbox className="h-6 w-6" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-xl font-semibold text-[hsl(var(--sidebar-foreground))]">Aucun ticket trouvé</h2>
                        <p className="max-w-md text-sm leading-6 text-slate-600">
                          Aucun échange n’est actuellement associé à votre adresse email propriétaire.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">{stats.total} au total</Badge>
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">{stats.activeTickets} actifs</Badge>
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">{stats.pendingTickets} en attente</Badge>
                      <Badge variant="outline" className="border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]">
                        {stats.unreadMessages} message{stats.unreadMessages > 1 ? 's' : ''} non lu{stats.unreadMessages > 1 ? 's' : ''}
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      {tickets.map((ticket) => (
                        <TicketCard key={ticket.id} ticket={ticket} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default TicketsPage;
