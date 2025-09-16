import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { changeUserPassword } from '@/lib/admin-api';

const passwordSchema = z.object({
  new_password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
});

interface ChangePasswordDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userId: string;
  userName: string;
}

const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({ isOpen, onOpenChange, userId, userName }) => {
  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      new_password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof passwordSchema>) => {
    try {
      await changeUserPassword(userId, values.new_password);
      toast.success(`Le mot de passe pour ${userName} a été changé avec succès.`);
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error(`Erreur lors du changement de mot de passe : ${error.message}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Changer le mot de passe</DialogTitle>
          <DialogDescription>
            Changer le mot de passe pour l'utilisateur {userName}. L'utilisateur ne sera pas notifié.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="new_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nouveau mot de passe</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
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
                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordDialog;