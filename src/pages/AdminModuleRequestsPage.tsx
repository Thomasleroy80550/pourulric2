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
import { Eye, User as UserIcon, Calendar as CalendarIcon, Clock as ClockIcon, Hash as HashIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from 'react-router-dom';

const AdminModuleRequestsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const moduleParam = params.get('module');
  const initialFilter: 'all' | 'powersense' | 'thermobnb' =
    moduleParam === 'electricity' ? 'powersense' :
    moduleParam === 'thermobnb' ? 'thermobnb' : 'all';
  const [filter, setFilter] = React.useState<'all' | 'powersense' | 'thermobnb'>(initialFilter);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selectedRequest, setSelectedRequest] = React.useState<ModuleActivationRequest | null>(null);

  const openDetails = (request: ModuleActivationRequest) => {
    setSelectedRequest(request);
    setDetailOpen(true);
  };
  const closeDetails = () => {
    setDetailOpen(false);
    setSelectedRequest(null);
  };

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

  const filteredRequests = React.useMemo(() => {
    if (!requests) return [];
    if (filter === 'powersense') return requests.filter(r => r.module_name === 'electricity');
    if (filter === 'thermobnb') return requests.filter(r => r.module_name === 'thermobnb');
    return requests;
  }, [requests, filter]);

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
                <AlertDescription>{(error as any).message}</AlertDescription>
              </Alert>
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }

    if (!filteredRequests || filteredRequests.length === 0) {
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
        {filteredRequests.map((request) => (
          <TableRow key={request.id}>
            <TableCell>
              {request.profiles ? `${request.profiles.first_name} ${request.profiles.last_name}` : 'Utilisateur inconnu'}
            </TableCell>
            <TableCell>{request.module_name === 'electricity' ? 'PowerSense' : request.module_name}</TableCell>
            <TableCell>{format(new Date(request.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</TableCell>
            <TableCell>
              <Badge variant={getStatusBadgeVariant(request.status)}>{request.status}</Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openDetails(request)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Voir
                </Button>
                {request.status === 'pending' && (
                  <>
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
                  </>
                )}
              </div>
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
        <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'powersense' | 'thermobnb')}>
          <TabsList>
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value="powersense">PowerSense</TabsTrigger>
            <TabsTrigger value="thermobnb">ThermoBnB</TabsTrigger>
          </TabsList>
        </Tabs>
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

      {/* Dialog de détail */}
      <Dialog open={detailOpen} onOpenChange={(o) => (o ? setDetailOpen(true) : closeDetails())}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Détail de la demande</DialogTitle>
            <DialogDescription>Consultez les informations de la demande d'activation.</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="font-medium">
                      {selectedRequest.profiles
                        ? `${selectedRequest.profiles.first_name} ${selectedRequest.profiles.last_name}`.trim()
                        : "Utilisateur inconnu"}
                    </div>
                    <div className="text-muted-foreground">
                      {selectedRequest.profiles?.email ?? "—"}
                    </div>
                    <div className="text-muted-foreground">
                      {selectedRequest.profiles?.phone_number ?? "—"}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <HashIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground">ID de la demande</div>
                    <div className="font-mono text-sm break-all">{selectedRequest.id}</div>
                    <div className="text-xs text-muted-foreground mt-2">ID utilisateur</div>
                    <div className="font-mono text-sm break-all">{selectedRequest.user_id}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground">Module</div>
                    <div className="font-medium">
                      {selectedRequest.module_name === 'electricity' ? 'PowerSense' : selectedRequest.module_name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">Statut</div>
                    <div>
                      <Badge variant={getStatusBadgeVariant(selectedRequest.status)}>{selectedRequest.status}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <ClockIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground">Créée le</div>
                    <div className="text-sm">
                      {format(new Date(selectedRequest.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">Mise à jour le</div>
                    <div className="text-sm">
                      {selectedRequest.updated_at
                        ? format(new Date(selectedRequest.updated_at), 'dd/MM/yyyy HH:mm', { locale: fr })
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>
              {selectedRequest.status === 'pending' && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedRequest.id, 'approved')}
                    disabled={updateStatusMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approuver
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleUpdateStatus(selectedRequest.id, 'rejected')}
                    disabled={updateStatusMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Rejeter
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDetails}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminModuleRequestsPage;