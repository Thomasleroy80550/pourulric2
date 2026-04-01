import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertCircle, ArrowRight, Clock3, Inbox, MessageSquare } from 'lucide-react';
import BrandBackdrop from '@/components/BrandBackdrop';
import MainLayout from '@/components/MainLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getTickets, OwnerTicketPriority, OwnerTicketStatus, OwnerTicketSummary } from '@/lib/tickets-api';

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

const StatCard = ({ label, value, icon: Icon }: { label: string; value: number; icon: typeof MessageSquare }) => (
  <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-slate-600">{label}</p>
      <div className="rounded-xl bg-[hsl(var(--sidebar-background))] p-2 text-[hsl(var(--sidebar-foreground))]">
        <Icon className="h-4 w-4" />
      </div>
    </div>
    <p className="mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--sidebar-foreground))]">
      {value.toLocaleString('fr-FR')}
    </p>
  </div>
);

const TicketRow = ({ ticket }: { ticket: OwnerTicketSummary }) => (
  <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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

        <h2 className="mt-3 text-xl font-semibold text-[hsl(var(--sidebar-foreground))]">
          {ticket.subject}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          {ticket.preview || 'Aucun aperçu disponible pour ce ticket.'}
        </p>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
          <span>#{ticket.id}</span>
          <span>Créé le {formatDate(ticket.created_at)}</span>
          <span>Dernière activité {formatDate(ticket.last_activity_at)}</span>
          <span>Source {ticket.source_provider || '—'}</span>
        </div>
      </div>

      <Button asChild className="rounded-full bg-[hsl(var(--sidebar-foreground))] text-white hover:bg-[hsl(var(--primary))]">
        <Link to={`/tickets/${ticket.id}`}>
          Ouvrir
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
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
        if (isMounted) setTickets(data);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Impossible de charger vos tickets.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadTickets();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const open = tickets.filter((ticket) => ticket.status === 'open').length;
    const pending = tickets.filter((ticket) => ticket.status === 'pending').length;
    const unread = tickets.reduce((sum, ticket) => sum + ticket.unread_count, 0);

    return { total: tickets.length, open, pending, unread };
  }, [tickets]);

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="relative overflow-hidden rounded-[28px] border border-[hsl(var(--sidebar-border))] bg-gradient-to-br from-white via-[hsl(var(--sidebar-background))] to-sky-50 shadow-[0_24px_80px_rgba(37,95,133,0.10)]">
          <BrandBackdrop variant="blue" className="opacity-70" />

          <div className="relative p-5 sm:p-8">
            <div className="rounded-[24px] border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur sm:p-6">
              <div className="flex flex-col gap-3 border-b border-sky-100 pb-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="bg-[hsl(var(--sidebar-foreground))] text-white hover:bg-[hsl(var(--sidebar-foreground))]">
                    Mes tickets
                  </Badge>
                  <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                    {format(new Date(), 'dd MMMM yyyy', { locale: fr })}
                  </Badge>
                </div>

                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-[hsl(var(--sidebar-foreground))]">
                    Vos échanges support
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                    Une vue plus simple, centrée sur l’essentiel : statut, sujet, activité récente et accès rapide au détail.
                  </p>
                </div>
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
                    <div className="grid gap-3 sm:grid-cols-3">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="mt-3 h-9 w-16" />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Card key={index} className="border-sky-100 bg-white shadow-sm">
                          <CardContent className="p-5">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="mt-3 h-6 w-2/3" />
                            <Skeleton className="mt-3 h-4 w-full" />
                            <Skeleton className="mt-2 h-4 w-5/6" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                ) : tickets.length === 0 ? (
                  <Card className="border-dashed border-sky-200 bg-sky-50/40 shadow-sm">
                    <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
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
                    <div className="grid gap-3 sm:grid-cols-3">
                      <StatCard label="Total" value={stats.total} icon={MessageSquare} />
                      <StatCard label="Ouverts / en attente" value={stats.open + stats.pending} icon={Clock3} />
                      <StatCard label="Messages non lus" value={stats.unread} icon={Inbox} />
                    </div>

                    <div className="space-y-3">
                      {tickets.map((ticket) => (
                        <TicketRow key={ticket.id} ticket={ticket} />
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
