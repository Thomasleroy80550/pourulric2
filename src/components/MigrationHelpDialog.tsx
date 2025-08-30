"use client";

import React, { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { sendEmail } from '@/lib/notifications-api'; // Assuming this function exists

const formSchema = z.object({
  email: z.string().email({ message: "Veuillez entrer une adresse email valide." }),
  name: z.string().optional(),
  message: z.string().min(10, { message: "Veuillez décrire votre problème en au moins 10 caractères." }),
});

type MigrationHelpFormValues = z.infer<typeof formSchema>;

interface MigrationHelpDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const MigrationHelpDialog: React.FC<MigrationHelpDialogProps> = ({ isOpen, onOpenChange }) => {
  const [loading, setLoading] = useState(false);

  const form = useForm<MigrationHelpFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      name: '',
      message: '',
    },
  });

  const onSubmit = async (values: MigrationHelpFormValues) => {
    setLoading(true);
    try {
      const subject = `Demande d'aide migration de ${values.email}`;
      const htmlContent = `
        <p><strong>Email:</strong> ${values.email}</p>
        <p><strong>Nom (optionnel):</strong> ${values.name || 'Non fourni'}</p>
        <p><strong>Message:</strong></p>
        <p>${values.message}</p>
      `;

      await sendEmail('contact@hellokeys.fr', subject, htmlContent);
      toast.success("Votre demande d'aide a été envoyée avec succès !");
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error sending migration help request:", error);
      toast.error(`Échec de l'envoi de la demande : ${error.message || 'Une erreur est survenue.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Besoin d'aide pour la migration ?</DialogTitle>
          <DialogDescription>
            Décrivez votre problème de connexion ou de migration. Nous vous contacterons dans les plus brefs délais.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Votre Email</FormLabel>
                  <FormControl>
                    <Input placeholder="votre.email@example.com" {...field} disabled={loading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Votre Nom (optionnel)</FormLabel>
                  <FormControl>
                    <Input placeholder="Votre nom" {...field} disabled={loading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Décrivez votre problème</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Je n'arrive pas à me connecter avec mon ancien compte..."
                      rows={5}
                      {...field}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Envoyer la demande
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default MigrationHelpDialog;