import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addFurniture } from '@/lib/furniture-api';
import { toast } from 'sonner';
import { PlusCircle } from 'lucide-react';

const furnitureSchema = z.object({
  name: z.string().min(1, "Le nom est requis."),
  price: z.coerce.number().optional(),
  invoice: z.instanceof(FileList).optional(),
});

interface AddFurnitureDialogProps {
  userRoomId: string;
}

export function AddFurnitureDialog({ userRoomId }: AddFurnitureDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof furnitureSchema>>({
    resolver: zodResolver(furnitureSchema),
    defaultValues: {
      name: '',
      price: undefined,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof furnitureSchema>) => {
      const invoiceFile = values.invoice?.[0];
      return addFurniture(userRoomId, values.name, values.price, invoiceFile);
    },
    onSuccess: () => {
      toast.success("Meuble ajouté avec succès !");
      queryClient.invalidateQueries({ queryKey: ['furniture', userRoomId] });
      setIsOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });

  const onSubmit = (values: z.infer<typeof furnitureSchema>) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter un meuble
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter un meuble</DialogTitle>
          <DialogDescription>
            Renseignez les informations du nouveau meuble et sa facture si disponible.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du meuble</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Canapé-lit" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prix (€)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="Ex: 499.99" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="invoice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facture (PDF, JPG, PNG)</FormLabel>
                  <FormControl>
                    <Input type="file" {...form.register('invoice')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Ajout en cours...' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}