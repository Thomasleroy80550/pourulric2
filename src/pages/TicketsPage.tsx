import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTickets, FreshdeskTicket } from '@/lib/tickets-api';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, Ticket, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateTicketDialog } from '@/components/CreateTicketDialog';
import { useNavigate } from 'react-router-dom';
import { safeFormat } from '@/lib/date-utils';

const getStatusVariant = (status: number): 'success' | 'warning' | 'default' | 'secondary' => {
  switch (status) {
    case 2: return 'default'; // Open
    case 3: return 'warning'; // Pending
    case 4: return 'success'; // Resolved
    case 5: return 'secondary'; // Closed
    default: return 'secondary';
  }
};

const getStatusText = (status: number): string => {
  switch (status) {
    case 2: return 'Ouvert';
    case 3: return 'En attente';
    case 4: return 'Résolu';
    case 5: return 'Fermé';
    default: return 'Inconnu';
  }
};

const getPriorityVariant = (priority: number): 'default' | 'destructive' | 'secondary' => {
  switch (priority) {
    case 1: return 'default'; // Low
    case 2: return 'secondary'; // Medium
    case 3: return 'destructive'; // High
    case 4: return 'destructive'; // Urgent
    default: return 'default';
  }
};

const getPriorityText = (priority: number): string => {
  switch (priority) {
    case 1: return 'Faible';
    case 2: return 'Moyenne';
    case 3: return 'Haute';
    case 4: return 'Urgente';
    default: return 'Normale';
  }
};

const TicketsPage = () => {
  const [isCreateDialogOpen, setCreateDialogOpen] = React.useState(false);
  const navigate = useNavigate();
  const { data: tickets, isLoading, error, isError } = useQuery<FreshdeskTicket[], Error>({
    queryKey: ['tickets'],
    queryFn: getTickets,
  });

  React.useEffect(() => {
    if (error) {
      console.error('Erreur dans TicketsPage:', error);
      console.error('Stack trace:', error.stack);
    }
  }, [error]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sujet</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Priorité</TableHead>
              <TableHead>Dernière mise à jour</TableHead>
              <TableHead>Créé le</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    if (isError) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            Impossible de charger vos tickets. L'erreur suivante s'est produite : {error.message}
            <br />
            <br />
            <details>
              <summary>Détails techniques</summary>
              <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(error, null, 2)}</pre>
            </details>
          </AlertDescription>
        </Alert>
      );
    }

    if (!tickets || tickets.length === 0) {
      return (
        <div className="text-center py-16">
          <Ticket className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Aucun ticket trouvé</h3>
          <p className="mt-1 text-sm text-gray-500">Vous n'avez aucun ticket de support pour le moment.</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sujet</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Priorité</TableHead>
            <TableHead>Dernière mise à jour</TableHead>
            <TableHead>Créé le</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow 
              key={ticket.id} 
              onClick={() => navigate(`/tickets/${ticket.id}`)}
              className="cursor-pointer hover:bg-muted/50"
            >
              <TableCell className="font-medium">{ticket.subject}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(ticket.status)}>
                  {getStatusText(ticket.status)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={getPriorityVariant(ticket.priority)}>
                  {getPriorityText(ticket.priority)}
                </Badge>
              </TableCell>
              <TableCell>{safeFormat(ticket.updated_at, 'dd/MM/yyyy HH:mm')}</TableCell>
              <TableCell>{safeFormat(ticket.created_at, 'dd/MM/yyyy HH:mm')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <MainLayout>
      <CreateTicketDialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen} />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Mes tickets de support</CardTitle>
            <CardDescription>
              Voici la liste de vos demandes de support auprès de notre équipe.
            </CardDescription>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouveau ticket
          </Button>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default TicketsPage;