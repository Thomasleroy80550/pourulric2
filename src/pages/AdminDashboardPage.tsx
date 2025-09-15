import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Users, BedDouble, DollarSign, UserPlus, Wrench, AlertTriangle, Lightbulb, FileCheck, MailWarning, FilePlus, Settings, Puzzle } from 'lucide-react';
import { getAdminReportsByStatus, TechnicalReport } from '@/lib/technical-reports-api';
import { getAdminReservationReports, ReservationReport } from '@/lib/reports-api';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSession } from '@/components/SessionContextProvider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getAllProfiles, getAllUserRooms, getSavedInvoices, getAccountantRequests, getAllIdeas, AccountantRequest, AdminIdea, SavedInvoice } from '@/lib/admin-api';
import { UserProfile } from '@/lib/profile-api';
import { AdminUserRoom } from '@/lib/admin-api';
import StatCard from '@/components/admin/StatCard';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getAllModuleActivationRequests, ModuleActivationRequest } from '@/lib/module-activation-api';

const AdminDashboardPage: React.FC = () => {
  const { profile } = useSession();
  const [stats, setStats] = useState({
    totalUsers: 0,
    newUsersLast30Days: 0,
    totalRooms: 0,
    totalRevenue: 0,
  });
  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);
  const [pendingTechReports, setPendingTechReports] = useState<TechnicalReport[]>([]);
  const [reservationReports, setReservationReports] = useState<ReservationReport[]>([]);
  const [accountantRequests, setAccountantRequests] = useState<AccountantRequest[]>([]);
  const [pendingIdeas, setPendingIdeas] = useState<AdminIdea[]>([]);
  const [pendingModuleRequests, setPendingModuleRequests] = useState<ModuleActivationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const techStatuses: TechnicalReport['status'][] = ['pending_owner_action', 'admin_will_manage'];
        const [
          profilesData,
          roomsData,
          invoicesData,
          techReportsData,
          reservationReportsData,
          accountantRequestsData,
          ideasData,
          moduleRequestsData,
        ] = await Promise.all([
          getAllProfiles(),
          getAllUserRooms(),
          getSavedInvoices(),
          getAdminReportsByStatus(techStatuses, false),
          getAdminReservationReports(),
          getAccountantRequests(),
          getAllIdeas(),
          getAllModuleActivationRequests(),
        ]);

        // Calculate stats
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newUsersLast30Days = profilesData.filter(p => p.created_at && new Date(p.created_at) > thirtyDaysAgo).length;
        const totalRevenue = invoicesData.reduce((acc, inv) => acc + (inv.totals?.total_ht || 0), 0);
        setStats({
          totalUsers: profilesData.length,
          newUsersLast30Days,
          totalRooms: roomsData.length,
          totalRevenue,
        });

        // Process data for user growth chart
        const userGrowth = profilesData.reduce((acc: { [key: string]: number }, profile) => {
          if (profile.created_at) {
            const month = format(new Date(profile.created_at), 'yyyy-MM');
            acc[month] = (acc[month] || 0) + 1;
          }
          return acc;
        }, {});
        const sortedUserGrowth = Object.entries(userGrowth)
          .map(([month, count]) => ({ month: format(new Date(month), 'MMM yy', { locale: fr }), Nouveaux: count }))
          .sort((a, b) => a.month.localeCompare(b.month))
          .slice(-12); // Get last 12 months
        setUserGrowthData(sortedUserGrowth);

        setPendingTechReports(techReportsData);
        setReservationReports(reservationReportsData);
        setAccountantRequests(accountantRequestsData.filter(r => r.status === 'pending'));
        setPendingIdeas(ideasData.filter(i => i.status === 'new'));
        setPendingModuleRequests(moduleRequestsData.filter(r => r.status === 'pending'));

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const renderTechReports = () => (
    <Table>
      <TableHeader><TableRow><TableHead>Titre</TableHead><TableHead>Propriétaire</TableHead><TableHead>Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
      <TableBody>
        {pendingTechReports.map(report => (
          <TableRow key={report.id}>
            <TableCell className="font-medium">{report.title}</TableCell>
            <TableCell>{report.profiles?.first_name} {report.profiles?.last_name}</TableCell>
            <TableCell>{format(new Date(report.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
            <TableCell className="text-right"><Button asChild variant="outline" size="sm"><Link to={`/admin/technical-reports/${report.id}`}>Voir</Link></Button></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderReservationReports = () => (
    <Table>
      <TableHeader><TableRow><TableHead>Problème</TableHead><TableHead>N° Réservation</TableHead><TableHead>Propriétaire</TableHead><TableHead>Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
      <TableBody>
        {reservationReports.map(report => (
          <TableRow key={report.id}>
            <TableCell className="font-medium">{report.problem_type}</TableCell>
            <TableCell>{report.reservation_id}</TableCell>
            <TableCell>{report.profiles?.first_name} {report.profiles?.last_name}</TableCell>
            <TableCell>{format(new Date(report.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
            <TableCell className="text-right"><Button asChild variant="outline" size="sm"><Link to={`/admin/reservation-reports/${report.id}`}>Voir</Link></Button></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderAccountantRequests = () => (
    <Table>
      <TableHeader><TableRow><TableHead>Demandeur</TableHead><TableHead>Email Comptable</TableHead><TableHead>Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
      <TableBody>
        {accountantRequests.map(req => (
          <TableRow key={req.id}>
            <TableCell>{req.profiles?.first_name} {req.profiles?.last_name}</TableCell>
            <TableCell>{req.accountant_email}</TableCell>
            <TableCell>{format(new Date(req.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
            <TableCell className="text-right"><Button asChild variant="outline" size="sm"><Link to="/admin/users">Gérer</Link></Button></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderIdeas = () => (
    <Table>
      <TableHeader><TableRow><TableHead>Titre</TableHead><TableHead>Auteur</TableHead><TableHead>Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
      <TableBody>
        {pendingIdeas.map(idea => (
          <TableRow key={idea.id}>
            <TableCell className="font-medium">{idea.title}</TableCell>
            <TableCell>{idea.profiles?.first_name} {idea.profiles?.last_name}</TableCell>
            <TableCell>{format(new Date(idea.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
            <TableCell className="text-right"><Button asChild variant="outline" size="sm"><Link to="/admin/ideas">Voir</Link></Button></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderModuleRequests = () => (
    <Table>
      <TableHeader><TableRow><TableHead>Utilisateur</TableHead><TableHead>Module</TableHead><TableHead>Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
      <TableBody>
        {pendingModuleRequests.map(req => (
          <TableRow key={req.id}>
            <TableCell>{req.profiles ? `${req.profiles.first_name} ${req.profiles.last_name}` : 'Utilisateur inconnu'}</TableCell>
            <TableCell>{req.module_name}</TableCell>
            <TableCell>{format(new Date(req.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
            <TableCell className="text-right"><Button asChild variant="outline" size="sm"><Link to="/admin/module-requests">Gérer</Link></Button></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (error) return <AdminLayout><Alert variant="destructive"><AlertTitle>Erreur</AlertTitle><AlertDescription>{error}</AlertDescription></Alert></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Bonjour, {profile?.first_name || 'Admin'} !</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Bienvenue sur votre tableau de bord centralisé.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Utilisateurs" value={stats.totalUsers.toString()} icon={<Users className="h-4 w-4 text-muted-foreground" />} description={`${stats.newUsersLast30Days} nouveaux ce mois-ci`} loading={loading} />
          <StatCard title="Logements Actifs" value={stats.totalRooms.toString()} icon={<BedDouble className="h-4 w-4 text-muted-foreground" />} description="Total des propriétés gérées" loading={loading} />
          <StatCard title="Revenus (HT)" value={new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(stats.totalRevenue)} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} description="Revenus totaux générés" loading={loading} />
          <StatCard title="Tâches en Attente" value={(pendingTechReports.length + reservationReports.length + accountantRequests.length + pendingIdeas.length + pendingModuleRequests.length).toString()} icon={<FileCheck className="h-4 w-4 text-muted-foreground" />} description="Actions requises de votre part" loading={loading} />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Croissance des Utilisateurs (12 derniers mois)</CardTitle></CardHeader>
            <CardContent className="pl-2">
              {loading ? <Skeleton className="h-72 w-full" /> :
                <ChartContainer config={{ Nouveaux: { label: "Nouveaux", color: "hsl(var(--primary))" } }} className="h-72 w-full">
                  <BarChart data={userGrowthData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="Nouveaux" fill="var(--color-Nouveaux)" radius={4} />
                  </BarChart>
                </ChartContainer>
              }
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Accès Rapides</CardTitle></CardHeader>
            <CardContent className="flex flex-col space-y-2">
              <Button asChild variant="outline"><Link to="/admin/users"><UserPlus className="mr-2 h-4 w-4" /> Gérer les Utilisateurs</Link></Button>
              <Button asChild variant="outline"><Link to="/admin/invoice-generation"><FilePlus className="mr-2 h-4 w-4" /> Générer un Relevé</Link></Button>
              <Button asChild variant="outline"><Link to="/admin/strategies"><Wrench className="mr-2 h-4 w-4" /> Gérer les Stratégies</Link></Button>
              <Button asChild variant="outline"><Link to="/admin/settings"><Settings className="mr-2 h-4 w-4" /> Paramètres</Link></Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Tâches en Attente</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="tech_reports">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
                <TabsTrigger value="tech_reports"><Wrench className="mr-2 h-4 w-4" />Rapports Tech ({pendingTechReports.length})</TabsTrigger>
                <TabsTrigger value="reservations"><AlertTriangle className="mr-2 h-4 w-4" />Signalements ({reservationReports.length})</TabsTrigger>
                <TabsTrigger value="accountants"><MailWarning className="mr-2 h-4 w-4" />Demandes Comptable ({accountantRequests.length})</TabsTrigger>
                <TabsTrigger value="ideas"><Lightbulb className="mr-2 h-4 w-4" />Idées ({pendingIdeas.length})</TabsTrigger>
                <TabsTrigger value="module_requests"><Puzzle className="mr-2 h-4 w-4" />Modules ({pendingModuleRequests.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="tech_reports" className="mt-4">
                {loading ? <Skeleton className="h-48 w-full" /> : pendingTechReports.length > 0 ? renderTechReports() : <p className="text-center text-sm text-gray-500 py-8">Aucun rapport technique en attente.</p>}
              </TabsContent>
              <TabsContent value="reservations" className="mt-4">
                {loading ? <Skeleton className="h-48 w-full" /> : reservationReports.length > 0 ? renderReservationReports() : <p className="text-center text-sm text-gray-500 py-8">Aucun signalement sur les réservations.</p>}
              </TabsContent>
              <TabsContent value="accountants" className="mt-4">
                {loading ? <Skeleton className="h-48 w-full" /> : accountantRequests.length > 0 ? renderAccountantRequests() : <p className="text-center text-sm text-gray-500 py-8">Aucune demande d'accès comptable en attente.</p>}
              </TabsContent>
              <TabsContent value="ideas" className="mt-4">
                {loading ? <Skeleton className="h-48 w-full" /> : pendingIdeas.length > 0 ? renderIdeas() : <p className="text-center text-sm text-gray-500 py-8">Aucune nouvelle idée proposée.</p>}
              </TabsContent>
              <TabsContent value="module_requests" className="mt-4">
                {loading ? <Skeleton className="h-48 w-full" /> : pendingModuleRequests.length > 0 ? renderModuleRequests() : <p className="text-center text-sm text-gray-500 py-8">Aucune demande d'activation de module en attente.</p>}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;