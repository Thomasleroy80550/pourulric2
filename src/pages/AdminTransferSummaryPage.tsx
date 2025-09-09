import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getTransferSummaries, UserTransferSummary } from '@/lib/admin-api';
import { Terminal, Banknote } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
                  Cette page récapitule le montant total à virer à chaque client, avec le détail par période.
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
            
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : summaries.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {summaries.map((summary) => (
                  <AccordionItem value={summary.user_id} key={summary.user_id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex justify-between w-full pr-4 items-center">
                        <span className="font-medium text-left">{summary.first_name} {summary.last_name}</span>
                        <span className="font-bold text-lg text-green-600">
                          {summary.total_amount_to_transfer.toFixed(2)}€
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Période du Relevé</TableHead>
                            <TableHead className="text-right">Montant à Virer</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summary.details.map((detail, index) => (
                            <TableRow key={index}>
                              <TableCell>{detail.period}</TableCell>
                              <TableCell className="text-right font-mono">{detail.amount.toFixed(2)}€</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Aucun virement à effectuer pour le moment.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminTransferSummaryPage;