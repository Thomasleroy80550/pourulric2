import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertCircle, ArrowRight, Inbox, Search } from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const TicketsPage = () => {
  const [tickets, setTickets] = useState<OwnerTicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

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

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tickets, search, statusFilter, priorityFilter]);

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Mes tickets</h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Une liste simple et claire pour retrouver rapidement vos échanges support.
          </p>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="space-y-4 border-b border-slate-200">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-lg font-semibold text-slate-900">Liste des tickets</CardTitle>
              <Badge variant="outline" className="w-fit border-slate-200 text-slate-600">
                {filteredTickets.length} ticket{filteredTickets.length > 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher par sujet, aperçu ou identifiant"
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
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
                <SelectTrigger>
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
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {error && (
              <div className="p-6 pb-0">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Chargement impossible</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}

            {loading ? (
              <div className="space-y-0">
                <div className="border-b border-slate-200 px-6 py-4">
                  <Skeleton className="h-5 w-40" />
                </div>
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="grid min-w-[960px] grid-cols-[140px_minmax(280px,1fr)_140px_140px_140px_170px_120px] border-b border-slate-100 px-6 py-4 last:border-b-0">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="ml-auto h-5 w-12" />
                  </div>
                ))}
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                <div className="rounded-full bg-slate-100 p-4 text-slate-600">
                  <Inbox className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {tickets.length === 0 ? 'Aucun ticket trouvé' : 'Aucun ticket ne correspond aux filtres'}
                  </h2>
                  <p className="max-w-md text-sm leading-6 text-slate-600">
                    {tickets.length === 0
                      ? 'Aucun échange n’est actuellement associé à votre adresse email propriétaire.'
                      : 'Essayez de modifier votre recherche ou vos filtres.'}
                  </p>
                </div>
              </div>
            ) : (
              <Table className="min-w-[1030px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-6">Ticket ID</TableHead>
                    <TableHead>Sujet</TableHead>
                    <TableHead>Priorité</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Dernière activité</TableHead>
                    <TableHead className="pr-6 text-right">Accès</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id} className="hover:bg-slate-50/70">
                      <TableCell className="px-6 font-medium text-slate-900">#{ticket.id}</TableCell>
                      <TableCell>
                        <div className="max-w-[420px] min-w-0">
                          <Link to={`/tickets/${ticket.id}`} className="block truncate font-medium text-slate-900 hover:text-slate-700">
                            {ticket.subject}
                          </Link>
                          <p className="mt-1 truncate text-sm text-slate-500">
                            {ticket.preview || 'Aucun aperçu disponible pour ce ticket.'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getPriorityClasses(ticket.priority)}>
                          {getPriorityLabel(ticket.priority)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusClasses(ticket.status)}>
                          {getStatusLabel(ticket.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">{formatDate(ticket.last_activity_at, 'dd MMM yyyy à HH:mm')}</TableCell>
                      <TableCell className="pr-6 text-right">
                        <Button asChild variant="ghost" size="sm">
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
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default TicketsPage;
