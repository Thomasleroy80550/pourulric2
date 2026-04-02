import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { sendUnauthenticatedEmail } from '@/lib/unauthenticated-email-api';

const formSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères.'),
  email: z.string().email('Email invalide.'),
  subject: z.string().min(5, 'Le sujet doit contenir au moins 5 caractères.'),
  message: z.string().min(20, 'Le message doit contenir au moins 20 caractères.'),
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const IdeaSubmissionForm: React.FC = () => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const safeName = escapeHtml(values.name);
      const safeEmail = escapeHtml(values.email);
      const safeSubject = escapeHtml(values.subject);
      const safeMessage = escapeHtml(values.message).replace(/\n/g, '<br />');

      const html = `
        <h2>Nouveau ticket depuis la page Aide</h2>
        <p><strong>Nom :</strong> ${safeName}</p>
        <p><strong>Email :</strong> ${safeEmail}</p>
        <p><strong>Sujet :</strong> ${safeSubject}</p>
        <p><strong>Message :</strong><br />${safeMessage}</p>
      `;

      await sendUnauthenticatedEmail('contact@hellokeys.fr', `[Aide] ${values.subject}`, html, values.email);
    },
    onSuccess: () => {
      toast.success('Ticket envoyé avec succès !', {
        description: 'Votre message a bien été transmis à contact@hellokeys.fr.',
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de l’envoi', {
        description: error.message,
      });
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    mutation.mutate(values);
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Formulaire de contact</CardTitle>
        <CardDescription>
          Envoyez-nous votre demande et nous créerons un ticket à partir de votre message. Les réponses partiront vers l'adresse email renseignée.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input placeholder="Votre nom" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="vous@exemple.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sujet</FormLabel>
                  <FormControl>
                    <Input placeholder="Objet de votre demande" {...field} />
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
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez votre demande le plus précisément possible..."
                      className="min-h-[120px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? 'Envoi en cours...' : 'Envoyer mon message'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default IdeaSubmissionForm;