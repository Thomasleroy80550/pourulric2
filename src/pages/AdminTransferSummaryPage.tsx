import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getTransferSummaries, UserTransferSummary, updateTransferStatus, getInvoiceById, SavedInvoice, initiateStripePayout, reconcileStripeTransfers } from '@/lib/admin-api';
import { Terminal, Banknote, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import StatementDetailsDialog from '@/components/StatementDetailsDialog'; // Import the dialog
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StripePayoutDialog from '@/components/admin/StripePayoutDialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'; // Import Tabs components
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input'; // Import Input component

const AdminTransferSummaryPage: React.FC = () => {
  const [summaries, setSummaries] = useState<UserTransferSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false); // State for dialog visibility
  const [selectedStatement, setSelectedStatement] = useState<SavedInvoice | null>(null); // State for selected statement
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [payingUserId, setPayingUserId] = useState<string | null>(null);
  const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false);
  const [summaryForPayout, setSummaryForPayout] = useState<UserTransferSummary | null>(null);
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<'all' | 'crotoy' | 'berck'>('all'); // New state for property filter
  const [isReconciling, setIsReconciling] = useState(false);
  const [showOnlyPending, setShowOnlyPending] = useState(true);
  const [searchQuery, setSearchQuery] = useState(''); // New state for search query

  const getPropertyName = (id: number | null | undefined) => {
    switch (id) {
      case 1: return 'Crotoy';
      case 2: return 'Berck';
      default: return 'Inconnu';
    }
  };

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

  const handlePayWithStripeClick = (summary: UserTransferSummary) => {
    if (!summary.stripe_account_id) {
      toast.error("Ce client n'a pas de compte Stripe lié.");
      return;
    }
    setSummaryForPayout(summary);
    setIsPayoutDialogOpen(true);
  };

  const handleConfirmPayout = async (description: string) => {
    if (!summaryForPayout || !summaryForPayout.stripe_account_id) {
      toast.error("Erreur : Données de virement manquantes.");
      return;
    }

    setPayingUserId(summaryForPayout.user_id);
    try {
      const stripeAmountToPay = summaryForPayout.details
        .filter(d => !d.transfer_completed)
        .reduce((acc, d) => acc + (d.amountsBySource['stripe'] || 0), 0);

      if (stripeAmountToPay <= 0) {
        toast.error("Aucun montant Stripe à virer pour ce client.");
        setPayingUserId(null);
        return;
      }

      const amountInCents = Math.round(stripeAmountToPay * 100);
      const invoiceIds = summaryForPayout.details.filter(d => !d.transfer_completed).map(d => d.invoice_id);

      await initiateStripePayout({
        destinationAccountId: summaryForPayout.stripe_account_id,
        amount: amountInCents,
        currency: 'eur',
        invoiceIds: invoiceIds,
        description: description,
      });

      toast.success(`Virement Stripe de ${stripeAmountToPay.toFixed(2)} € initié pour ${summaryForPayout.first_name} ${summaryForPayout.last_name}.`);
      fetchData(); // Refresh data
    } catch (error: any) {
      toast.error(`Échec du virement : ${error.message}`);
    } finally {
      setPayingUserId(null);
      setSummaryForPayout(null);
    }
  };

  const handleReconcile = async () => {
    setIsReconciling(true);
    const toastId = toast.loading("Rapprochement avec Stripe en cours...");
    try {
      const result = await reconcileStripeTransfers();
      if (result.updatedCount > 0) {
        toast.success(`${result.updatedCount} relevé(s) ont été rapprochés avec succès.`, { id: toastId });
        fetchData(); // Refresh data to show changes
      } else {
        toast.info("Aucun nouveau virement à rapprocher. Tout est à jour.", { id: toastId });
      }
    } catch (error: any) {
      toast.error(`Erreur lors du rapprochement : ${error.message}`, { id: toastId });
    } finally {
      setIsReconciling(false);
    }
  };

  const filteredSummaries = summaries
    .filter(summary => {
      // Filter by search query
      const fullName = `${summary.first_name} ${summary.last_name}`.toLowerCase();
      if (searchQuery && !fullName.includes(searchQuery.toLowerCase())) {
        return false;
      }

      // First, filter by property
      const matchesProperty = selectedPropertyFilter === 'all' || summary.details.some(detail => {
        const propertyId = selectedPropertyFilter === 'crotoy' ? 1 : 2;
        if (propertyId === 2 && (detail.krossbooking_property_id === null || detail.krossbooking_property_id === undefined)) {
          return true;
        }
        return detail.krossbooking_property_id === propertyId;
      });

      if (!matchesProperty) return false;

      // Then, if showOnlyPending is true, check for pending transfers within the filtered property scope
      if (showOnlyPending) {
        return summary.details.some(detail => {
          const matchesPropertyForDetail = selectedPropertyFilter === 'all' ||
            (selectedPropertyFilter === 'crotoy' && detail.krossbooking_property_id === 1) ||
            (selectedPropertyFilter === 'berck' && (detail.krossbooking_property_id === 2 || detail.krossbooking_property_id === null || detail.krossbooking_property_id === undefined));
          
          return !detail.transfer_completed && matchesPropertyForDetail;
        });
      }

      return true; // If not showOnlyPending, just return true if property matches
    });

  const totalPendingAmount = filteredSummaries.reduce((acc, summary) => {
    const userPendingTotal = summary.details
      .filter(detail => !detail.transfer_completed && 
        (selectedPropertyFilter === 'all' || 
         (selectedPropertyFilter === 'crotoy' && detail.krossbooking_property_id === 1) ||
         (selectedPropertyFilter === 'berck' && (detail.krossbooking_property_id === 2 || detail.krossbooking_property_id === null || detail.krossbooking_property_id === undefined))))
      .reduce((userAcc, detail) => userAcc + detail.amount, 0);
    return acc + userPendingTotal;
  }, 0);

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Banknote className="h-8 w-8" />
                <div>
                  <CardTitle>Synthèse des Virements</CardTitle>
                  <CardDescription>
                    Cette page récapitule le montant total à virer à chaque client, avec le détail par période.
                  </CardDescription>
                </div>
              </div>
              <Button onClick={handleReconcile} disabled={isReconciling}>
                {isReconciling ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Rapprochement Stripe
              </Button>
            </div>
            <div className="flex items-center justify-between mt-4">
              <Tabs value={selectedPropertyFilter} onValueChange={(value) => setSelectedPropertyFilter(value as 'all' | 'crotoy' | 'berck')}>
                <TabsList>
                  <TabsTrigger value="all">Toutes les propriétés</TabsTrigger>
                  <TabsTrigger value="crotoy">Crotoy</TabsTrigger>
                  <TabsTrigger value="berck">Berck</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-only-pending"
                  checked={showOnlyPending}
                  onCheckedChange={setShowOnlyPending}
                />
                <Label htmlFor="show-only-pending">Afficher uniquement les virements en attente</Label>
              </div>
            </div>
            <div className="mt-4">
              <Input
                placeholder="Rechercher par nom de client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
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
                    Total restant à virer ({selectedPropertyFilter === 'all' ? 'toutes propriétés' : getPropertyName(selectedPropertyFilter === 'crotoy' ? 1 : 2)}) : 
                    <span className="text-green-600 font-bold ml-2">{totalPendingAmount.toFixed(2)}€</span>
                  </p>
                </div>

                {filteredSummaries.length > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    {filteredSummaries.map((summary) => {
                      const allTransfersDone = summary.details.every(d => d.transfer_completed);
                      const userPendingAmount = summary.details
                        .filter(d => !d.transfer_completed && 
                          (selectedPropertyFilter === 'all' || 
                           (selectedPropertyFilter === 'crotoy' && d.krossbooking_property_id === 1) ||
                           (selectedPropertyFilter === 'berck' && (d.krossbooking_property_id === 2 || d.krossbooking_property_id === null || d.krossbooking_property_id === undefined))))
                        .reduce((acc, d) => acc + d.amount, 0);

                      // Only render if there's a pending amount for the selected filter and we are showing only pending
                      if (showOnlyPending && userPendingAmount === 0 && selectedPropertyFilter !== 'all') return null;

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
                              <span className={cn("font-bold text-lg", userPendingAmount === 0 ? "text-gray-400 line-through" : "text-green-600")}>
                                {userPendingAmount.toFixed(2)}€
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Client</TableHead>
                                  <TableHead>Montant (Détail)</TableHead>
                                  <TableHead>Propriété</TableHead>
                                  <TableHead>Statut</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {summary.details
                                  .filter(detail => 
                                    selectedPropertyFilter === 'all' || 
                                    (selectedPropertyFilter === 'crotoy' && detail.krossbooking_property_id === 1) ||
                                    (selectedPropertyFilter === 'berck' && (detail.krossbooking_property_id === 2 || detail.krossbooking_property_id === null || detail.krossbooking_property_id === undefined))
                                  )
                                  .map((detail) => (
                                  <TableRow key={detail.invoice_id} className={cn(detail.transfer_completed && "bg-green-50/50 text-gray-500")}>
                                    <TableCell className="font-medium">{summary.first_name} {summary.last_name}</TableCell>
                                    <TableCell>
                                      <div className="flex flex-col items-start">
                                        <span className="font-semibold">{detail.amount.toFixed(2)} €</span>
                                        {Object.entries(detail.amountsBySource).map(([source, amount]) => (
                                          <Badge key={source} variant="secondary" className="mt-1 mr-1">
                                            {source.charAt(0).toUpperCase() + source.slice(1)}: {amount.toFixed(2)}€
                                          </Badge>
                                        ))}
                                      </div>
                                    </TableCell>
                                    <TableCell>{getPropertyName(detail.krossbooking_property_id)}</TableCell>
                                    <TableCell>
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`transfer-completed-${detail.invoice_id}`}
                                          checked={detail.transfer_completed}
                                          onCheckedChange={(checked) => handleStatusChange(detail.invoice_id, checked as boolean)}
                                        />
                                        <label
                                          htmlFor={`transfer-completed-${detail.invoice_id}`}
                                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                          {detail.transfer_completed ? 'Effectué' : 'En attente'}
                                        </label>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {summary.stripe_account_id && (
                                        <Button
                                          size="sm"
                                          onClick={() => handlePayWithStripeClick(summary)}
                                          disabled={payingUserId === summary.user_id || detail.transfer_completed}
                                        >
                                          {payingUserId === summary.user_id ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          ) : (
                                            <Banknote className="mr-2 h-4 w-4" />
                                          )}
                                          Payer via Stripe
                                        </Button>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="ml-2"
                                        onClick={() => handleViewDetails(detail.invoice_id)}
                                      >
                                        Voir le relevé
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                              <TableFooter>
                                <TableRow className="bg-gray-100 font-bold">
                                  <TableCell colSpan={3}>Total pour {summary.first_name}</TableCell>
                                  <TableCell></TableCell> {/* Cellule vide pour la colonne Statut */}
                                  <TableCell className="text-right">
                                    {userPendingAmount.toFixed(2)}€
                                  </TableCell>
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
                    Aucun virement à afficher pour les filtres sélectionnés.
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
      <StripePayoutDialog
        isOpen={isPayoutDialogOpen}
        onOpenChange={setIsPayoutDialogOpen}
        summary={summaryForPayout}
        onConfirm={handleConfirmPayout}
      />
    </AdminLayout>
  );
};

export default AdminTransferSummaryPage;