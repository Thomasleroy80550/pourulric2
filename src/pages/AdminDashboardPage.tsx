import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Wrench, AlertTriangle, Users, BedDouble, MessageSquare, ArrowRight, FileText, GitMerge, HelpCircle, Lightbulb } from 'lucide-react';
import { getAdminReportsByStatus, TechnicalReport } from '@/lib/technical-reports-api';
import { getAdminReservationReports, ReservationReport } from '@/lib/reports-api';
import { getAllReviewReplies, getDashboardStats, ReviewReplyWithProfile } from '@/lib/admin-api';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSession } from '@/components/SessionContextProvider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface DashboardStats {
  users: number;
  rooms: number;
  pendingReplies: number;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType; description?: string }> = ({ title, value, icon: Icon, description }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </CardContent>
  </Card>
);

const AdminDashboardPage: React.FC = () => {
  const { profile } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingTechReports, setPendingTechReports] = useState<TechnicalReport[]>([]);
  const [reservationReports, setReservationReports] = useState<ReservationReport[]>([]);
  const [pendingReplies, setPendingReplies] = useState<ReviewReplyWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const techStatuses: TechnicalReport['status'][] = ['pending_owner_action', 'admin_will_manage'];
        
        const [
          statsData,
          techReportsData,
          reservationReportsData,
          allRepliesData
        ] = await Promise.all([
          getDashboardStats(),
          getAdminReportsByStatus(techStatuses, false),
          getAdminReservationReports(),
          getAllReviewReplies()
        ]);

        setStats(statsData);
        setPendingTechReports(techReportsData);
        setReservationReports(reservationReportsData);
        setPendingReplies(allRepliesData.filter(reply => reply.status === 'pending_approval'));

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const renderLoadingSkeletons = (count = 3) => (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );

  const renderTechReports = () => {
    if (loading) return renderLoadingSkeletons();
    if (pendingTechReports.length === 0) return <p className="text-center text-sm text-gray-500 py-8">Aucun rapport technique en attente.</p>;

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titre</TableHead>
            <TableHead>Propriétaire</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pendingTechReports.map(report => (
            <TableRow key={report.id}>
              <TableCell className="font-medium">{report.title}</TableCell>
              <TableCell>{report.profiles?.first_name} {report.profiles?.last_name}</TableCell>
              <TableCell>{format(new Date(report.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
              <TableCell className="text-right">
                <Button asChild variant="outline" size="sm"><Link to={`/admin/technical-reports/${report.id}`}>Voir</Link></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderReservationReports = () => {
    if (loading) return renderLoadingSkeletons();
    if (reservationReports.length === 0) return <p className="text-center text-sm text-gray-500 py-8">Aucun signalement de réservation.</p>;

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Problème</TableHead>
            <TableHead>Propriétaire</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservationReports.map(report => (
            <TableRow key={report.id}>
              <TableCell className="font-medium">{report.problem_type}</TableCell>
              <TableCell>{report.profiles?.first_name} {report.profiles?.last_name}</TableCell>
              <TableCell>{format(new Date(report.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
              <TableCell className="text-right">
                <Button asChild variant="outline" size="sm"><Link to={`/admin/reservation-reports/${report.id}`}>Voir</Link></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderPendingReplies = () => {
    if (loading) return renderLoadingSkeletons();
    if (pendingReplies.length === 0) return <p className="text-center text-sm text-gray-500 py-8">Aucune réponse à un avis en attente.</p>;

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Auteur de l'avis</TableHead>
            <TableHead>Propriétaire</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pendingReplies.map(reply => (
            <TableRow key={reply.id}>
              <TableCell className="font-medium">{reply.review_author}</TableCell>
              <TableCell>{reply.profiles?.first_name} {reply.profiles?.last_name}</TableCell>
              <TableCell>{format(new Date(reply.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
              <TableCell className="text-right">
                <Button asChild variant="outline" size="sm"><Link to="/admin/review-replies">Modérer</Link></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const quickAccessLinks = [
    { to: "/admin/users", label: "Gérer les Utilisateurs", icon: Users },
    { to: "/admin/pages", label: "Gérer les Pages", icon: FileText },
    { to: "/admin/blog", label: "Gérer le Blog", icon: FileText },
    { to: "/admin/faq", label: "Gérer la FAQ", icon: HelpCircle },
    { to: "/admin/changelog", label: "Gérer le Changelog", icon: GitMerge },
    { to: "/admin/ideas", label: "Gérer les Idées", icon: Lightbulb },
  ];

  if (error) {
    return (
      <AdminLayout>
        <Alert variant="destructive" className="m-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erreur de chargement</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Tableau de Bord Administrateur</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Bienvenue, {profile?.first_name || 'Admin'}. Voici un aperçu de votre plateforme.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {loading || !stats ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
          ) : (
            <>
              <StatCard title="Utilisateurs" value={stats.users} icon={Users} description="Nombre total d'utilisateurs" />
              <StatCard title="Logements" value={stats.rooms} icon={BedDouble} description="Nombre total de propriétés" />
              <StatCard title="Tâches Techniques" value={pendingTechReports.length} icon={Wrench} description="Rapports en attente d'action" />
              <StatCard title="Avis à Modérer" value={pendingReplies.length} icon={MessageSquare} description="Réponses en attente d'approbation" />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Tâches en Attente</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="tech-reports" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="tech-reports">
                      <Wrench className="h-4 w-4 mr-2" />
                      Technique <Badge variant="secondary" className="ml-2">{loading ? '...' : pendingTechReports.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="reservation-reports">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Réservations <Badge variant="secondary" className="ml-2">{loading ? '...' : reservationReports.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="review-replies">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Avis <Badge variant="secondary" className="ml-2">{loading ? '...' : pendingReplies.length}</Badge>
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="tech-reports" className="mt-4">{renderTechReports()}</TabsContent>
                  <TabsContent value="reservation-reports" className="mt-4">{renderReservationReports()}</TabsContent>
                  <TabsContent value="review-replies" className="mt-4">{renderPendingReplies()}</TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Accès Rapides</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col space-y-2">
                {quickAccessLinks.map(link => (
                  <Button key={link.to} asChild variant="ghost" className="justify-start">
                    <Link to={link.to}>
                      <link.icon className="h-4 w-4 mr-2" />
                      {link.label}
                    </Link>
                  </Button>
                ))}
              </CardContent>
            </Card>
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center text-blue-900 dark:text-blue-100">
                  Générer un Relevé
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                  Créez et envoyez les relevés mensuels aux propriétaires.
                </p>
                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  <Link to="/admin/invoice-generation">
                    Commencer <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;