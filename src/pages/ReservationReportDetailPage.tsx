import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, User, Hash, MessageSquare, Calendar, Phone, Mail } from 'lucide-react';
import { getReservationReportById, ReservationReport } from '@/lib/reports-api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ReservationReportDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReservationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getReservationReportById(id);
        setReport(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  const renderContent = () => {
    if (loading) return <Skeleton className="h-64 w-full" />;
    if (error) return <Alert variant="destructive"><AlertTitle>Erreur</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    if (!report) return <p>Signalement non trouvé.</p>;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Détails du Signalement</CardTitle>
          <CardDescription>Signalement pour la réservation #{report.reservation_id}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center">
              <Hash className="h-5 w-5 mr-3 text-gray-500 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">Type de problème</p>
                <p className="font-medium">{report.problem_type}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-3 text-gray-500 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">Date du signalement</p>
                <p className="font-medium">{format(new Date(report.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
              </div>
            </div>
            <div className="flex items-center">
              <User className="h-5 w-5 mr-3 text-gray-500 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">Propriétaire</p>
                <p className="font-medium">{report.profiles?.first_name} {report.profiles?.last_name}</p>
              </div>
            </div>
             <div className="flex items-center">
              <Phone className="h-5 w-5 mr-3 text-gray-500 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">Contact téléphonique</p>
                <p className="font-medium">{report.contact_phone || report.profiles?.phone_number || 'Non fourni'}</p>
              </div>
            </div>
             <div className="flex items-center">
              <Mail className="h-5 w-5 mr-3 text-gray-500 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">Contact Email</p>
                <p className="font-medium">{report.contact_email || 'Non fourni'}</p>
              </div>
            </div>
          </div>
          {report.description && (
            <div className="pt-6 border-t">
              <div className="flex items-start">
                <MessageSquare className="h-5 w-5 mr-3 mt-1 text-gray-500 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="font-medium whitespace-pre-wrap">{report.description}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout>
      <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour au tableau de bord
      </Button>
      {renderContent()}
    </AdminLayout>
  );
};

export default ReservationReportDetailPage;