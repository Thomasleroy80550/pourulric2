import React from 'react';
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
import { updateProfile } from '@/lib/profile-api';
import { toast } from 'sonner';

interface ObjectiveDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentObjectiveAmount: number; // Maintenant un montant en Euros
  onObjectiveUpdated: () => void; // Callback to refresh data in parent
}

const formSchema = z.object({
  objectiveAmount: z.coerce.number()
    .min(0, { message: "L'objectif ne peut pas être inférieur à 0€." })
    .transform(val => parseFloat(val.toFixed(2))), // Ensure it's a number and format to 2 decimal places
});

const ObjectiveDialog: React.FC<ObjectiveDialogProps> = ({
  isOpen,
  onOpenChange,
  currentObjectiveAmount,
  onObjectiveUpdated,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      objectiveAmount: currentObjectiveAmount,
    },
  });

  React.useEffect(() => {
    // Reset form with current objective amount when dialog opens or currentObjectiveAmount changes
    if (isOpen) {
      form.reset({ objectiveAmount: currentObjectiveAmount });
    }
  }, [isOpen, currentObjectiveAmount, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await updateProfile({ objective_amount: values.objectiveAmount });
      toast.success("Objectif mis à jour avec succès !");
      onObjectiveUpdated(); // Trigger refresh in parent
      onOpenChange(false); // Close dialog
    } catch (error: any) {
      toast.error(`Erreur lors de la mise à jour de l'objectif : ${error.message}`);
      console.error("Error updating objective:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifier mon objectif</DialogTitle>
          <DialogDescription>
            Définissez votre objectif de performance annuel en Euros.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="objectiveAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objectif (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 15000"
                      {...field}
                      onChange={(e) => {
                        // Allow empty string for a moment to clear input, but convert to number for validation
                        const value = e.target.value === '' ? '' : Number(e.target.value);
                        field.onChange(value);
                      }}
                    />
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
                {form.formState.isSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ObjectiveDialog;