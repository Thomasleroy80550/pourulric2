import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserRooms, updateUserRoom, UserRoom } from '@/lib/user-room-api';
import { getFurnitureForRoom, deleteFurniture, RoomFurniture } from '@/lib/furniture-api';
import MainLayout from '@/components/MainLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, FileText, Wifi, KeyRound } from 'lucide-react';
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

const roomDetailsSchema = z.object({
  keybox_code: z.string().optional(),
  wifi_code: z.string().optional(),
});

const RoomDetailsForm = ({ room }: { room: UserRoom }) => {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof roomDetailsSchema>>({
    resolver: zodResolver(roomDetailsSchema),
    defaultValues: {
      keybox_code: room.keybox_code || '',
      wifi_code: room.wifi_code || '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof roomDetailsSchema>) => updateUserRoom(room.id, values),
    onSuccess: () => {
      toast.success("Informations du logement mises à jour.");
      queryClient.invalidateQueries({ queryKey: ['userRooms'] });
    },
    onError: (error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <FormField
          control={form.control}
          name="keybox_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center"><KeyRound className="mr-2 h-4 w-4" /> Code de la boîte à clés</FormLabel>
              <FormControl>
                <Input placeholder="Ex: 1234#" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="wifi_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center"><Wifi className="mr-2 h-4 w-4" /> Code Wi-Fi</FormLabel>
              <FormControl>
                <Input placeholder="Ex: MySuperPassword" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Sauvegarde...' : 'Sauvegarder les informations'}
        </Button>
      </form>
    </Form>
  );
};

const FurnitureList = ({ userRoomId }: { userRoomId: string }) => {
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

const MyRoomsPage = () => {
  const { data: rooms, isLoading, error } = useQuery({
    queryKey: ['userRooms'],
    queryFn: getUserRooms,
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mes Logements</h1>
          <p className="text-muted-foreground">Gérez les informations et l'inventaire de vos propriétés.</p>
        </div>
        {isLoading && <Skeleton className="h-64 w-full" />}
        {error && <p className="text-red-500">Erreur: {error.message}</p>}
        {rooms && rooms.length > 0 && (
          <Accordion type="single" collapsible className="w-full">
            {rooms.map((room) => (
              <AccordionItem value={room.id} key={room.id}>
                <AccordionTrigger className="text-xl">{room.room_name}</AccordionTrigger>
                <AccordionContent className="space-y-6 p-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Informations d'accès</CardTitle>
                      <CardDescription>Codes d'accès pour les voyageurs.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <RoomDetailsForm room={room} />
                    </CardContent>
                  </Card>
                  <FurnitureList userRoomId={room.id} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
        {rooms && rooms.length === 0 && !isLoading && (
          <p>Aucun logement ne vous a encore été assigné.</p>
        )}
      </div>
    </MainLayout>
  );
};

export default MyRoomsPage;