import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertCircle,
  ArrowRight,
  Clock3,
  Inbox,
  ListFilter,
  MessageSquare,
  Search,
} from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getTickets, OwnerTicketPriority, OwnerTicketStatus, OwnerTicketSummary } from '@/lib/tickets-api';

function formatDate(date: string | null, pattern = 'dd MMM yyyy') {
  if (!date) return '—';

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';

  return format(parsed, pattern, { locale: fr });
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

function getPriorityClasses(priority: OwnerTicketPriority | null) {
  switch (priority) {
    case 'low':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'medium':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'high':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-slate-200 bg-slate-100 text-slate-600';
  }
}

function getStatusClasses(status: OwnerTicketStatus) {
  switch (status) {
    case 'open':
      return 'border-sky-200 bg-sky-50 text-sky-700';
    case 'pending':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'closed':
      return 'border-slate-200 bg-slate-100 text-slate-600';
    default:
      return 'border-slate-200 bg-slate-100 text-slate-700';
  }
}

const SummaryPill = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof MessageSquare;
}) => (
  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
    <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
      <Icon className="h-4 w-4" />
    </div>
    <div>
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-900">{value.toLocaleString('fr-FR')}</div>
    </div>
  </div>
);

const TicketsPage = () => {
  const [tickets, setTickets] = useState<OwnerTicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

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
    const active = tickets.filter((ticket) => ticket.status === 'open' || ticket.status === 'pending').length;
    const unread = tickets.reduce((sum, ticket) => sum + ticket.unread_count, 0);

    return {
      total: tickets.length,
      active,
      unread,
    };
  }, [tickets]);

  const sourceOptions = useMemo(() => {
    return Array.from(new Set(tickets.map((ticket) => ticket.source_provider).filter(Boolean))) as string[];
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        ticket.id.toLowerCase().includes(normalizedSearch) ||
        ticket.subject.toLowerCase().includes(normalizedSearch) ||
        (ticket.preview || '').toLowerCase().includes(normalizedSearch);

      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || (ticket.priority || 'none') === priorityFilter;
      const matchesSource = sourceFilter === 'all' || (ticket.source_provider || 'unknown') === sourceFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesSource;
    });
  }, [tickets, search, statusFilter, priorityFilter, sourceFilter]);

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-6">
            <div className="flex flex-col gap-5 border-b border-slate-200 pb-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                    <MessageSquare className="h-4 w-4" />
                    Ticket
                  </div>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Liste des tickets</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                    Une vue tableau inspirée d’un back-office support, avec recherche et filtres rapides.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <SummaryPill label="Total" value={stats.total} icon={MessageSquare} />
                  <SummaryPill label="Actifs" value={stats.active} icon={Clock3} />
                  <SummaryPill label="Non lus" value={stats.unread} icon={Inbox} />
                </div>
              </div>

              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(180px,0.6fr))]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Rechercher un ticket"
                    className="h-11 rounded-2xl border-slate-200 bg-slate-50 pl-10 text-sm shadow-none focus-visible:ring-slate-300"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-slate-50 text-sm shadow-none">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="open">Ouvert</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="closed">Fermé</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-slate-50 text-sm shadow-none">
                    <SelectValue placeholder="Priorité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les priorités</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="low">Basse</SelectItem>
                    <SelectItem value="none">Non définie</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-slate-50 text-sm shadow-none">
                    <div className="flex items-center gap-2 truncate">
                      <ListFilter className="h-4 w-4 text-slate-400" />
                      <SelectValue placeholder="Source" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les sources</SelectItem>
                    <SelectItem value="unknown">Source inconnue</SelectItem>
                    {sourceOptions.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Chargement impossible</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {loading ? (
                <div className="overflow-hidden rounded-3xl border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                    <Skeleton className="h-5 w-56" />
                  </div>
                  <div className="space-y-0 bg-white">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <div key={index} className="grid min-w-[980px] grid-cols-[140px_minmax(280px,1fr)_140px_140px_140px_140px_140px] gap-0 border-b border-slate-100 px-6 py-4 last:border-b-0">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : filteredTickets.length === 0 ? (
                <Card className="rounded-3xl border-dashed border-slate-300 bg-slate-50 shadow-none">
                  <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <Inbox className="h-6 w-6 text-slate-700" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold text-slate-900">
                        {tickets.length === 0 ? 'Aucun ticket trouvé' : 'Aucun ticket ne correspond aux filtres'}
                      </h2>
                      <p className="max-w-md text-sm leading-6 text-slate-600">
                        {tickets.length === 0
                          ? 'Aucun échange n’est actuellement associé à votre adresse email propriétaire.'
                          : 'Modifie la recherche ou les filtres pour retrouver plus facilement un ticket.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">Tickets récents</h2>
                      <p className="text-sm text-slate-500">
                        {filteredTickets.length} ticket{filteredTickets.length > 1 ? 's' : ''} affiché{filteredTickets.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <Badge variant="outline" className="w-fit rounded-full border-slate-200 bg-white text-slate-600">
                      Dernière mise à jour {formatDate(new Date().toISOString(), 'dd MMM yyyy')}
                    </Badge>
                  </div>

                  <Table className="min-w-[1080px]">
                    <TableHeader>
                      <TableRow className="border-slate-200 bg-white hover:bg-white">
                        <TableHead className="px-6 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Ticket ID</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Sujet</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Priorité</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Statut</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Source</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Date ajoutée</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Activité</TableHead>
                        <TableHead className="pr-6 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Accès</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTickets.map((ticket) => (
                        <TableRow key={ticket.id} className="border-slate-200 hover:bg-slate-50/80">
                          <TableCell className="px-6 py-4 font-semibold text-slate-900">#{ticket.id}</TableCell>
                          <TableCell className="py-4">
                            <div className="min-w-0 max-w-[360px]">
                              <div className="flex items-center gap-2">
                                <Link
                                  to={`/tickets/${ticket.id}`}
                                  className="truncate font-medium text-slate-900 transition-colors hover:text-sky-700"
                                >
                                  {ticket.subject}
                                </Link>
                                {ticket.unread_count > 0 && (
                                  <Badge className="rounded-full bg-slate-900 text-white hover:bg-slate-900">
                                    {ticket.unread_count}
                                  </Badge>
                                )}
                              </div>
                              <p className="mt-1 truncate text-sm text-slate-500">
                                {ticket.preview || 'Aucun aperçu disponible pour ce ticket.'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline" className={`rounded-full ${getPriorityClasses(ticket.priority)}`}>
                              {getPriorityLabel(ticket.priority)}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline" className={`rounded-full ${getStatusClasses(ticket.status)}`}>
                              {getStatusLabel(ticket.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 text-slate-600">{ticket.source_provider || '—'}</TableCell>
                          <TableCell className="py-4 text-slate-600">{formatDate(ticket.created_at)}</TableCell>
                          <TableCell className="py-4 text-slate-600">{formatDate(ticket.last_activity_at, 'dd MMM yyyy, HH:mm')}</TableCell>
                          <TableCell className="py-4 pr-6 text-right">
                            <Button
                              asChild
                              variant="ghost"
                              className="rounded-full px-3 text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                            >
                              <Link to={`/tickets/${ticket.id}`}>
                                Voir
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default TicketsPage;
