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
import { getUserRooms } from '@/lib/user-room-api';
import { getAdminReports, createReport, markReportAsResolved, TechnicalReport } from '@/lib/technical-reports-api';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Loader2, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const reportSchema = z.object({
  user_id: z.string().min(1, "Veuillez sélectionner un propriétaire."),
  property_name: z.string().min(1, "Veuillez sélectionner une propriété."),
  title: z.string().min(5, "Le titre doit contenir au moins 5 caractères."),
  description: z.string().optional(),
});

const AdminTechnicalReportsPage: React.FC = () => {
  const [reports, setReports] = useState<TechnicalReport[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [allUserRooms, setAllUserRooms] = useState<any[]>([]); // We'll fetch rooms for the selected user
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: { user_id: '', property_name: '', title: '', description: '' },
  });

  const selectedUserId = form.watch('user_id');

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [fetchedReports, fetchedProfiles] = await Promise.all([
        getAdminReports(),
        getAllProfiles(),
      ]);
      setReports(fetchedReports);
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
      await createReport(values);
      toast.success("Rapport créé et envoyé au propriétaire !");
      setIsCreateDialogOpen(false);
      form.reset();
      fetchAllData();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      await markReportAsResolved(reportId);
      toast.success("Rapport marqué comme résolu.");
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
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Rapports Techniques</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}><PlusCircle className="h-4 w-4 mr-2" />Créer un rapport</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Tous les rapports</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-48 w-full" /> : (
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
                  <TableRow key={report.id}>
                    <TableCell>{report.profiles?.first_name} {report.profiles?.last_name}</TableCell>
                    <TableCell>{report.property_name}</TableCell>
                    <TableCell>{report.title}</TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell>{format(parseISO(report.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                    <TableCell className="text-right">
                      {report.status !== 'resolved' && (
                        <Button size="sm" onClick={() => handleResolveReport(report.id)}><CheckCircle className="h-4 w-4 mr-2" />Résolu</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Créer un nouveau rapport technique</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateReport)} className="space-y-4 py-4">
              <FormField control={form.control} name="user_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Propriétaire</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un propriétaire" /></SelectTrigger></FormControl>
                    <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
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
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Envoyer le rapport"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminTechnicalReportsPage;