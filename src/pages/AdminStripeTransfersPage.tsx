import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { listStripeTransfers, StripeTransfer } from '@/lib/admin-api';
import { ArrowRightLeft } from 'lucide-react';

const AdminStripeTransfersPage: React.FC = () => {
  const [transfers, setTransfers] = useState<StripeTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStripeTransfers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const allTransfers = await listStripeTransfers();
      setTransfers(allTransfers.sort((a, b) => b.created - a.created));
    } catch (err: any) {
      setError(err.message);
      toast.error("Erreur lors de la récupération des transferts Stripe.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStripeTransfers();
  }, [fetchStripeTransfers]);

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <ArrowRightLeft className="h-8 w-8" />
              <div>
                <CardTitle>Transferts Stripe</CardTitle>
                <CardDescription>
                  Consultez la liste de tous les transferts effectués via Stripe.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Transfert</TableHead>
                    <TableHead>Compte Destinataire</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Devise</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : transfers.length > 0 ? (
                    transfers.map((transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell className="font-mono text-xs">{transfer.id}</TableCell>
                        <TableCell>{transfer.destination || 'N/A'}</TableCell>
                        <TableCell>{(transfer.amount / 100).toFixed(2)}</TableCell>
                        <TableCell>{transfer.currency.toUpperCase()}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{transfer.description || 'N/A'}</TableCell>
                        <TableCell>{new Date(transfer.created * 1000).toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Aucun transfert trouvé.
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

export default AdminStripeTransfersPage;