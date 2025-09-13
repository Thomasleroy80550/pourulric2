import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getTransferSummaries, UserTransferSummary, updateTransferStatus, getInvoiceById, SavedInvoice, initiateStripePayout } from '@/lib/admin-api';
import { Terminal, Banknote, CheckCircle2, Loader2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import StatementDetailsDialog from '@/components/StatementDetailsDialog'; // Import the dialog
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const AdminTransferSummaryPage: React.FC = () => {
  const [summaries, setSummaries] = useState<UserTransferSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false); // State for dialog visibility
  const [selectedStatement, setSelectedStatement] = useState<SavedInvoice | null>(null); // State for selected statement
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [payingUserId, setPayingUserId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = async (invoiceId: string, newStatus: boolean) => {
    const originalSummaries = JSON.parse(JSON.stringify(summaries));
    
    // Optimistic UI update
    setSummaries(currentSummaries => 
      currentSummaries.map(summary => ({
        ...summary,
        details: summary.details.map(detail => 
          detail.invoice_id === invoiceId ? { ...detail, transfer_completed: newStatus } : detail
        )
      }))
    );

    try {
      await updateTransferStatus(invoiceId, newStatus);
      toast.success("Statut du virement mis à jour.");
    } catch (err: any) {
      toast.error("Erreur lors de la mise à jour du statut.");
      // Revert UI on error
      setSummaries(originalSummaries);
    }
  };

  const handleViewDetails = async (invoiceId: string) => {
    try {
      const invoice = await getInvoiceById(invoiceId);
      if (invoice) {
        setSelectedStatement(invoice);
        setIsDetailsDialogOpen(true);
      } else {
        toast.error("Relevé introuvable.");
      }
    } catch (err: any) {
      toast.error(`Erreur lors de la récupération du détail du relevé : ${err.message}`);
    }
  };

  const handlePayWithStripe = async (summary: UserTransferSummary) => {
    if (!summary.stripe_account_id) {
      toast.error("Ce client n'a pas de compte Stripe lié.");
      return;
    }

    setPayingUserId(summary.user_id);
    try {
      const amountInCents = Math.round(summary.total_amount_to_transfer * 100);
      const invoiceDetails = summary.details
        .filter(d => !d.transfer_completed)
        .map(d => ({ id: d.invoice_id, period: d.period })); // Récupérer l'ID et la période

      await initiateStripePayout({
        destinationAccountId: summary.stripe_account_id,
        amount: amountInCents,
        currency: 'eur', // ou la devise appropriée
        invoiceDetails: invoiceDetails, // Passer les détails des factures
      });

      toast.success(`Virement de ${summary.total_amount_to_transfer.toFixed(2)} € initié pour ${summary.first_name} ${summary.last_name}.`);
      fetchData(); // Refresh data
    } catch (error: any) {
      toast.error(`Échec du virement : ${error.message}`);
    } finally {
      setPayingUserId(null);
    }
  };

  const totalPendingAmount = summaries.reduce((acc, summary) => {
    const userPendingTotal = summary.details
      .filter(detail => !detail.transfer_completed)
      .reduce((userAcc, detail) => userAcc + detail.amount, 0);
    return acc + userPendingTotal;
  }, 0);

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
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <p className="text-lg font-semibold text-gray-800">
                    Total restant à virer (tous clients) : 
                    <span className="text-green-600 font-bold ml-2">{totalPendingAmount.toFixed(2)}€</span>
                  </p>
                </div>

                {summaries.length > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    {summaries.map((summary) => {
                      const allTransfersDone = summary.details.every(d => d.transfer_completed);
                      const userPendingAmount = summary.details
                        .filter(d => !d.transfer_completed)
                        .reduce((acc, d) => acc + d.amount, 0);

                      return (
                        <AccordionItem value={summary.user_id} key={summary.user_id}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex justify-between w-full pr-4 items-center">
                              <div className="flex items-center gap-2">
                                {allTransfersDone && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                                <span className={cn("font-medium text-left", allTransfersDone && "text-gray-400")}>
                                  {summary.first_name} {summary.last_name}
                                </span>
                              </div>
                              <span className={cn("font-bold text-lg", allTransfersDone ? "text-gray-400 line-through" : "text-green-600")}>
                                {userPendingAmount.toFixed(2)}€
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Client</TableHead>
                                  <TableHead>Montant Total à Virer</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {summary.details.map((detail) => (
                                  <TableRow key={detail.invoice_id} className={cn(detail.transfer_completed && "bg-green-50/50 text-gray-500")}>
                                    <TableCell className="font-medium">{summary.first_name} {summary.last_name}</TableCell>
                                    <TableCell>{summary.total_amount_to_transfer.toFixed(2)} €</TableCell>
                                    <TableCell className="text-right">
                                      {summary.stripe_account_id && (
                                        <Button
                                          size="sm"
                                          onClick={() => handlePayWithStripe(summary)}
                                          disabled={payingUserId === summary.user_id}
                                        >
                                          {payingUserId === summary.user_id ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          ) : (
                                            <Banknote className="mr-2 h-4 w-4" />
                                          )}
                                          Payer via Stripe
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                              <TableFooter>
                                <TableRow className="bg-gray-100 font-bold">
                                  <TableCell>Total pour {summary.first_name}</TableCell>
                                  <TableCell className="text-right font-mono">
                                    {summary.details.reduce((acc, d) => acc + (d.amountsBySource?.airbnb || 0), 0).toFixed(2)}€
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {summary.details.reduce((acc, d) => acc + (d.amountsBySource?.stripe || 0), 0).toFixed(2)}€
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {summary.details.reduce((acc, d) => acc + d.amount, 0).toFixed(2)}€
                                  </TableCell>
                                  <TableCell></TableCell>
                                  <TableCell></TableCell> {/* Empty cell for the new Actions column */}
                                </TableRow>
                              </TableFooter>
                            </Table>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    Aucun virement à effectuer pour le moment.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <StatementDetailsDialog
        isOpen={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        statement={selectedStatement}
      />
    </AdminLayout>
  );
};

export default AdminTransferSummaryPage;