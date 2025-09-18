import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getTransferSummaries, UserTransferSummary, updateInvoiceSourceTransferStatus, getInvoiceById, SavedInvoice, initiateStripePayout, reconcileStripeTransfers } from '@/lib/admin-api';
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

  const handleSourceStatusChange = async (invoiceId: string, source: string, newStatus: boolean) => {
    const originalSummaries = JSON.parse(JSON.stringify(summaries));
    
    // Optimistic UI update
    setSummaries(currentSummaries => 
      currentSummaries.map(summary => ({
        ...summary,
        details: summary.details.map(detail => {
          if (detail.invoice_id === invoiceId) {
            const newStatuses = { ...(detail.transfer_statuses || {}), [source]: newStatus };
            return { ...detail, transfer_statuses: newStatuses };
          }
          return detail;
        })
      }))
    );

    try {
      await updateInvoiceSourceTransferStatus(invoiceId, source, newStatus);
      toast.success(`Statut du virement pour "${source}" mis à jour.`);
    } catch (err: any) {
      toast.error(`Erreur lors de la mise à jour du statut pour "${source}".`);
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
        .filter(d => !d.transfer_statuses?.stripe)
        .reduce((acc, d) => acc + (d.amountsBySource['stripe'] || 0), 0);

      if (stripeAmountToPay <= 0) {
        toast.error("Aucun montant Stripe à virer pour ce client.");
        setPayingUserId(null);
        return;
      }

      const amountInCents = Math.round(stripeAmountToPay * 100);
      const invoiceIds = summaryForPayout.details.filter(d => !d.transfer_statuses?.stripe).map(d => d.invoice_id);

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
      // 1. Filter by search query
      const fullName = `${summary.first_name} ${summary.last_name}`.toLowerCase();
      if (searchQuery && !fullName.includes(searchQuery.toLowerCase())) {
        return false;
      }

      // 2. Filter by user's primary property (from their profile)
      const userPropertyId = summary.krossbooking_property_id;
      const isUserPropertyMatch = selectedPropertyFilter === 'all' ||
        (selectedPropertyFilter === 'crotoy' && userPropertyId === 1) ||
        (selectedPropertyFilter === 'berck' && userPropertyId === 2);

      if (!isUserPropertyMatch) {
        return false;
      }

      // 3. If showing only pending, check if there's any pending amount for this user from any source
      if (showOnlyPending) {
        const hasAnyPendingAmount = summary.details.some(detail => {
          return Object.entries(detail.amountsBySource).some(([source, amount]) => {
            return !detail.transfer_statuses?.[source] && amount > 0;
          });
        });
        return hasAnyPendingAmount;
      }

      return true;
    });

  // Calculer les totaux par source
  const totalsBySource = filteredSummaries.reduce((acc, summary) => {
    summary.details.forEach(detail => {
      Object.entries(detail.amountsBySource).forEach(([source, amount]) => {
        if (!detail.transfer_statuses?.[source] && amount > 0) {
          if (!acc[source]) {
            acc[source] = 0;
          }
          acc[source] += amount;
        }
      });
    });
    return acc;
  }, {} as { [key: string]: number });

  const totalPendingAmount = Object.values(totalsBySource).reduce((sum, amount) => sum + amount, 0);

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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total général restant</p>
                      <p className="text-2xl font-bold text-green-600">{totalPendingAmount.toFixed(2)}€</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total Stripe restant</p>
                      <p className="text-2xl font-bold text-blue-600">{totalsBySource.stripe?.toFixed(2) || '0.00'}€</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total Airbnb restant</p>
                      <p className="text-2xl font-bold text-red-600">{totalsBySource.airbnb?.toFixed(2) || '0.00'}€</p>
                    </div>
                  </div>
                  {Object.keys(totalsBySource).length > 2 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600 mb-2">Autres sources :</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(totalsBySource)
                          .filter(([source]) => source !== 'stripe' && source !== 'airbnb')
                          .map(([source, amount]) => (
                            <span key={source} className="px-2 py-1 bg-gray-200 rounded text-sm">
                              {source.charAt(0).toUpperCase() + source.slice(1)}: {amount.toFixed(2)}€
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {filteredSummaries.length > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    {filteredSummaries.map((summary) => {
                      // Calculate allTransfersDone based on all details, not just filtered ones
                      const allTransfersDone = summary.details.every(d => 
                        Object.keys(d.amountsBySource).every(source => d.transfer_statuses?.[source])
                      );
                      
                      // Calculate userPendingAmount based on details matching the current property filter
                      const userPendingTotalAmount = summary.details.reduce((userAcc, detail) => {
                        let detailPendingAmount = 0;
                        for (const [source, amount] of Object.entries(detail.amountsBySource)) {
                          if (!detail.transfer_statuses?.[source]) {
                            detailPendingAmount += amount;
                          }
                        }
                        return userAcc + detailPendingAmount;
                      }, 0);

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
                              <span className={cn("font-bold text-lg", userPendingTotalAmount === 0 ? "text-gray-400 line-through" : "text-green-600")}>
                                {userPendingTotalAmount.toFixed(2)}€
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Période</TableHead>
                                  <TableHead>Source</TableHead>
                                  <TableHead>Montant</TableHead>
                                  <TableHead>Statut Virement</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {summary.details
                                  .filter(detail => 
                                    (selectedPropertyFilter === 'all' || 
                                     (selectedPropertyFilter === 'crotoy' && summary.krossbooking_property_id === 1) ||
                                     (selectedPropertyFilter === 'berck' && summary.krossbooking_property_id === 2))
                                  )
                                  .flatMap((detail) => 
                                    Object.entries(detail.amountsBySource).map(([source, amount], index) => {
                                      const isCompleted = detail.transfer_statuses?.[source] ?? false;
                                      const sourceCapitalized = source.charAt(0).toUpperCase() + source.slice(1);
                                      return (
                                        <TableRow key={`${detail.invoice_id}-${source}`} className={cn(isCompleted && "bg-green-50/50 text-gray-500")}>
                                          {index === 0 && (
                                            <TableCell rowSpan={Object.keys(detail.amountsBySource).length} className="font-medium align-top border-b">
                                              {detail.period}
                                            </TableCell>
                                          )}
                                          <TableCell>{sourceCapitalized}</TableCell>
                                          <TableCell>{amount.toFixed(2)} €</TableCell>
                                          <TableCell>
                                            <div className="flex items-center space-x-2">
                                              <Checkbox
                                                id={`transfer-completed-${detail.invoice_id}-${source}`}
                                                checked={isCompleted}
                                                onCheckedChange={(checked) => handleSourceStatusChange(detail.invoice_id, source, checked as boolean)}
                                              />
                                              <label
                                                htmlFor={`transfer-completed-${detail.invoice_id}-${source}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                              >
                                                {isCompleted ? 'Effectué' : 'En attente'}
                                              </label>
                                            </div>
                                          </TableCell>
                                          {index === 0 && (
                                            <TableCell rowSpan={Object.keys(detail.amountsBySource).length} className="text-right align-top border-b">
                                              {summary.stripe_account_id && (detail.amountsBySource['stripe'] || 0) > 0 && (
                                                <Button
                                                  size="sm"
                                                  onClick={() => handlePayWithStripeClick(summary)}
                                                  disabled={payingUserId === summary.user_id || detail.transfer_statuses?.stripe}
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
                                          )}
                                        </TableRow>
                                      );
                                    })
                                  )}
                              </TableBody>
                              <TableFooter>
                                <TableRow className="bg-gray-100 font-bold">
                                  <TableCell colSpan={4}>Total restant pour {summary.first_name}</TableCell>
                                  <TableCell className="text-right">
                                    {userPendingTotalAmount.toFixed(2)}€
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