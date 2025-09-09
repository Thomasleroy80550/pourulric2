import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getTransferSummaries, UserTransferSummary } from '@/lib/admin-api';
import { Terminal, Banknote } from 'lucide-react';

const AdminTransferSummaryPage: React.FC = () => {
  const [summaries, setSummaries] = useState<UserTransferSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummaries = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedSummaries = await getTransferSummaries();
        setSummaries(fetchedSummaries);
      } catch (err: any) {
        setError(err.message);
        toast.error("Erreur lors de la récupération de la synthèse des virements.");
      } finally {
        setLoading(false);
      }
    };

    fetchSummaries();
  }, []);

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Banknote className="h-8 w-8" />
              <div>
                <CardTitle>Synthèse des Virements</CardTitle>
                <CardDescription>
                  Cette page récapitule le montant total à virer à chaque client, calculé à partir de tous les relevés enregistrés.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Montant Total à Virer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-6 w-24 float-right" /></TableCell>
                      </TableRow>
                    ))
                  ) : summaries.length > 0 ? (
                    summaries.map((summary) => (
                      <TableRow key={summary.user_id}>
                        <TableCell className="font-medium">{summary.first_name} {summary.last_name}</TableCell>
                        <TableCell className="text-right font-bold text-lg text-green-600">
                          {summary.total_amount_to_transfer.toFixed(2)}€
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-gray-500 py-8">
                        Aucun virement à effectuer pour le moment.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminTransferSummaryPage;