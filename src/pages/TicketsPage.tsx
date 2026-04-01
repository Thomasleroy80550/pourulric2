import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertCircle, ArrowRight, Clock3, Inbox, MessageSquare } from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

const TicketCard = ({ ticket }: { ticket: OwnerTicketSummary }) => (
  <Card className="transition-shadow hover:shadow-md">
    <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusBadgeVariant(ticket.status)}>{getStatusLabel(ticket.status)}</Badge>
          {ticket.priority && <Badge variant="outline">Priorité {getPriorityLabel(ticket.priority)}</Badge>}
          {ticket.unread_count > 0 && <Badge className="bg-blue-600 text-white hover:bg-blue-600">{ticket.unread_count} non lu{ticket.unread_count > 1 ? 's' : ''}</Badge>}
        </div>
        <CardTitle className="text-xl leading-tight">{ticket.subject}</CardTitle>
        <CardDescription>
          Ticket #{ticket.id}
          {ticket.from_email ? ` • ${ticket.from_email}` : ''}
        </CardDescription>
      </div>

      <Button asChild className="shrink-0">
        <Link to={`/tickets/${ticket.id}`}>
          Ouvrir
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </CardHeader>

    <CardContent className="space-y-4">
      <p className="text-sm leading-6 text-muted-foreground">
        {ticket.preview || 'Aucun aperçu disponible pour ce ticket.'}
      </p>

      <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <div className="font-medium text-foreground">Créé le</div>
          <div>{formatDate(ticket.created_at)}</div>
        </div>
        <div>
          <div className="font-medium text-foreground">Dernière activité</div>
          <div>{formatDate(ticket.last_activity_at)}</div>
        </div>
        <div>
          <div className="font-medium text-foreground">Source</div>
          <div>{ticket.source_provider || '—'}</div>
        </div>
        <div>
          <div className="font-medium text-foreground">État avancé</div>
          <div>
            {ticket.archived_at ? 'Archivé' : ticket.spam_at ? 'Spam' : 'Actif'}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
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

  return (
    <MainLayout>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Mes tickets</h1>
          <p className="text-muted-foreground">
            Consultez uniquement les tickets liés à votre compte propriétaire et ouvrez chaque conversation pour voir son historique complet.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Chargement impossible</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index}>
                <CardHeader>
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-7 w-2/3" />
                  <Skeleton className="h-4 w-40" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((__, metaIndex) => (
                      <Skeleton key={metaIndex} className="h-12 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <div className="rounded-full bg-muted p-4">
                <Inbox className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Aucun ticket trouvé</h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Aucun échange n’est actuellement associé à votre adresse email propriétaire.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="flex items-center gap-3 p-6">
                  <div className="rounded-full bg-blue-100 p-3 text-blue-700">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{tickets.length}</div>
                    <div className="text-sm text-muted-foreground">Ticket{tickets.length > 1 ? 's' : ''}</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-6">
                  <div className="rounded-full bg-amber-100 p-3 text-amber-700">
                    <Clock3 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{tickets.filter((ticket) => ticket.status !== 'closed').length}</div>
                    <div className="text-sm text-muted-foreground">Encore actifs</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-6">
                  <div className="rounded-full bg-emerald-100 p-3 text-emerald-700">
                    <Inbox className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{tickets.reduce((sum, ticket) => sum + ticket.unread_count, 0)}</div>
                    <div className="text-sm text-muted-foreground">Messages non lus</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {tickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default TicketsPage;
