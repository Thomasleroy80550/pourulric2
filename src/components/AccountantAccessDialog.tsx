import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createAccountantRequest } from '@/lib/accountant-api';
import { Loader2 } from 'lucide-react';

interface AccountantAccessDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const formSchema = z.object({
  accountant_name: z.string().min(2, "Le nom est requis."),
  accountant_email: z.string().email("L'adresse email est invalide."),
});

const AccountantAccessDialog: React.FC<AccountantAccessDialogProps> = ({ isOpen, onOpenChange }) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { accountant_name: '', accountant_email: '' },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await createAccountantRequest(values);
      toast.success("Demande envoyée !", {
        description: "Nous avons bien reçu votre demande d'accès pour votre comptable. Nous vous recontacterons bientôt.",
      });
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error("Erreur", { description: error.message });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demander un accès pour votre comptable</DialogTitle>
          <DialogDescription>
            Remplissez les informations ci-dessous. Un compte avec un accès restreint sera créé pour votre comptable.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="accountant_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom complet du comptable</FormLabel>
                  <FormControl><Input {...field} placeholder="Jean Dupont" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accountant_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email du comptable</FormLabel>
                  <FormControl><Input type="email" {...field} placeholder="comptable@exemple.com" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Envoyer la demande"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AccountantAccessDialog;