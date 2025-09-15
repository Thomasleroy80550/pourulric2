import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// Interface for the data passed to the dialog
interface ReservationData {
  portail: string;
  voyageur: string;
  prixSejour: number;
  fraisMenage: number;
  taxeDeSejour: number;
}

interface EditReservationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  reservationData: ReservationData | null;
  onSave: (updatedData: ReservationData) => void;
}

const formSchema = z.object({
  voyageur: z.string().min(1, "Le nom du voyageur est requis."),
  prixSejour: z.coerce.number().min(0, "Le prix du séjour doit être positif."),
  fraisMenage: z.coerce.number().min(0, "Les frais de ménage doivent être positifs."),
  taxeDeSejour: z.coerce.number().min(0, "La taxe de séjour doit être positive."),
});

const EditReservationDialog: React.FC<EditReservationDialogProps> = ({
  isOpen,
  onOpenChange,
  reservationData,
  onSave,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      voyageur: '',
      prixSejour: 0,
      fraisMenage: 0,
      taxeDeSejour: 0,
    },
  });

  useEffect(() => {
    if (reservationData) {
      form.reset(reservationData);
    }
  }, [reservationData, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!reservationData) return;

    const updatedData: ReservationData = {
      ...reservationData,
      ...values,
    };
    onSave(updatedData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifier la Réservation</DialogTitle>
          <DialogDescription>
            Ajustez les détails de la réservation pour {reservationData?.voyageur}. Les totaux seront recalculés.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="voyageur"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Voyageur</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="prixSejour"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prix du Séjour (€)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fraisMenage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frais de Ménage (€)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="taxeDeSejour"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Taxe de Séjour (€)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  'Sauvegarder'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditReservationDialog;