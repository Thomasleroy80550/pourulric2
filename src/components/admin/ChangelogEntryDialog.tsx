import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { ChangelogEntry, ChangelogEntryPayload } from '@/lib/changelog-api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ChangelogEntryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: ChangelogEntryPayload, id?: string) => Promise<void>;
  entry?: ChangelogEntry | null;
}

const formSchema = z.object({
  version: z.string().min(1, 'La version est requise.'),
  title: z.string().min(1, 'Le titre est requis.'),
  description: z.string().optional(),
  is_public: z.boolean(),
  category: z.string().min(1, 'La catégorie est requise.'),
});

const categories = ['Nouveauté', 'Amélioration', 'Correction'];

const ChangelogEntryDialog: React.FC<ChangelogEntryDialogProps> = ({ isOpen, onOpenChange, onSave, entry }) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      version: '',
      title: '',
      description: '',
      is_public: false,
      category: 'Amélioration',
    },
  });

  useEffect(() => {
    if (entry) {
      form.reset({
        version: entry.version,
        title: entry.title,
        description: entry.description || '',
        is_public: entry.is_public,
        category: entry.category || 'Amélioration',
      });
    } else {
      form.reset({
        version: '',
        title: '',
        description: '',
        is_public: false,
        category: 'Amélioration',
      });
    }
  }, [entry, form]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await onSave(values, entry?.id);
      toast.success(`Entrée de changelog ${entry ? 'mise à jour' : 'créée'} avec succès.`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erreur", { description: error.message });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entry ? 'Modifier' : 'Ajouter'} une entrée de changelog</DialogTitle>
          <DialogDescription>
            Remplissez les détails de la nouvelle fonctionnalité ou de la mise à jour.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez une catégorie" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="version"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Version</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: v1.2.0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre</FormLabel>
                  <FormControl>
                    <Input placeholder="Titre de la nouveauté" {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Décrivez la modification en détail..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_public"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Visible par les utilisateurs ?</FormLabel>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
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

export default ChangelogEntryDialog;