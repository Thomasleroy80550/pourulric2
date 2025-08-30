import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllModuleActivationRequests, updateModuleActivationRequestStatus, ModuleActivationRequest } from '@/lib/module-activation-api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Check, X } from 'lucide-react';

const AdminModuleRequestsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: requests, isLoading, error } = useQuery<ModuleActivationRequest[]>({
    queryKey: ['moduleActivationRequests'],
    queryFn: getAllModuleActivationRequests,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ requestId, status }: { requestId: string, status: 'approved' | 'rejected' }) => 
      updateModuleActivationRequestStatus(requestId, status),
    onSuccess: () => {
      toast.success("Statut de la demande mis à jour.");
      queryClient.invalidateQueries({ queryKey: ['moduleActivationRequests'] });
    },
    onError: (err: any) => {
      toast.error("Erreur lors de la mise à jour", { description: err.message });
    },
  });

  const handleUpdateStatus = (requestId: string, status: 'approved' | 'rejected') => {
    updateStatusMutation.mutate({ requestId, status });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'pending':
      default:
        return 'secondary';
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell className="flex gap-2"><Skeleton className="h-8 w-20" /><Skeleton className="h-8 w-20" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      );
    }

    if (error) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={5}>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }

    if (!requests || requests.length === 0) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={5} className="text-center">
              Aucune demande d'activation de module pour le moment.
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }

    return (
      <TableBody>
        {requests.map((request) => (
          <TableRow key={request.id}>
            <TableCell>
              {request.profiles ? `${request.profiles.first_name} ${request.profiles.last_name}` : 'Utilisateur inconnu'}
            </TableCell>
            <TableCell>{request.module_name}</TableCell>
            <TableCell>{format(new Date(request.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</TableCell>
            <TableCell>
              <Badge variant={getStatusBadgeVariant(request.status)}>{request.status}</Badge>
            </TableCell>
            <TableCell>
              {request.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(request.id, 'approved')}
                    disabled={updateStatusMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approuver
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleUpdateStatus(request.id, 'rejected')}
                    disabled={updateStatusMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Rejeter
                  </Button>
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Demandes d'Activation de Modules</h1>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Date de la demande</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            {renderContent()}
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminModuleRequestsPage;