import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getAllProfiles, UserProfile } from '@/lib/admin-api';
import { createTechnicalReport, getTechnicalReportById, updateTechnicalReport } from '@/lib/technical-reports-api';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Check, ChevronsUpDown, ArrowLeft, Pencil, PlusCircle, SpellCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { uploadFiles } from '@/lib/storage-api';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import RepairQuoteBuilder from '@/components/RepairQuoteBuilder';

const reportSchema = z.object({
  user_id: z.string().min(1, "Veuillez sélectionner un propriétaire."),
  property_name: z.string().min(1, "Veuillez sélectionner une propriété."),
  title: z.string().min(5, "Le titre doit contenir au moins 5 caractères."),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  category: z.string().optional(),
  media_files: z.instanceof(FileList).optional(),
});

const AdminTechnicalReportFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [existingMediaUrls, setExistingMediaUrls] = useState<string[]>([]);
  const [openUserSelect, setOpenUserSelect] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [correcting, setCorrecting] = useState(false);

  const handleCorrectSpelling = async () => {
    const text = form.getValues('description') || '';
    if (!text.trim()) {
      toast.info("La description est vide, rien à corriger.");
      return;
    }
    setCorrecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('correct-spelling', {
        body: { text },
      });
      if (error) throw new Error(error.message);
      if (!data?.corrected) throw new Error("Aucune correction reçue.");
      form.setValue('description', data.corrected, { shouldDirty: true });
      toast.success("Orthographe corrigée !");
    } catch (error: any) {
      toast.error(`Erreur lors de la correction : ${error.message}`);
    } finally {
      setCorrecting(false);
    }
  };

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: { user_id: '', property_name: '', title: '', description: '', priority: 'medium', category: '' },
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const fetchedProfiles = await getAllProfiles();
        setProfiles(fetchedProfiles);

        if (isEditMode && id) {
          const report = await getTechnicalReportById(id);
          if (!report) {
            toast.error("Rapport introuvable.");
            navigate('/admin/technical-reports');
            return;
          }
          form.reset({
            user_id: report.user_id,
            property_name: report.property_name,
            title: report.title,
            description: report.description || '',
            priority: (report.priority as 'low' | 'medium' | 'high' | 'urgent') || 'medium',
            category: report.category || '',
          });
          setExistingMediaUrls(report.media_urls || []);
        }
      } catch (error: any) {
        toast.error(`Erreur: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isEditMode]);

  const handleSubmit = async (values: z.infer<typeof reportSchema>) => {
    try {
      let uploadedMediaUrls: string[] = [];
      if (values.media_files && values.media_files.length > 0) {
        const folderPath = `technical_reports_media/${crypto.randomUUID()}`;
        uploadedMediaUrls = await uploadFiles(values.media_files, 'technical_report_media_bucket', folderPath);
      }

      if (isEditMode && id) {
        const allMediaUrls = [...existingMediaUrls, ...uploadedMediaUrls];
        await updateTechnicalReport(id, {
          property_name: values.property_name,
          title: values.title,
          description: values.description,
          priority: values.priority as any,
          category: values.category,
          media_urls: allMediaUrls.length > 0 ? allMediaUrls : null,
        });
        toast.success("Rapport corrigé avec succès !");
        navigate(`/admin/technical-reports/${id}`);
      } else {
        await createTechnicalReport({
          user_id: values.user_id,
          property_name: values.property_name,
          title: values.title,
          description: values.description || null,
          priority: values.priority as any,
          category: values.category || null,
          media_urls: uploadedMediaUrls.length > 0 ? uploadedMediaUrls : null,
        } as any);
        toast.success("Incident créé et envoyé au propriétaire !");
        navigate('/admin/technical-reports');
      }
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const handleInsertQuote = (quoteText: string) => {
    const currentDescription = form.getValues('description') || '';
    const newDescription = currentDescription
      ? `${currentDescription}\n\n${quoteText}`
      : quoteText;
    form.setValue('description', newDescription, { shouldDirty: true });
    toast.success("Devis inséré dans la description !");
  };

  if (loading) {
    return (
      <AdminLayout>
        <Skeleton className="h-10 w-64 mb-6" />
        <Skeleton className="h-96 w-full" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => navigate('/admin/technical-reports')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          {isEditMode ? (
            <><Pencil className="h-7 w-7" /> Corriger le rapport</>
          ) : (
            <><PlusCircle className="h-7 w-7" /> Créer un nouvel incident</>
          )}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Informations du rapport</CardTitle>
            <CardDescription>
              {isEditMode
                ? "Modifiez les informations de l'incident puis enregistrez la correction."
                : "Remplissez les informations de l'incident. Le propriétaire sera notifié par email."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="user_id"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Propriétaire</FormLabel>
                      <Popover open={openUserSelect} onOpenChange={setOpenUserSelect}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openUserSelect}
                              className="w-full justify-between"
                              disabled={isEditMode}
                            >
                              {field.value
                                ? profiles.find((profile) => profile.id === field.value)?.first_name + ' ' + profiles.find((profile) => profile.id === field.value)?.last_name
                                : "Sélectionner un propriétaire..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput
                              placeholder="Rechercher un propriétaire..."
                              value={userSearchQuery}
                              onValueChange={setUserSearchQuery}
                            />
                            <CommandEmpty>Aucun propriétaire trouvé.</CommandEmpty>
                            <CommandGroup>
                              {profiles
                                .filter(profile =>
                                  (profile.first_name?.toLowerCase() + ' ' + profile.last_name?.toLowerCase()).includes(userSearchQuery.toLowerCase()) ||
                                  profile.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
                                )
                                .map((profile) => (
                                  <CommandItem
                                    value={`${profile.first_name} ${profile.last_name}`}
                                    key={profile.id}
                                    onSelect={() => {
                                      form.setValue("user_id", profile.id);
                                      setOpenUserSelect(false);
                                      setUserSearchQuery('');
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        profile.id === field.value ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {profile.first_name} {profile.last_name} ({profile.email})
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="property_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Propriété</FormLabel>
                    <FormControl><Input {...field} placeholder="Nom de la propriété concernée" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titre</FormLabel>
                    <FormControl><Input {...field} placeholder="Ex: Fuite d'eau cuisine" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Description</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCorrectSpelling}
                        disabled={correcting}
                      >
                        {correcting
                          ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          : <SpellCheck className="h-4 w-4 mr-2" />}
                        Corriger l'orthographe
                      </Button>
                    </div>
                    <FormControl><Textarea {...field} rows={10} placeholder="Décrire le problème en détail..." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priorité</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="low">Basse</SelectItem>
                          <SelectItem value="medium">Moyenne</SelectItem>
                          <SelectItem value="high">Haute</SelectItem>
                          <SelectItem value="urgent">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catégorie</FormLabel>
                      <FormControl><Input {...field} placeholder="Ex: Plomberie, Électricité..." /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                {isEditMode && existingMediaUrls.length > 0 && (
                  <div className="space-y-2">
                    <FormLabel>Médias existants</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {existingMediaUrls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">
                          Média {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <FormItem>
                  <FormLabel>{isEditMode ? "Ajouter des photos / vidéos" : "Photos / Vidéos"}</FormLabel>
                  <FormControl>
                    <Input type="file" multiple {...form.register('media_files')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => navigate('/admin/technical-reports')}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : isEditMode ? "Enregistrer la correction" : "Envoyer l'incident"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <RepairQuoteBuilder onInsert={handleInsertQuote} />
      </div>
    </AdminLayout>
  );
};

export default AdminTechnicalReportFormPage;
