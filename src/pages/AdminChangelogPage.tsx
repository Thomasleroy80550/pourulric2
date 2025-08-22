import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge, BadgeProps } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import AdminLayout from '@/components/AdminLayout';
import {
  getAllChangelog,
  createChangelogEntry,
  updateChangelogEntry,
  deleteChangelogEntry,
  ChangelogEntry,
  ChangelogEntryPayload,
} from '@/lib/changelog-api';
import ChangelogEntryDialog from '@/components/admin/ChangelogEntryDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const getCategoryBadgeVariant = (category?: string): BadgeProps['variant'] => {
  switch (category?.toLowerCase()) {
    case 'nouveauté':
      return 'default';
    case 'amélioration':
      return 'secondary';
    case 'correction':
      return 'destructive';
    default:
      return 'outline';
  }
};

const AdminChangelogPage = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ChangelogEntry | null>(null);

  const { data: entries, isLoading, error } = useQuery<ChangelogEntry[]>({
    queryKey: ['changelog'],
    queryFn: getAllChangelog,
  });

  const mutation = useMutation({
    mutationFn: async ({ data, id }: { data: ChangelogEntryPayload, id?: string }) => {
      if (id) {
        return updateChangelogEntry(id, data);
      }
      return createChangelogEntry(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changelog'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteChangelogEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changelog'] });
      toast.success("Entrée supprimée avec succès.");
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la suppression", { description: error.message });
    },
  });

  const handleSave = async (data: ChangelogEntryPayload, id?: string) => {
    await mutation.mutateAsync({ data, id });
  };

  const openDialog = (entry: ChangelogEntry | null = null) => {
    setSelectedEntry(entry);
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (entry: ChangelogEntry) => {
    setSelectedEntry(entry);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (selectedEntry) {
      deleteMutation.mutate(selectedEntry.id);
      setIsDeleteDialogOpen(false);
      setSelectedEntry(null);
    }
  };

  if (isLoading) return <AdminLayout><div>Chargement...</div></AdminLayout>;
  if (error) return <AdminLayout><div>Erreur: {error.message}</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gestion du Changelog</h1>
        <Button onClick={() => openDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une entrée
        </Button>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date de création</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries?.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">{entry.version}</TableCell>
                <TableCell>{entry.title}</TableCell>
                <TableCell>
                  <Badge variant={getCategoryBadgeVariant(entry.category)}>
                    {entry.category}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={entry.is_public ? 'default' : 'secondary'}>
                    {entry.is_public ? 'Public' : 'Privé'}
                  </Badge>
                </TableCell>
                <TableCell>{format(new Date(entry.created_at), 'd MMMM yyyy', { locale: fr })}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Ouvrir le menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openDialog(entry)}>
                        <Pencil className="mr-2 h-4 w-4" /> Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openDeleteDialog(entry)} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ChangelogEntryDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSave}
        entry={selectedEntry}
      />
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'entrée de changelog sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminChangelogPage;