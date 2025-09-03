import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, FileText, DollarSign, Loader2, Terminal, Pencil, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import EditReservationDialog from '@/components/EditReservationDialog';
import { getAllProfiles } from '@/lib/admin-api';
import { UserProfile } from '@/lib/profile-api';
import { useInvoiceGeneration, ProcessedReservation } from '@/contexts/InvoiceGenerationContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const AdminInvoiceGenerationPage: React.FC = () => {
  const {
    file, setFile,
    processedData, setProcessedData,
    totalCommission,
    totalPrixSejour,
    totalFraisMenage,
    totalTaxeDeSejour,
    totalRevenuGenere,
    totalMontantVerse,
    totalNuits,
    totalVoyageurs,
    isLoading,
    error,
    fileName, setFileName,
    selectedClientId, setSelectedClientId,
    invoicePeriod, setInvoicePeriod,
    helloKeysCollectsRent, setHelloKeysCollectsRent,
    selectedReservations, setSelectedReservations,
    paymentSources, setPaymentSources,
    deductInvoice, setDeductInvoice,
    deductionSource, setDeductionSource,
    transfersBySource,
    ownerCleaningFee, setOwnerCleaningFee, // Get from context
    recalculateTotals,
    processFile,
    handleGenerateInvoice,
  } = useInvoiceGeneration();

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<{ data: ProcessedReservation; index: number } | null>(null);
  const [open, setOpen] = useState(false); // State for combobox open/close

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoadingProfiles(true);
      try {
        const fetchedProfiles = await getAllProfiles();
        setProfiles(fetchedProfiles);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoadingProfiles(false);
      }
    };
    fetchProfiles();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const selectedProfile = profiles.find(p => p.id === selectedClientId);
      const commissionRate = selectedProfile?.commission_rate || 0.26;
      if (!selectedProfile?.commission_rate) {
        toast.warning(`Taux de commission non trouvé pour le client, utilisation de la valeur par défaut de 26%.`);
      }
      setFile(selectedFile);
      setFileName(selectedFile.name);
      processFile(selectedFile, commissionRate);
    }
  };

  const handleEditClick = (reservation: ProcessedReservation, index: number) => {
    setEditingReservation({ data: reservation, index });
    setIsEditDialogOpen(true);
  };

  const handleUpdateReservation = (updatedData: Omit<ProcessedReservation, 'revenuGenere' | 'commissionHelloKeys' | 'montantVerse' | 'nuits' | 'voyageurs'>, index: number) => {
    const newData = [...processedData];
    const originalReservation = newData[index];

    if (originalReservation) {
      const selectedProfile = profiles.find(p => p.id === selectedClientId);
      const commissionRate = selectedProfile?.commission_rate || 0.26;

      const montantVerse = updatedData.prixSejour + updatedData.fraisMenage + updatedData.taxeDeSejour - originalReservation.originalCommissionPlateforme - originalReservation.originalFraisPaiement;
      const revenuGenere = montantVerse - updatedData.fraisMenage - updatedData.taxeDeSejour;
      const commissionHelloKeys = revenuGenere * commissionRate;

      newData[index] = {
        ...originalReservation,
        ...updatedData,
        revenuGenere,
        commissionHelloKeys,
        montantVerse,
      };

      setProcessedData(newData);
      recalculateTotals(newData);
      setIsEditDialogOpen(false);
      toast.success("Réservation mise à jour avec succès !");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIndices = new Set(processedData.map((_, index) => index));
      setSelectedReservations(allIndices);
    } else {
      setSelectedReservations(new Set());
    }
  };

  const totalFacture = totalCommission + totalFraisMenage + ownerCleaningFee; // Updated calculation for display
  const factureHT = totalFacture / 1.2;
  const tva = totalFacture - factureHT;

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Génération de Facture Manuelle</h1>
        
        {error && <Alert variant="destructive" className="mb-4"><Terminal className="h-4 w-4" /><AlertTitle>Erreur</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-md">
              <CardHeader><CardTitle>1. Client & Période</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {loadingProfiles ? <Skeleton className="h-24 w-full" /> : (
                  <>
                    <div>
                      <Label htmlFor="client-select">Sélectionner un client</Label>
                      <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-between"
                          >
                            {selectedClientId
                              ? profiles.find((profile) => profile.id === selectedClientId)?.first_name + " " + profiles.find((profile) => profile.id === selectedClientId)?.last_name
                              : "Choisir un client..."}
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Rechercher un client..." />
                            <CommandList>
                              <CommandEmpty>Aucun client trouvé.</CommandEmpty>
                              <CommandGroup>
                                {profiles.map((profile) => (
                                  <CommandItem
                                    key={profile.id}
                                    value={`${profile.first_name} ${profile.last_name}`} // Value for search
                                    onSelect={() => {
                                      setSelectedClientId(profile.id === selectedClientId ? "" : profile.id);
                                      setOpen(false);
                                    }}
                                  >
                                    {profile.first_name} {profile.last_name}
                                    <Check
                                      className={cn(
                                        "ml-auto h-4 w-4",
                                        profile.id === selectedClientId ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label htmlFor="invoice-period">Période de facturation</Label>
                      <Input id="invoice-period" placeholder="Ex: Juillet 2024" value={invoicePeriod} onChange={(e) => setInvoicePeriod(e.target.value)} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader><CardTitle>2. Importer le relevé</CardTitle><CardDescription>Importez le fichier Excel (.xlsx) de Krossbooking.</CardDescription></CardHeader>
              <CardContent>
                <Label htmlFor="file-upload" className={`cursor-pointer flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg ${!selectedClientId || !invoicePeriod ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  <Upload className="h-8 w-8 text-gray-500 mb-2" /><span className="text-sm text-gray-500">{!selectedClientId || !invoicePeriod ? 'Sélectionnez d\'abord un client et une période' : 'Cliquez pour choisir un fichier'}</span>
                </Label>
                <Input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".xlsx, .xls" disabled={!selectedClientId || !invoicePeriod} />
                {fileName && <p className="text-sm text-center text-gray-600 dark:text-gray-400 mt-2">Fichier: {fileName}</p>}
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader><CardTitle>3. Résumé & Facturation</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? <div className="flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div> : (
                  <>
                    <div className="text-sm space-y-1">
                      <p>Total Commission (TTC): <span className="font-bold">{totalCommission.toFixed(2)}€</span></p>
                      <p>Total Frais de Ménage (TTC): <span className="font-bold">{totalFraisMenage.toFixed(2)}€</span></p>
                      <div className="space-y-2">
                        <Label htmlFor="owner-cleaning-fee">Frais de ménage propriétaire (TTC)</Label>
                        <Input
                          id="owner-cleaning-fee"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={ownerCleaningFee === 0 ? '' : ownerCleaningFee}
                          onChange={(e) => setOwnerCleaningFee(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <p>Facture HT: <span className="font-bold">{factureHT.toFixed(2)}€</span></p>
                      <p>TVA (20%): <span className="font-bold">{tva.toFixed(2)}€</span></p>
                    </div>
                    <div className="text-center border-t pt-4">
                      <p className="text-sm text-gray-500">Total Facture TTC</p>
                      <p className="text-4xl font-bold text-green-600">{totalFacture.toFixed(2)}€</p>
                    </div>
                    <div className="space-y-4 border-t pt-4">
                      <div className="flex items-center space-x-2"><Checkbox id="collectsRent" checked={helloKeysCollectsRent} onCheckedChange={(checked) => setHelloKeysCollectsRent(!!checked)} /><Label htmlFor="collectsRent">Hello Keys perçoit les loyers ?</Label></div>
                      {helloKeysCollectsRent && (
                        <>
                          <div className="space-y-2"><Label>Sources de paiement</Label><ToggleGroup type="multiple" value={paymentSources} onValueChange={setPaymentSources}><ToggleGroupItem value="stripe">Stripe</ToggleGroupItem><ToggleGroupItem value="airbnb">Airbnb</ToggleGroupItem></ToggleGroup></div>
                          <div className="flex items-center space-x-2"><Checkbox id="deductInvoice" checked={deductInvoice} onCheckedChange={(checked) => setDeductInvoice(!!checked)} /><Label htmlFor="deductInvoice">Déduire la facture des loyers ?</Label></div>
                          {deductInvoice && (
                            <div className="space-y-2"><Label>Déduire sur</Label><Select value={deductionSource} onValueChange={setDeductionSource}><SelectTrigger><SelectValue placeholder="Choisir une source" /></SelectTrigger><SelectContent>{paymentSources.map(source => <SelectItem key={source} value={source}>{source.charAt(0).toUpperCase() + source.slice(1)}</SelectItem>)}</SelectContent></Select></div>
                          )}
                        </>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="w-full" disabled={processedData.length === 0}>
                          <FileText className="h-4 w-4 mr-2" />
                          Actions
                          <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full">
                        <DropdownMenuItem onClick={() => handleGenerateInvoice(false)}>
                          Sauvegarder le Relevé
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGenerateInvoice(true)}>
                          Sauvegarder et Envoyer par Email
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-md">
              <CardHeader><CardTitle>4. Relevé Détaillé</CardTitle><CardDescription>Vérifiez les réservations et les commissions calculées.</CardDescription></CardHeader>
              <CardContent>
                <div className="overflow-x-auto h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {helloKeysCollectsRent && <TableHead><Checkbox onCheckedChange={(checked) => handleSelectAll(!!checked)} /></TableHead>}
                        <TableHead>Portail</TableHead>
                        <TableHead>Voyageur</TableHead>
                        <TableHead>Arrivée</TableHead>
                        <TableHead>Nuits</TableHead>
                        <TableHead>Voyageurs</TableHead>
                        <TableHead>Prix Séjour</TableHead>
                        <TableHead>Frais Ménage</TableHead>
                        <TableHead>Taxe Séjour</TableHead>
                        <TableHead>Revenu Généré</TableHead>
                        <TableHead>Montant Versé</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={helloKeysCollectsRent ? 13 : 12}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) : processedData.length > 0 ? processedData.map((row, index) => (
                        <TableRow key={index}>
                          {helloKeysCollectsRent && <TableCell><Checkbox checked={selectedReservations.has(index)} onCheckedChange={(checked) => { const newSet = new Set(selectedReservations); if (checked) newSet.add(index); else newSet.delete(index); setSelectedReservations(newSet); }} /></TableCell>}
                          <TableCell>{row.portail}</TableCell>
                          <TableCell>{row.voyageur}</TableCell>
                          <TableCell>{row.arrivee}</TableCell>
                          <TableCell>{row.nuits}</TableCell>
                          <TableCell>{row.voyageurs}</TableCell>
                          <TableCell>{row.prixSejour.toFixed(2)}€</TableCell>
                          <TableCell>{row.fraisMenage.toFixed(2)}€</TableCell>
                          <TableCell>{row.taxeDeSejour.toFixed(2)}€</TableCell>
                          <TableCell>{row.revenuGenere.toFixed(2)}€</TableCell>
                          <TableCell>{row.montantVerse.toFixed(2)}€</TableCell>
                          <TableCell>{row.commissionHelloKeys.toFixed(2)}€</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(row, index)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )) : <TableRow><TableCell colSpan={helloKeysCollectsRent ? 13 : 12} className="text-center text-gray-500 py-8">Aucun fichier importé.</TableCell></TableRow>}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="font-bold">
                        <TableCell colSpan={helloKeysCollectsRent ? 4 : 3}>Totaux</TableCell>
                        <TableCell>{totalNuits}</TableCell>
                        <TableCell>{totalVoyageurs}</TableCell>
                        <TableCell>{totalPrixSejour.toFixed(2)}€</TableCell>
                        <TableCell>{totalFraisMenage.toFixed(2)}€</TableCell>
                        <TableCell>{totalTaxeDeSejour.toFixed(2)}€</TableCell>
                        <TableCell>{totalRevenuGenere.toFixed(2)}€</TableCell>
                        <TableCell>{totalMontantVerse.toFixed(2)}€</TableCell>
                        <TableCell>{totalCommission.toFixed(2)}€</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {helloKeysCollectsRent && selectedReservations.size > 0 && (
              <Card className="shadow-md">
                <CardHeader><CardTitle>5. Virements à effectuer</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(transfersBySource).map(([source, data]) => data.reservations.length > 0 && (
                    <div key={source}>
                      <h3 className="font-semibold mb-2">Depuis {source.charAt(0).toUpperCase() + source.slice(1)}</h3>
                      <Table>
                        <TableHeader><TableRow><TableHead>Voyageur</TableHead><TableHead className="text-right">Montant à virer</TableHead></TableRow></TableHeader>
                        <TableBody>{data.reservations.map((r, i) => <TableRow key={i}><TableCell>{r.voyageur}</TableCell><TableCell className="text-right">{r.montantVerse.toFixed(2)}€</TableCell></TableRow>)}</TableBody>
                        <TableFooter><TableRow className="font-bold"><TableCell>Total à virer ({deductInvoice && deductionSource === source ? "facture déduite" : ""})</TableCell><TableCell className="text-right">{data.total.toFixed(2)}€</TableCell></TableRow></TableFooter>
                      </Table>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      <EditReservationDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        reservationData={editingReservation?.data || null}
        onSave={(updatedData) => {
          if (editingReservation) {
            handleUpdateReservation(updatedData, editingReservation.index);
          }
        }}
      />
    </AdminLayout>
  );
};

export default AdminInvoiceGenerationPage;