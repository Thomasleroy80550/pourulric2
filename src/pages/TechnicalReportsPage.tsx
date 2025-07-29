import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { getTechnicalReportsByUserId, TechnicalReport } from '@/lib/technical-reports-api';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const TechnicalReportsPage: React.FC = () => {
  const [reports, setReports] = useState<TechnicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("Vous devez être connecté pour voir vos rapports techniques.");
        setLoading(false);
        return;
      }
      const data = await getTechnicalReportsByUserId(user.id);
      setReports(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_owner_action': return <Badge variant="secondary">Action requise</Badge>;
      case 'owner_will_manage': return <Badge variant="outline">Vous gérez</Badge>;
      case 'admin_will_manage': return <Badge>Hello Keys gère</Badge>;
      case 'resolved': return <Badge className="bg-green-600 text-white">Résolu</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Rapports Techniques</h1>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <Alert variant="destructive"><Terminal className="h-4 w-4" /><AlertTitle>Erreur</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
        ) : reports.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Vous n'avez aucun rapport technique pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reports.map(report => (
              <Card key={report.id} onClick={() => navigate(`/reports/${report.id}`)} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{report.title}</CardTitle>
                      <CardDescription>{report.property_name} - {format(new Date(report.created_at), 'dd MMMM yyyy', { locale: fr })}</CardDescription>
                    </div>
                    {getStatusBadge(report.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{report.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default TechnicalReportsPage;