import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getStripePaymentIntents, StripePaymentIntent } from '@/lib/stripe-api';
import { Terminal, CreditCard, Search } from 'lucide-react';
import { useDebounce } from 'react-use';

const AdminStripeTransactionsPage: React.FC = () => {
  const [paymentIntents, setPaymentIntents] = useState<StripePaymentIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useDebounce(
    () => {
      setDebouncedSearchTerm(searchTerm);
    },
    500,
    [searchTerm]
  );

  const fetchPaymentIntents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Toujours récupérer une liste, puis filtrer côté client si ce n'est pas une recherche directe par ID
      const response = await getStripePaymentIntents(debouncedSearchTerm.trim());
      
      let filteredIntents = response.data;

      // Si le terme de recherche n'est pas un ID 'pi_', effectuer le filtrage côté client
      if (debouncedSearchTerm.trim() && !debouncedSearchTerm.trim().startsWith('pi_')) {
        const lowerCaseSearchTerm = debouncedSearchTerm.trim().toLowerCase();
        filteredIntents = response.data.filter(pi => {
          const idMatch = pi.id.toLowerCase().includes(lowerCaseSearchTerm);
          const descriptionMatch = pi.description?.toLowerCase().includes(lowerCaseSearchTerm);
          const emailMatch = pi.receipt_email?.toLowerCase().includes(lowerCaseSearchTerm);
          
          const customerMatch = typeof pi.customer === 'string'
            ? pi.customer.toLowerCase().includes(lowerCaseSearchTerm) // Recherche par ID client
            : (pi.customer?.email?.toLowerCase().includes(lowerCaseSearchTerm) || pi.customer?.name?.toLowerCase().includes(lowerCaseSearchTerm)); // Recherche par email ou nom client si étendu
          
          const metadataMatch = pi.metadata ? Object.values(pi.metadata).some(val => val.toLowerCase().includes(lowerCaseSearchTerm)) : false;

          return idMatch || descriptionMatch || emailMatch || customerMatch || metadataMatch;
        });
      }
      
      setPaymentIntents(filteredIntents);
    } catch (err: any) {
      setError(err.message);
      toast.error("Erreur lors de la récupération des transactions Stripe.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm]); // Dépendance à debouncedSearchTerm

  useEffect(() => {
    fetchPaymentIntents();
  }, [fetchPaymentIntents]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPaymentIntents();
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <CreditCard className="h-8 w-8" />
              <div>
                <CardTitle>Transactions Stripe</CardTitle>
                <CardDescription>
                  Consultez la liste des transactions et recherchez par ID de paiement.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex items-center gap-2 mb-4">
              <Input
                type="text"
                placeholder="Rechercher par ID (pi_...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              <Button type="submit" variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </form>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Paiement</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Description</TableHead>
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
                  ) : paymentIntents.length > 0 ? (
                    paymentIntents.map((pi) => {
                      const fee = pi.latest_charge?.balance_transaction?.fee;
                      return (
                        <TableRow key={pi.id}>
                          <TableCell className="font-mono text-xs">{pi.id}</TableCell>
                          <TableCell>{(pi.amount / 100).toFixed(2)} {pi.currency.toUpperCase()}</TableCell>
                          <TableCell>
                            {typeof fee === 'number'
                              ? `${(fee / 100).toFixed(2)} ${pi.currency.toUpperCase()}`
                              : 'N/A'}
                          </TableCell>
                          <TableCell>{pi.status}</TableCell>
                          <TableCell>{new Date(pi.created * 1000).toLocaleString()}</TableCell>
                          <TableCell>{pi.receipt_email || pi.customer || 'N/A'}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{pi.description || 'N/A'}</TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Aucune transaction trouvée.
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

export default AdminStripeTransactionsPage;