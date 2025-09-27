import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTickets, FreshdeskTicket } from '@/lib/tickets-api';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, MessageSquare, Plus, RefreshCw } from 'lucide-react';
import DOMPurify from 'dompurify';
import { safeFormat } from '@/lib/date-utils';
import { CreateTicketDialog } from '@/components/CreateTicketDialog';
import { useNavigate } from 'react-router-dom';

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
    case 3: return 'secondary'; // High
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
    default: return 'Inconnue';
  }
};

const TicketsPage = () => {
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: tickets, isLoading, error, isError, refetch } = useQuery<FreshdeskTicket[], Error>({
    queryKey: ['tickets'],
    queryFn: getTickets,
  });

  const handleTicketClick = (ticketId: number) => {
    navigate(`/tickets/${ticketId}`);
  };

  const handleTicketCreated = () => {
    refetch();
  };

  const cleanHtml = (html: string) => {
    if (!html) return '';
    return DOMPurify.sanitize(html, { ALLOWED_TAGS: ['br', 'p'] });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-1/4" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (isError) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Support</h1>
            <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau ticket
            </Button>
          </div>
          
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>
              Impossible de charger vos tickets. L'erreur suivante s'est produite : {error.message}
            </AlertDescription>
          </Alert>
          
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted-foreground">Détails techniques</summary>
            <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-auto">
              {JSON.stringify(error, null, 2)}
            </pre>
          </details>
          
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>
        </div>
        
        <CreateTicketDialog 
          isOpen={isCreateDialogOpen} 
          onClose={() => setIsCreateDialogOpen(false)}
          onTicketCreated={handleTicketCreated}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Support</h1>
          <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau ticket
          </Button>
        </div>

        {tickets && tickets.length > 0 ? (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Card 
                key={ticket.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleTicketClick(ticket.id)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant={getStatusVariant(ticket.status)}>
                        {getStatusText(ticket.status)}
                      </Badge>
                      <Badge variant={getPriorityVariant(ticket.priority)}>
                        {getPriorityText(ticket.priority)}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Créé le {safeFormat(ticket.created_at, 'dd/MM/yyyy à HH:mm')}
                  </div>
                </CardHeader>
                <CardContent>
                  <div 
                    className="text-sm text-muted-foreground line-clamp-3"
                    dangerouslySetInnerHTML={{ __html: cleanHtml(ticket.description_text || ticket.description || 'Aucune description') }}
                  />
                  <div className="flex items-center mt-4 text-sm text-muted-foreground">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>Cliquez pour voir la conversation</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun ticket</h3>
              <p className="text-muted-foreground mb-4">
                Vous n'avez pas encore de tickets de support.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Créer un ticket
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      
      <CreateTicketDialog 
        isOpen={isCreateDialogOpen} 
        onClose={() => setIsCreateDialogOpen(false)}
        onTicketCreated={handleTicketCreated}
      />
    </MainLayout>
  );
};

export default TicketsPage;