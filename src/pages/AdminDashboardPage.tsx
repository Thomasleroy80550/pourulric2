import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Wrench, AlertTriangle, Lightbulb, ArrowRight } from 'lucide-react';
import { getAdminReportsByStatus, TechnicalReport } from '@/lib/technical-reports-api';
import { getAdminReservationReports, ReservationReport } from '@/lib/reports-api';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSession } from '@/components/SessionContextProvider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const AdminDashboardPage: React.FC = () => {
  const { profile } = useSession();
  const [pendingTechReports, setPendingTechReports] = useState<TechnicalReport[]>([]);
  const [reservationReports, setReservationReports] = useState<ReservationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const techStatuses: TechnicalReport['status'][] = ['pending_owner_action', 'admin_will_manage'];
        const [techReportsData, reservationReportsData] = await Promise.all([
          getAdminReportsByStatus(techStatuses, false),
          getAdminReservationReports()
        ]);
        setPendingTechReports(techReportsData);
        setReservationReports(reservationReportsData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const renderTechReports = () => {
    if (loading) return <Skeleton className="h-48 w-full" />;
    if (error) return <Alert variant="destructive"><AlertTitle>Erreur</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    if (pendingTechReports.length === 0) return <p className="text-sm text-gray-500">Aucun rapport technique en attente. Excellent travail !</p>;

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titre</TableHead>
            <TableHead>Propriétaire</TableHead>
            <TableHead>Date</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pendingTechReports.map(report => (
            <TableRow key={report.id}>
              <TableCell className="font-medium">{report.title}</TableCell>
              <TableCell>{report.profiles?.first_name} {report.profiles?.last_name}</TableCell>
              <TableCell>{format(new Date(report.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
              <TableCell className="text-right">
                <Button asChild variant="outline" size="sm">
                  <Link to={`/admin/technical-reports/${report.id}`}>Voir</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderReservationReports = () => {
    if (loading) return <Skeleton className="h-48 w-full" />;
    if (error) return <Alert variant="destructive"><AlertTitle>Erreur</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    if (reservationReports.length === 0) return <p className="text-sm text-gray-500">Aucun signalement de réservation. Tout est en ordre.</p>;

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Problème</TableHead>
            <TableHead>N° Réservation</TableHead>
            <TableHead>Propriétaire</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservationReports.map(report => (
            <TableRow key={report.id}>
              <TableCell className="font-medium">{report.problem_type}</TableCell>
              <TableCell>{report.reservation_id}</TableCell>
              <TableCell>{report.profiles?.first_name} {report.profiles?.last_name}</TableCell>
              <TableCell>{format(new Date(report.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Bonjour, {profile?.first_name || 'Admin'} !</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Voici un résumé de vos tâches et suggestions pour aujourd'hui.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wrench className="h-6 w-6 mr-3 text-blue-500" />
                  Rapports Techniques en Attente ({loading ? '...' : pendingTechReports.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderTechReports()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-6 w-6 mr-3 text-orange-500" />
                  Signalements sur les Réservations ({loading ? '...' : reservationReports.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderReservationReports()}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-8">
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lightbulb className="h-6 w-6 mr-3 text-yellow-400" />
                  Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Pensez à vérifier les performances du mois dernier pour ajuster les stratégies de prix.
                </p>
                <Button variant="ghost" className="text-blue-600 dark:text-blue-300 p-0 h-auto hover:bg-transparent" asChild>
                  <Link to="/performance">
                    Analyser les performances <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
             <Card>
              <CardHeader>
                <CardTitle>Accès Rapides</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col space-y-2">
                 <Button asChild variant="outline"><Link to="/admin/users">Gérer les Utilisateurs</Link></Button>
                 <Button asChild variant="outline"><Link to="/admin/pages">Gérer les Pages</Link></Button>
                 <Button asChild variant="outline"><Link to="/admin/invoice-generation">Générer un Relevé</Link></Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;