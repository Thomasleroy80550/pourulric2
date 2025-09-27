import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PlusCircle, MoreHorizontal, Trash2, Edit, AlertTriangle, Award, Shield, Crown, Building } from 'lucide-react';

import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

import { getServiceProviders, addServiceProvider, updateServiceProvider, deleteServiceProvider, ServiceProvider, ServiceProviderInsert } from '@/lib/marketplace-api';
import ServiceProviderDialog from '@/components/admin/ServiceProviderDialog';

const AdminMarketplacePage = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);

  const { data: providers, isLoading } = useQuery({
    queryKey: ['serviceProvidersAdmin'],
    queryFn: getServiceProviders,
  });

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceProvidersAdmin'] });
      setIsDialogOpen(false);
      setSelectedProvider(null);
    },
    onError: (error: Error) => {
      toast.error(`Une erreur est survenue: ${error.message}`);
    },
  };

  const addMutation = useMutation({
    mutationFn: addServiceProvider,
    ...mutationOptions,
    onSuccess: (...args) => {
      toast.success('Prestataire ajouté avec succès !');
      mutationOptions.onSuccess(...args);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: ServiceProviderInsert }) => updateServiceProvider(id, updates),
    ...mutationOptions,
    onSuccess: (...args) => {
      toast.success('Prestataire mis à jour avec succès !');
      mutationOptions.onSuccess(...args);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteServiceProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceProvidersAdmin'] });
      setIsDeleteDialogOpen(false);
      setSelectedProvider(null);
      toast.success('Prestataire supprimé avec succès !');
    },
    onError: (error: Error) => {
      toast.error(`Une erreur est survenue: ${error.message}`);
    },
  });

  const handleAddClick = () => {
    setSelectedProvider(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (provider: ServiceProvider) => {
    setSelectedProvider(provider);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (provider: ServiceProvider) => {
    setSelectedProvider(provider);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = (values: ServiceProviderInsert) => {
    if (selectedProvider) {
      updateMutation.mutate({ id: selectedProvider.id, updates: values });
    } else {
      addMutation.mutate(values);
    }
  };

  const isSubmitting = addMutation.isPending || updateMutation.isPending;

  // Fonction pour obtenir l'icône de certification
  const getCertificationIcon = (level: string) => {
    switch (level) {
      case 'premium':
        return <Star className="h-4 w-4" />;
      case 'exclusive':
        return <Crown className="h-4 w-4" />;
      default:
        return <Award className="h-4 w-4" />;
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gérer la Marketplace</h1>
          <p className="text-muted-foreground">Ajoutez, modifiez ou supprimez des prestataires de services.</p>
        </div>
        <Button onClick={handleAddClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter un prestataire
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des Prestataires</CardTitle>
          <CardDescription>
            {providers?.length ?? 0} prestataire(s) trouvé(s).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Certification</TableHead>
                <TableHead>Exclusivité</TableHead>
                <TableHead>Gérance</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : providers && providers.length > 0 ? (
                providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className="font-medium">{provider.name}</TableCell>
                    <TableCell>{provider.category}</TableCell>
                    <TableCell>
                      {provider.certification_level && (
                        <Badge variant="secondary" className="capitalize">
                          {getCertificationIcon(provider.certification_level)}
                          <span className="ml-1">{provider.certification_level}</span>
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {provider.exclusivity_type && provider.exclusivity_type !== 'none' && (
                        <Badge variant="outline" className="capitalize">
                          <Shield className="h-3 w-3 mr-1" />
                          {provider.exclusivity_type}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {provider.has_full_management && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Building className="h-3 w-3 mr-1" />
                          100%
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={provider.is_approved ? 'default' : 'secondary'}>
                        {provider.is_approved ? 'Approuvé' : 'En attente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Ouvrir le menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(provider)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteClick(provider)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Aucun prestataire trouvé.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ServiceProviderDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        provider={selectedProvider}
        isSubmitting={isSubmitting}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <AlertTriangle className="inline-block mr-2 text-destructive" />
              Êtes-vous sûr de vouloir supprimer ce prestataire ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le prestataire "{selectedProvider?.name}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedProvider && deleteMutation.mutate(selectedProvider.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminMarketplacePage;