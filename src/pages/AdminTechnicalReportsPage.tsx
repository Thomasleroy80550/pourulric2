import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getAdminReportsByStatus, archiveReport, updateTechnicalReport, TechnicalReport } from '@/lib/technical-reports-api';
import { createExternalOrderTicket } from '@/lib/order-ticket-api';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PlusCircle, Loader2, Archive, ArchiveRestore, QrCode, FlaskConical, Pencil,
  ArrowUpDown, ArrowUp, ArrowDown, LayoutGrid, List, AlertTriangle, Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';

type SortKey = 'owner' | 'property' | 'title' | 'status' | 'priority' | 'date';
type SortDirection = 'asc' | 'desc';

const PRIORITY_ORDER: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
const STATUS_ORDER: Record<string, number> = {
  pending_owner_action: 1,
  owner_will_manage: 2,
  admin_will_manage: 3,
  resolved: 4,
  archived: 5,
};

const KANBAN_COLUMNS: { status: TechnicalReport['status']; label: string; color: string }[] = [
  { status: 'pending_owner_action', label: 'En attente proprio', color: 'border-t-amber-500' },
  { status: 'owner_will_manage', label: 'Géré par proprio', color: 'border-t-slate-400' },
  { status: 'admin_will_manage', label: 'Géré par Hello Keys', color: 'border-t-blue-600' },
  { status: 'resolved', label: 'Résolu', color: 'border-t-green-600' },
];

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

const getPriorityBadge = (priority?: string) => {
  switch (priority) {
    case 'urgent': return <Badge variant="destructive">Urgente</Badge>;
    case 'high': return <Badge className="bg-orange-500 text-white hover:bg-orange-500">Haute</Badge>;
    case 'medium': return <Badge variant="secondary">Moyenne</Badge>;
    case 'low': return <Badge variant="outline">Basse</Badge>;
    default: return <Badge variant="outline">—</Badge>;
  }
};

const AdminTechnicalReportsPage: React.FC = () => {
  const [activeReports, setActiveReports] = useState<TechnicalReport[]>([]);
  const [archivedReports, setArchivedReports] = useState<TechnicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [testingTicket, setTestingTicket] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>(
    () => (localStorage.getItem('admin-reports-view') as 'table' | 'kanban') || 'table',
  );
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [dragOverColumn, setDragOverColumn] = useState<TechnicalReport['status'] | null>(null);

  const changeViewMode = (mode: 'table' | 'kanban') => {
    setViewMode(mode);
    localStorage.setItem('admin-reports-view', mode);
  };

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

  const handleStatusChange = async (reportId: string, newStatus: TechnicalReport['status']) => {
    const report = activeReports.find(r => r.id === reportId);
    if (!report || report.status === newStatus) return;

    // Mise à jour optimiste
    setActiveReports(prev => prev.map(r => (r.id === reportId ? { ...r, status: newStatus } : r)));
    try {
      const updates: Partial<TechnicalReport> = { status: newStatus };
      if (newStatus === 'resolved') updates.resolved_at = new Date().toISOString();
      await updateTechnicalReport(reportId, updates as any);
      toast.success('Statut mis à jour !');
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
      fetchAllData();
    }
  };

  // Incidents à traiter en priorité : urgents/haute priorité non résolus, ou non résolus depuis plus de 7 jours
  const priorityReports = useMemo(() => {
    return activeReports
      .filter(r => r.status !== 'resolved')
      .filter(r =>
        (r.priority as string) === 'urgent' || r.priority === 'high' ||
        differenceInDays(new Date(), parseISO(r.created_at)) > 7,
      )
      .sort((a, b) => (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0));
  }, [activeReports]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'date' ? 'desc' : 'asc');
    }
  };

  const sortReports = (reports: TechnicalReport[]) => {
    const dir = sortDirection === 'asc' ? 1 : -1;
    return [...reports].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'owner': {
          const nameA = `${a.profiles?.first_name || ''} ${a.profiles?.last_name || ''}`.toLowerCase();
          const nameB = `${b.profiles?.first_name || ''} ${b.profiles?.last_name || ''}`.toLowerCase();
          cmp = nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
          break;
        }
        case 'property': {
          const pA = (a.property_name || '').toLowerCase();
          const pB = (b.property_name || '').toLowerCase();
          cmp = pA < pB ? -1 : pA > pB ? 1 : 0;
          break;
        }
        case 'title': {
          const tA = (a.title || '').toLowerCase();
          const tB = (b.title || '').toLowerCase();
          cmp = tA < tB ? -1 : tA > tB ? 1 : 0;
          break;
        }
        case 'status':
          cmp = (STATUS_ORDER[a.status] || 0) - (STATUS_ORDER[b.status] || 0);
          break;
        case 'priority':
          cmp = (PRIORITY_ORDER[a.priority] || 0) - (PRIORITY_ORDER[b.priority] || 0);
          break;
        case 'date':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return cmp * dir;
    });
  };

  const SortableHead: React.FC<{ label: string; sortId: SortKey; className?: string }> = ({ label, sortId, className }) => (
    <TableHead className={className}>
      <button
        type="button"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => handleSort(sortId)}
      >
        {label}
        {sortKey === sortId
          ? (sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)
          : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
      </button>
    </TableHead>
  );

  const ReportsTable: React.FC<{ reports: TechnicalReport[], isArchivedView?: boolean }> = ({ reports, isArchivedView = false }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead label="Propriétaire" sortId="owner" />
          <SortableHead label="Propriété" sortId="property" />
          <SortableHead label="Titre" sortId="title" />
          <SortableHead label="Priorité" sortId="priority" />
          <SortableHead label="Statut" sortId="status" />
          <SortableHead label="Date" sortId="date" />
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortReports(reports).map(report => (
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
            <TableCell>{getPriorityBadge(report.priority)}</TableCell>
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

  const KanbanCard: React.FC<{ report: TechnicalReport }> = ({ report }) => {
    const ageDays = differenceInDays(new Date(), parseISO(report.created_at));
    return (
      <div
        draggable
        onDragStart={(e) => e.dataTransfer.setData('text/plain', report.id)}
        onClick={() => navigate(`/admin/technical-reports/${report.id}`)}
        className="rounded-lg border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow space-y-2"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-sm leading-tight">{report.title}</p>
          {getPriorityBadge(report.priority)}
        </div>
        <p className="text-xs text-muted-foreground">{report.property_name}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {report.profiles?.first_name} {report.profiles?.last_name}
          </span>
          <span className={cn("text-xs flex items-center gap-1", ageDays > 7 && report.status !== 'resolved' ? "text-red-600 font-medium" : "text-muted-foreground")}>
            <Clock className="h-3 w-3" />
            {ageDays === 0 ? "Aujourd'hui" : `${ageDays} j`}
          </span>
        </div>
      </div>
    );
  };

  const KanbanBoard: React.FC = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {KANBAN_COLUMNS.map(col => {
        const columnReports = sortReports(activeReports.filter(r => r.status === col.status));
        return (
          <div
            key={col.status}
            onDragOver={(e) => { e.preventDefault(); setDragOverColumn(col.status); }}
            onDragLeave={() => setDragOverColumn(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverColumn(null);
              const reportId = e.dataTransfer.getData('text/plain');
              if (reportId) handleStatusChange(reportId, col.status);
            }}
            className={cn(
              "rounded-lg bg-muted/40 border border-t-4 flex flex-col min-h-[300px] transition-colors",
              col.color,
              dragOverColumn === col.status && "bg-muted ring-2 ring-primary/40",
            )}
          >
            <div className="p-3 flex items-center justify-between border-b">
              <h3 className="font-semibold text-sm">{col.label}</h3>
              <Badge variant="secondary">{columnReports.length}</Badge>
            </div>
            <div className="p-2 space-y-2 flex-1">
              {columnReports.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Aucun incident</p>
              )}
              {columnReports.map(report => <KanbanCard key={report.id} report={report} />)}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <AdminLayout>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="text-3xl font-bold">Incidents</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleTestSupportTicket} disabled={testingTicket}>
            {testingTicket ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-2" />}
            Tester le ticket support
          </Button>
          <Button onClick={() => navigate('/admin/technical-reports/new')}><PlusCircle className="h-4 w-4 mr-2" />Créer un incident</Button>
        </div>
      </div>

      {/* Section À traiter en priorité */}
      {!loading && priorityReports.length > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-red-700 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              À traiter en priorité ({priorityReports.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {priorityReports.slice(0, 6).map(report => {
              const ageDays = differenceInDays(new Date(), parseISO(report.created_at));
              return (
                <div
                  key={report.id}
                  onClick={() => navigate(`/admin/technical-reports/${report.id}`)}
                  className="rounded-lg border bg-card p-3 cursor-pointer hover:shadow-md transition-shadow space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm leading-tight">{report.title}</p>
                    {getPriorityBadge(report.priority)}
                  </div>
                  <p className="text-xs text-muted-foreground">{report.property_name} — {report.profiles?.first_name} {report.profiles?.last_name}</p>
                  <div className="flex items-center justify-between">
                    {getStatusBadge(report.status)}
                    <span className={cn("text-xs flex items-center gap-1", ageDays > 7 ? "text-red-600 font-medium" : "text-muted-foreground")}>
                      <Clock className="h-3 w-3" />
                      {ageDays === 0 ? "Aujourd'hui" : `Depuis ${ageDays} j`}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="active">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="active">Actifs ({activeReports.length})</TabsTrigger>
            <TabsTrigger value="archived">Archivés ({archivedReports.length})</TabsTrigger>
          </TabsList>
          <div className="flex rounded-md border overflow-hidden">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => changeViewMode('table')}
            >
              <List className="h-4 w-4 mr-2" />
              Tableau
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => changeViewMode('kanban')}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Kanban
            </Button>
          </div>
        </div>
        <TabsContent value="active">
          {viewMode === 'kanban' ? (
            loading ? <Skeleton className="h-96 w-full" /> : <KanbanBoard />
          ) : (
            <Card>
              <CardHeader><CardTitle>Rapports Actifs</CardTitle></CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-48 w-full" /> : <ReportsTable reports={activeReports} />}
              </CardContent>
            </Card>
          )}
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
