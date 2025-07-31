import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFurnitureForRoom, deleteFurniture } from '@/lib/furniture-api';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, FileText } from 'lucide-react';
import { AddFurnitureDialog } from '@/components/AddFurnitureDialog';
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
} from "@/components/ui/alert-dialog"

interface RoomFurnitureListProps {
  userRoomId: string;
}

export function RoomFurnitureList({ userRoomId }: RoomFurnitureListProps) {
  const queryClient = useQueryClient();
  const { data: furniture, isLoading } = useQuery({
    queryKey: ['furniture', userRoomId],
    queryFn: () => getFurnitureForRoom(userRoomId),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFurniture,
    onSuccess: () => {
      toast.success("Meuble supprimé.");
      queryClient.invalidateQueries({ queryKey: ['furniture', userRoomId] });
    },
    onError: (error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventaire du mobilier</CardTitle>
        <CardDescription>Liste de tous les meubles et équipements de ce logement.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <AddFurnitureDialog userRoomId={userRoomId} />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Facture</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {furniture && furniture.length > 0 ? (
              furniture.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.price ? `${item.price.toFixed(2)} €` : '-'}</TableCell>
                  <TableCell>
                    {item.invoice_url ? (
                      <a href={item.invoice_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm"><FileText className="mr-2 h-4 w-4" /> Voir</Button>
                      </a>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={deleteMutation.isPending}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible et supprimera définitivement le meuble.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(item.id)}>
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center">Aucun meuble ajouté pour le moment.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};