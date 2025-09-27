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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServiceProvider, ServiceProviderInsert } from '@/lib/marketplace-api';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Le nom est requis.' }),
  category: z.string().min(2, { message: 'La catégorie est requise.' }),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email({ message: 'Adresse email invalide.' }).optional().or(z.literal('')),
  website: z.string().url({ message: 'URL invalide.' }).optional().or(z.literal('')),
  location: z.string().optional(),
  image_url: z.string().url({ message: 'URL d\'image invalide.' }).optional().or(z.literal('')),
  is_approved: z.boolean().default(false),
  certification_level: z.enum(['standard', 'premium', 'exclusive']).optional(),
  exclusivity_type: z.enum(['none', 'regional', 'departmental', 'national']).optional(),
  has_full_management: z.boolean().default(false),
  management_area: z.string().optional(),
});

interface ServiceProviderDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (values: ServiceProviderInsert) => void;
  provider?: ServiceProvider | null;
  isSubmitting: boolean;
}

const ServiceProviderDialog: React.FC<ServiceProviderDialogProps> = ({
  isOpen,
  onOpenChange,
  onSubmit,
  provider,
  isSubmitting,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category: '',
      description: '',
      phone: '',
      email: '',
      website: '',
      location: '',
      image_url: '',
      is_approved: false,
      certification_level: 'standard',
      exclusivity_type: 'none',
      has_full_management: false,
      management_area: '',
    },
  });

  useEffect(() => {
    if (provider) {
      form.reset(provider);
    } else {
      form.reset({
        name: '',
        category: '',
        description: '',
        phone: '',
        email: '',
        website: '',
        location: '',
        image_url: '',
        is_approved: false,
        certification_level: 'standard',
        exclusivity_type: 'none',
        has_full_management: false,
        management_area: '',
      });
    }
  }, [provider, form]);

  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{provider ? 'Modifier le prestataire' : 'Ajouter un prestataire'}</DialogTitle>
          <DialogDescription>
            Remplissez les informations ci-dessous. Cliquez sur "Enregistrer" pour sauvegarder.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom du prestataire" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Plomberie, Jardinage" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Description des services" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input placeholder="0612345678" {...field} />
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
                      <Input placeholder="contact@prestataire.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site Web</FormLabel>
                    <FormControl>
                      <Input placeholder="https://prestataire.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localisation</FormLabel>
                    <FormControl>
                      <Input placeholder="Ville, Région" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL de l'image</FormLabel>
                  <FormControl>
                    <Input placeholder="https://lien/vers/image.jpg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Section Certification */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Certification & Exclusivité</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="certification_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Niveau de certification</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un niveau" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="exclusive">Exclusive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="exclusivity_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type d'exclusivité</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Aucune</SelectItem>
                          <SelectItem value="regional">Régionale</SelectItem>
                          <SelectItem value="departmental">Départementale</SelectItem>
                          <SelectItem value="national">Nationale</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="has_full_management"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-4">
                    <div className="space-y-0.5">
                      <FormLabel>Gérance complète</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Ce prestataire gère 100% du parc sur son secteur.
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              {form.watch('has_full_management') && (
                <FormField
                  control={form.control}
                  name="management_area"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Secteur de gestion</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Paris Centre, Côte d'Azur" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            <FormField
              control={form.control}
              name="is_approved"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Approuvé</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Le prestataire sera visible sur la marketplace si activé.
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceProviderDialog;