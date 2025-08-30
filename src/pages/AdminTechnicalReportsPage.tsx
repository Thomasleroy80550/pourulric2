import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getAllProfiles } from '@/lib/admin-api';
import { UserProfile } from '@/lib/profile-api';
import { getAdminReportsByStatus, createTechnicalReport, archiveReport, TechnicalReport } from '@/lib/technical-reports-api';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Loader2, Archive, ArchiveRestore, Check, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uploadFiles } from '@/lib/storage-api'; // Import the uploadFiles function
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';

const reportSchema = z.object({
  user_id: z.string().min(1, "Veuillez sélectionner un propriétaire."),
  property_name: z.string().min(1, "Veuillez sélectionner une propriété."),
  title: z.string().min(5, "Le titre doit contenir au moins 5 caractères."),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  category: z.string().optional(),
  media_files: z.instanceof(FileList).optional(),
});

const AdminTechnicalReportsPage: React.FC = () => {
  const [activeReports, setActiveReports] = useState<TechnicalReport[]>([]);
  const [archivedReports, setArchivedReports] = useState<TechnicalReport[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const navigate = useNavigate();
  const [openUserSelect, setOpenUserSelect] = useState(false); // New state for combobox
  const [userSearchQuery, setUserSearchQuery] = useState(''); // New state for combobox search

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: { user_id: '', property_name: '', title: '', description: '', priority: 'medium', category: '' },
  });

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [fetchedActive, fetchedArchived, fetchedProfiles] = await Promise.all([
        getAdminReportsByStatus(['pending_owner_action', 'owner_will_manage', 'admin_will_manage', 'resolved'], false),
        getAdminReportsByStatus(['archived'], true),
        getAllProfiles(),
      ]);
      setActiveReports(fetchedActive);
      setArchivedReports(fetchedArchived);
      setProfiles(fetchedProfiles);
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleCreateReport = async (values: z.infer<typeof reportSchema>) => {
    try {
      let uploadedMediaUrls: string[] | null = null;
      if (values.media_files && values.media_files.length > 0) {
        const folderPath = `technical_reports_media/${crypto.randomUUID()}`; // Unique folder for this upload batch
        uploadedMediaUrls = await uploadFiles(values.media_files, 'technical_report_media_bucket', folderPath);
      }

      const reportData = {
        user_id: values.user_id,
        property_name: values.property_name,
        title: values.title,
        description: values.description,
        priority: values.priority,
        category: values.category,
        media_urls: uploadedMediaUrls, // Pass the uploaded URLs
      };

      await createTechnicalReport(reportData);
      toast.success("Incident créé et envoyé au propriétaire !");
      setIsCreateDialogOpen(false);
      form.reset();
      fetchAllData();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const handleArchiveToggle = async (reportId: string, archiveStatus: boolean) => {
    try {
      await archiveReport(reportId); // archiveReport only takes reportId
      toast.success(`Rapport ${archiveStatus ? 'archivé' : 'désarchivé'} avec succès !`);
      fetchAllData();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_owner_action': return <Badge variant="secondary">En attente proprio</Badge>;
      case 'owner_will_manage': return <Badge variant="outline">Géré par proprio</Badge>;
      case 'admin_will_manage': return <Badge>Géré par Hello Keys</Badge>;
      case 'resolved': return <Badge className="bg-green-600 text-white">Résolu</Badge>;
      case 'archived': return <Badge variant="destructive">Archivé</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const ReportsTable: React.FC<{ reports: TechnicalReport[], isArchivedView?: boolean }> = ({ reports, isArchivedView = false }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Propriétaire</TableHead>
          <TableHead>Propriété</TableHead>
          <TableHead>Titre</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports.map(report => (
          <TableRow key={report.id} onClick={() => navigate(`/admin/technical-reports/${report.id}`)} className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
            <TableCell>{report.profiles?.first_name} {report.profiles?.last_name}</TableCell>
            <TableCell>{report.property_name}</TableCell>
            <TableCell>{report.title}</TableCell>
            <TableCell>{getStatusBadge(report.status)}</TableCell>
            <TableCell>{format(parseISO(report.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleArchiveToggle(report.id, !isArchivedView); }}>
                {isArchivedView ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Incidents</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}><PlusCircle className="h-4 w-4 mr-2" />Créer un incident</Button>
      </div>
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Actifs</TabsTrigger>
          <TabsTrigger value="archived">Archivés</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <Card>
            <CardHeader><CardTitle>Rapports Actifs</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-48 w-full" /> : <ReportsTable reports={activeReports} />}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="archived">
          <Card>
            <CardHeader><CardTitle>Rapports Archivés</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-48 w-full" /> : <ReportsTable reports={archivedReports} isArchivedView />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Créer un nouvel incident</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateReport)} className="space-y-4 py-4">
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
                                  value={`${profile.first_name} ${profile.last_name}`} // Value for search
                                  key={profile.id}
                                  onSelect={() => {
                                    form.setValue("user_id", profile.id);
                                    setOpenUserSelect(false);
                                    setUserSearchQuery(''); // Clear search after selection
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      profile.id === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
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
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea {...field} placeholder="Décrire le problème en détail..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                  <FormLabel>Priorité</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <FormItem>
                <FormLabel>Photos / Vidéos</FormLabel>
                <FormControl>
                  <Input type="file" multiple {...form.register('media_files')} />
                </FormControl>
                <FormMessage />
              </FormItem>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Envoyer l'incident"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminTechnicalReportsPage;