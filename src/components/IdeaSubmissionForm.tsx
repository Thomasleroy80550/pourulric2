import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useMutation } from '@tanstack/react-query';
import { submitIdea, IdeaPayload } from '@/lib/ideas-api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const formSchema = z.object({
  title: z.string().min(5, 'Le titre doit contenir au moins 5 caractères.'),
  description: z.string().min(20, 'La description doit contenir au moins 20 caractères.'),
});

const IdeaSubmissionForm: React.FC = () => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: IdeaPayload) => submitIdea(data),
    onSuccess: () => {
      toast.success('Idée soumise avec succès !', {
        description: 'Merci pour votre contribution. Nous allons l\'étudier attentivement.',
      });
      form.reset();
    },
    onError: (error: any) => {
      toast.error('Erreur lors de la soumission', {
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
        <CardTitle className="text-lg font-semibold">Soumettre une idée</CardTitle>
        <CardDescription>
          Une suggestion pour améliorer la plateforme ? Partagez-la avec nous !
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre de l'idée</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Améliorer le calendrier" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description détaillée</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez votre idée le plus précisément possible..."
                      className="resize-y min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? 'Envoi en cours...' : 'Envoyer mon idée'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default IdeaSubmissionForm;