import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFaqsForAdmin, createFaq, updateFaq, deleteFaq, Faq } from '@/lib/faq-api';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Edit, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import FaqDialog from '@/components/admin/FaqDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const AdminFaqPage = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFaq, setSelectedFaq] = useState<Faq | undefined>(undefined);

  const { data: faqs, isLoading, isError, error } = useQuery({
    queryKey: ['adminFaqs'],
    queryFn: getFaqsForAdmin,
  });

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFaqs'] });
      queryClient.invalidateQueries({ queryKey: ['publishedFaqs'] });
      setIsDialogOpen(false);
      setIsDeleteDialogOpen(false);
      setSelectedFaq(undefined);
    },
    onError: (error: Error) => {
      toast.error(`Une erreur est survenue: ${error.message}`);
    },
  };

  const createMutation = useMutation({
    mutationFn: createFaq,
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      toast.success('FAQ créée avec succès.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (variables: { id: string; data: Partial<Faq> }) => updateFaq(variables.id, variables.data),
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      toast.success('FAQ mise à jour avec succès.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFaq,
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      toast.success('FAQ supprimée avec succès.');
    },
  });

  const handleAddClick = () => {
    setSelectedFaq(undefined);
    setIsDialogOpen(true);
  };

  const handleEditClick = (faq: Faq) => {
    setSelectedFaq(faq);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (faq: Faq) => {
    setSelectedFaq(faq);
    setIsDeleteDialogOpen(true);
  };

  const handleDialogSubmit = (values: { question: string; answer: string }) => {
    if (selectedFaq) {
      updateMutation.mutate({ id: selectedFaq.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleTogglePublish = (faq: Faq) => {
    updateMutation.mutate({ id: faq.id, data: { is_published: !faq.is_published } });
  };

  const confirmDelete = () => {
    if (selectedFaq) {
      deleteMutation.mutate(selectedFaq.id);
    }
  };

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <AdminLayout>
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Gérer la FAQ</h1>
          <Button onClick={handleAddClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Ajouter une FAQ
          </Button>
        </div>

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}

        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>
              Impossible de charger les FAQs.
              <p className="text-sm text-muted-foreground mt-2">{(error as Error).message}</p>
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !isError && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Question</TableHead>
                  <TableHead>Publiée</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faqs && faqs.length > 0 ? (
                  faqs.map((faq) => (
                    <TableRow key={faq.id}>
                      <TableCell className="font-medium">{faq.question}</TableCell>
                      <TableCell>
                        <Switch
                          checked={faq.is_published}
                          onCheckedChange={() => handleTogglePublish(faq)}
                          disabled={updateMutation.isPending}
                        />
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleEditClick(faq)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteClick(faq)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      Aucune FAQ trouvée.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <FaqDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleDialogSubmit}
        defaultValues={selectedFaq}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La FAQ sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminFaqPage;