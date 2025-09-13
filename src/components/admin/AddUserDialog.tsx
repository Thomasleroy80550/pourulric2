import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createUser, createAccountantClientRelation, updateAccountantRequestStatus, AccountantRequest, CreateUserPayload } from '@/lib/admin-api';

const newUserSchema = z.object({
  first_name: z.string().min(1, "Le prénom est requis."),
  last_name: z.string().min(1, "Le nom est requis."),
  email: z.string().email("L'email est invalide."),
  role: z.enum(['user', 'admin', 'accountant'], { required_error: "Le rôle est requis." }),
  estimated_revenue: z.coerce.number().min(0, "Le revenu estimé doit être positif.").optional(),
  estimation_details: z.string().optional(),
  pennylane_customer_id: z.coerce.number().optional(), // Nouveau champ
});

interface AddUserDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUserAdded: () => void;
  pendingApproval?: AccountantRequest | null;
  setPendingApproval: (request: AccountantRequest | null) => void;
}

const AddUserDialog: React.FC<AddUserDialogProps> = ({ isOpen, onOpenChange, onUserAdded, pendingApproval, setPendingApproval }) => {
  const form = useForm<z.infer<typeof newUserSchema>>({
    resolver: zodResolver(newUserSchema),
    defaultValues: { first_name: '', last_name: '', email: '', role: 'user', estimation_details: '', estimated_revenue: 0, pennylane_customer_id: undefined }, // Ajout de pennylane_customer_id
  });

  React.useEffect(() => {
    if (isOpen && pendingApproval) {
      const nameParts = pendingApproval.accountant_name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || pendingApproval.accountant_name;
      form.reset({
        first_name: firstName,
        last_name: lastName,
        email: pendingApproval.accountant_email,
        role: 'accountant',
        pennylane_customer_id: undefined, // S'assurer qu'il est vide pour les demandes de comptable
      });
    } else if (!isOpen) {
      form.reset({ first_name: '', last_name: '', email: '', role: 'user', estimation_details: '', estimated_revenue: 0, pennylane_customer_id: undefined }); // Réinitialisation
      setPendingApproval(null);
    }
  }, [isOpen, pendingApproval, form, setPendingApproval]);

  const handleAddUser = async (values: z.infer<typeof newUserSchema>) => {
    try {
      // Generate a secure temporary password
      const tempPassword = Math.random().toString(36).substring(2, 10); // 8-char alphanumeric

      const payload: CreateUserPayload = {
        ...values,
        password: tempPassword,
        pennylane_customer_id: values.pennylane_customer_id, // Inclure le nouveau champ
      };

      const result = await createUser(payload);
      toast.success("Client créé avec succès ! Un email avec un mot de passe temporaire a été envoyé.");

      if (pendingApproval && result?.data?.user?.id) {
        await createAccountantClientRelation(result.data.user.id, pendingApproval.user_id);
        toast.success("Lien comptable-client établi.");

        await updateAccountantRequestStatus(pendingApproval.id, 'approved');
        toast.success("Demande d'accès approuvée.");
      }

      onOpenChange(false);
      onUserAdded();
    } catch (error: any) {
      toast.error(`Erreur lors de la création : ${error.message}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un nouveau client</DialogTitle>
          <DialogDescription>Le client recevra une invitation par e-mail pour créer son mot de passe et accéder à son espace.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleAddUser)} className="space-y-4 py-4">
            <FormField control={form.control} name="first_name" render={({ field }) => (<FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="last_name" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Rôle</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="user">Utilisateur</SelectItem><SelectItem value="admin">Administrateur</SelectItem><SelectItem value="accountant">Comptable</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="estimated_revenue" render={({ field }) => (<FormItem><FormLabel>Revenu Annuel Estimé (€)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="estimation_details" render={({ field }) => (<FormItem><FormLabel>Détails de l'estimation</FormLabel><FormControl><Textarea {...field} /></FormControl><FormDescription>Ces détails seront visibles par le client.</FormDescription><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="pennylane_customer_id" render={({ field }) => (<FormItem><FormLabel>ID Client Pennylane</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormDescription>L'ID client de Pennylane, si applicable.</FormDescription><FormMessage /></FormItem>)} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Inviter le client"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserDialog;