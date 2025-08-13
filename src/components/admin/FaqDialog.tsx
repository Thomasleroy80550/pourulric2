import React, { useEffect } from 'react';
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
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Faq } from '@/lib/faq-api';

const faqSchema = z.object({
  question: z.string().min(1, { message: 'La question est requise.' }),
  answer: z.string().min(1, { message: 'La réponse est requise.' }),
});

type FaqFormValues = z.infer<typeof faqSchema>;

interface FaqDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: FaqFormValues) => void;
  defaultValues?: Faq;
  isLoading: boolean;
}

const FaqDialog: React.FC<FaqDialogProps> = ({ isOpen, onClose, onSubmit, defaultValues, isLoading }) => {
  const form = useForm<FaqFormValues>({
    resolver: zodResolver(faqSchema),
    defaultValues: {
      question: '',
      answer: '',
    },
  });

  useEffect(() => {
    if (defaultValues) {
      form.reset({
        question: defaultValues.question,
        answer: defaultValues.answer,
      });
    } else {
      form.reset({
        question: '',
        answer: '',
      });
    }
  }, [defaultValues, form]);

  const handleFormSubmit = (values: FaqFormValues) => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{defaultValues ? 'Modifier la FAQ' : 'Ajouter une FAQ'}</DialogTitle>
          <DialogDescription>
            {defaultValues ? 'Modifiez les détails de la question et de la réponse.' : 'Rédigez une nouvelle question et sa réponse.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Comment fonctionne la tarification ?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="answer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Réponse</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Expliquez la réponse en détail ici."
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default FaqDialog;