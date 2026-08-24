import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getAdminReportsByStatus, archiveReport, TechnicalReport } from '@/lib/technical-reports-api';
import { createExternalOrderTicket } from '@/lib/order-ticket-api';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Loader2, Archive, ArchiveRestore, QrCode, FlaskConical, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminTechnicalReportsPage: React.FC = () => {
  const [activeReports, setActiveReports] = useState<TechnicalReport[]>([]);
  const [archivedReports, setArchivedReports] = useState<TechnicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [testingTicket, setTestingTicket] = useState(false);

  const handleTestSupportTicket = async () => {
    setTestingTicket(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email || 'contact@hellokeys.fr';
      const result = await createExternalOrderTicket({
        customer_email: email,
        customer_name: 'Test Hello Keys',
        subject: 'Rapport technique : TEST de liaison support',
        message: [
          'Ceci est un ticket de TEST envoyé depuis la page admin des incidents.',
          '',
          `Envoyé par : ${email}`,
          `Date : ${new Date().toLocaleString('fr-FR')}`,
          '',
          'Si vous voyez ce ticket sur la plateforme support, la liaison fonctionne ✅',
        ].join('\n'),
        reference: `TEST-${Date.now()}`,
        source_provider: 'technical_report',
        priority: 'low',
        status: 'open',
      });
      toast.success('Ticket de test créé sur la plateforme support !', {
        description: `Ticket ID : ${result.ticket_id}`,
      });
    } catch (error: any) {
      toast.error('Échec de la création du ticket de test', {
        description: error.message,
      });
    } finally {
      setTestingTicket(false);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [fetchedActive, fetchedArchived] = await Promise.all([
        getAdminReportsByStatus(['pending_owner_action', 'owner_will_manage', 'admin_will_manage', 'resolved'], false),
        getAdminReportsByStatus(['archived'], true),
      ]);
      setActiveReports(fetchedActive);
      setArchivedReports(fetchedArchived);
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

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
            <TableCell>
              <div className="flex items-center gap-2">
                <span>{report.title}</span>
                {report.category === 'guest_qr_report' && (
                  <Badge className="bg-blue-600 text-white hover:bg-blue-600">
                    <QrCode className="mr-1 h-3 w-3" />
                    Voyageur
                  </Badge>
                )}
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                #{report.id.replace(/-/g, '').slice(0, 8).toUpperCase()}
              </span>
            </TableCell>
            <TableCell>{getStatusBadge(report.status)}</TableCell>
            <TableCell>{format(parseISO(report.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="icon"
                title="Corriger le rapport"
                onClick={(e) => { e.stopPropagation(); navigate(`/admin/technical-reports/${report.id}/edit`); }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleTestSupportTicket} disabled={testingTicket}>
            {testingTicket ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-2" />}
            Tester le ticket support
          </Button>
          <Button onClick={() => navigate('/admin/technical-reports/new')}><PlusCircle className="h-4 w-4 mr-2" />Créer un incident</Button>
        </div>
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
    </AdminLayout>
  );
};

export default AdminTechnicalReportsPage;
