import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllIdeas, updateIdeaStatus, deleteIdea, AdminIdea } from '@/lib/admin-api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

const AdminIdeasPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: ideas, isLoading, isError, error } = useQuery<AdminIdea[]>({
    queryKey: ['allIdeas'],
    queryFn: getAllIdeas,
  });

  const statusUpdateMutation = useMutation({
    mutationFn: ({ ideaId, status }: { ideaId: string, status: string }) => updateIdeaStatus(ideaId, status),
    onSuccess: () => {
      toast.success("Statut de l'idée mis à jour.");
      queryClient.invalidateQueries({ queryKey: ['allIdeas'] });
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la mise à jour", { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (ideaId: string) => deleteIdea(ideaId),
    onSuccess: () => {
      toast.success("Idée supprimée avec succès.");
      queryClient.invalidateQueries({ queryKey: ['allIdeas'] });
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la suppression", { description: error.message });
    },
  });

  const handleStatusChange = (ideaId: string, status: string) => {
    statusUpdateMutation.mutate({ ideaId, status });
  };
  
  const ideaStatuses = ['new', 'under_review', 'planned', 'in_progress', 'completed', 'rejected'];

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      new: 'Nouveau',
      under_review: 'En cours d\'examen',
      planned: 'Planifié',
      in_progress: 'En cours',
      completed: 'Terminé',
      rejected: 'Rejeté',
    };
    return labels[status] || status;
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Gestion des Idées</h1>
        
        {isError && <p className="text-red-500">Erreur lors du chargement des idées: { (error as Error).message }</p>}
        
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-9 w-40" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : ideas?.map((idea) => (
                <TableRow key={idea.id}>
                  <TableCell className="font-medium">{idea.title}</TableCell>
                  <TableCell>{idea.profiles ? `${idea.profiles.first_name} ${idea.profiles.last_name}` : 'Utilisateur inconnu'}</TableCell>
                  <TableCell>{format(new Date(idea.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                  <TableCell>
                    <Select
                      value={idea.status}
                      onValueChange={(newStatus) => handleStatusChange(idea.id, newStatus)}
                      disabled={statusUpdateMutation.isPending}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Changer le statut" />
                      </SelectTrigger>
                      <SelectContent>
                        {ideaStatuses.map(status => (
                          <SelectItem key={status} value={status}>
                            {getStatusLabel(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <AlertDialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Ouvrir le menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Voir les détails</DropdownMenuItem>
                            </DialogTrigger>
                            <DropdownMenuSeparator />
                            <AlertDialogTrigger asChild>
                               <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/50">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible et supprimera définitivement l'idée.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(idea.id)} className="bg-red-600 hover:bg-red-700">
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{idea.title}</DialogTitle>
                          <DialogDescription>
                            Soumis par {idea.profiles ? `${idea.profiles.first_name} ${idea.profiles.last_name}` : 'Utilisateur inconnu'} le {format(new Date(idea.created_at), 'dd MMMM yyyy', { locale: fr })}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <p>{idea.description}</p>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminIdeasPage;