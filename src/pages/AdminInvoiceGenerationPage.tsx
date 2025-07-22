import React, { useState, useMemo, useCallback, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, FileText, DollarSign, Loader2, Terminal, Pencil } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EditReservationDialog from '@/components/EditReservationDialog';
import { getAllProfiles, saveInvoice } from '@/lib/admin-api';
import { UserProfile } from '@/lib/profile-api';

// Interface for a processed reservation row
interface ProcessedReservation {
  portail: string;
  voyageur: string;
  arrivee: string;
  depart: string;
  prixSejour: number;
  fraisMenage: number;
  taxeDeSejour: number;
  revenuNet: number;
  commissionHelloKeys: number;
  montantVerse: number;
  // Original data for recalculation
  originalTotalPaye: number;
  originalCommissionPlateforme: number;
  originalFraisPaiement: number;
}

const AdminInvoiceGenerationPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedReservation[]>([]);
  const [totalCommission, setTotalCommission] = useState(0);
  const [totalPrixSejour, setTotalPrixSejour] = useState(0);
  const [totalFraisMenage, setTotalFraisMenage] = useState(0);
  const [totalTaxeDeSejour, setTotalTaxeDeSejour] = useState(0);
  const [totalRevenuNet, setTotalRevenuNet] = useState(0);
  const [totalMontantVerse, setTotalMontantVerse] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');

  // New states for client selection and invoice period
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [invoicePeriod, setInvoicePeriod] = useState<string>('');
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  // States for advanced features
  const [helloKeysCollectsRent, setHelloKeysCollectsRent] = useState(false);
  const [selectedReservations, setSelectedReservations] = useState<Set<number>>(new Set());
  const [paymentSources, setPaymentSources] = useState<string[]>([]);
  const [deductInvoice, setDeductInvoice] = useState(false);
  const [deductionSource, setDeductionSource] = useState('');

  // States for editing
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<{ data: ProcessedReservation; index: number } | null>(null);

  useEffect(() => {
    const fetchProfiles = async () => {
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

  const resetState = () => {
    setFile(null);
    setFileName('');
    setProcessedData([]);
    setTotalCommission(0);
    setTotalPrixSejour(0);
    setTotalFraisMenage(0);
    setTotalTaxeDeSejour(0);
    setTotalRevenuNet(0);
    setTotalMontantVerse(0);
    setSelectedReservations(new Set());
  };

  const recalculateTotals = useCallback((data: ProcessedReservation[]) => {
    let commissionSum = 0, prixSejourSum = 0, fraisMenageSum = 0, taxeDeSejourSum = 0, revenuNetSum = 0, montantVerseSum = 0;
    data.forEach(row => {
      commissionSum += row.commissionHelloKeys;
      prixSejourSum += row.prixSejour;
      fraisMenageSum += row.fraisMenage;
      taxeDeSejourSum += row.taxeDeSejour;
      revenuNetSum += row.revenuNet;
      montantVerseSum += row.montantVerse;
    });
    setTotalCommission(commissionSum);
    setTotalPrixSejour(prixSejourSum);
    setTotalFraisMenage(fraisMenageSum);
    setTotalTaxeDeSejour(taxeDeSejourSum);
    setTotalRevenuNet(revenuNetSum);
    setTotalMontantVerse(montantVerseSum);
  }, []);

  const processFile = async (fileToProcess: File) => {
    setIsLoading(true);
    setError(null);
    setProcessedData([]);
    setSelectedReservations(new Set());

    try {
      const data = await fileToProcess.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheetName = workbook.SheetNames[0];
      if (!worksheetName) throw new Error("Le fichier Excel ne contient aucune feuille de calcul.");
      const worksheet = workbook.Sheets[worksheetName];
      const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

      if (!json || json.length < 2) throw new Error("Le fichier Excel est vide ou ne contient pas de données.");

      json.splice(0, 1); // Remove header

      const processedReservations: ProcessedReservation[] = [];

      json.forEach((row, index) => {
        try {
          if (!Array.isArray(row) || row.length < 40) return; // Check up to column AN
          if ((row[18] || '').toUpperCase() === 'PROPRIETAIRE') return;

          const portail = row[16] || 'N/A';
          const prixSejour = parseFloat(row[23]) || 0; // Colonne X
          const taxeDeSejour = parseFloat(row[24]) || 0; // Colonne Y
          const fraisMenage = parseFloat(row[25]) || 0; // Colonne Z
          const commissionPlateforme = parseFloat(row[38]) || 0; // Colonne AM (Frais OTA)
          const fraisPaiement = parseFloat(row[39]) || 0; // Colonne AN

          const commissionHelloKeys = prixSejour * 0.26;
          const revenuNet = prixSejour - commissionPlateforme - fraisPaiement; // Still useful for statement
          const montantVerse = prixSejour + fraisMenage + taxeDeSejour - commissionPlateforme - fraisPaiement;

          processedReservations.push({
            portail,
            voyageur: row[18] || '',
            arrivee: row[2] || '',
            depart: row[3] || '',
            prixSejour,
            fraisMenage,
            taxeDeSejour,
            revenuNet,
            commissionHelloKeys,
            montantVerse,
            originalTotalPaye: parseFloat(row[22]) || 0, // Keep for reference if needed
            originalCommissionPlateforme: commissionPlateforme,
            originalFraisPaiement: fraisPaiement,
          });
        } catch (rowError: any) {
          toast.warning(`La ligne ${index + 2} a été ignorée en raison d'une erreur.`);
        }
      });

      setProcessedData(processedReservations);
      recalculateTotals(processedReservations);
      toast.success(`Fichier "${fileToProcess.name}" analysé avec succès !`);

    } catch (err: any) {
      setError(`Erreur lors du traitement du fichier : ${err.message}`);
      toast.error("Une erreur est survenue lors de l'analyse du fichier.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      processFile(selectedFile);
    }
  };

  const handleEditClick = (reservation: ProcessedReservation, index: number) => {
    setEditingReservation({ data: reservation, index });
    setIsEditDialogOpen(true);
  };

  const handleUpdateReservation = (updatedData: Omit<ProcessedReservation, 'revenuNet' | 'commissionHelloKeys' | 'montantVerse'>, index: number) => {
    const newData = [...processedData];
    const originalReservation = newData[index];

    if (originalReservation) {
      const commissionHelloKeys = updatedData.prixSejour * 0.26;
      const revenuNet = updatedData.prixSejour - originalReservation.originalCommissionPlateforme - originalReservation.originalFraisPaiement;
      const montantVerse = updatedData.prixSejour + updatedData.fraisMenage + updatedData.taxeDeSejour - originalReservation.originalCommissionPlateforme - originalReservation.originalFraisPaiement;

      newData[index] = {
        ...originalReservation,
        ...updatedData,
        revenuNet,
        commissionHelloKeys,
        montantVerse,
      };

      setProcessedData(newData);
      recalculateTotals(newData);
      setIsEditDialogOpen(false);
      toast.success("Réservation mise à jour avec succès !");
    }
  };

  const handleGenerateInvoice = async () => {
    if (!selectedClientId || !invoicePeriod || processedData.length === 0) {
      toast.error("Veuillez sélectionner un client, définir une période et importer un fichier.");
      return;
    }

    const totalsObject = {
      totalCommission,
      totalFraisMenage,
      totalPrixSejour,
      totalTaxeDeSejour,
      totalRevenuNet,
      totalMontantVerse,
      totalFacture: totalCommission + totalFraisMenage,
    };

    const payload = {
      user_id: selectedClientId,
      period: invoicePeriod,
      invoice_data: processedData,
      totals: totalsObject,
    };

    const promise = saveInvoice(payload);

    toast.promise(promise, {
      loading: 'Sauvegarde du relevé en cours...',
      success: () => {
        resetState();
        return 'Relevé sauvegardé avec succès !';
      },
      error: (err) => `Erreur: ${err.message}`,
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIndices = new Set(processedData.map((_, index) => index));
      setSelectedReservations(allIndices);
    } else {
      setSelectedReservations(new Set());
    }
  };

  const totalFacture = totalCommission + totalFraisMenage;
  const factureHT = totalFacture / 1.2;
  const tva = totalFacture - factureHT;

  const transfersBySource = useMemo(() => {
    const result: { [key: string]: { reservations: ProcessedReservation[], total: number } } = {};
    paymentSources.forEach(source => {
      result[source.toLowerCase()] = { reservations: [], total: 0 };
    });

    selectedReservations.forEach(index => {
      const resa = processedData[index];
      if (!resa) return;

      const sourceKey = resa.portail.toLowerCase().includes('airbnb') ? 'airbnb' : 'stripe';
      if (result[sourceKey]) {
        result[sourceKey].reservations.push(resa);
        result[sourceKey].total += resa.montantVerse;
      }
    });

    if (deductInvoice && deductionSource && result[deductionSource]) {
      result[deductionSource].total -= totalFacture;
    }

    return result;
  }, [selectedReservations, processedData, paymentSources, deductInvoice, deductionSource, totalFacture]);

  return (
    <MainLayout>
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
                      <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                        <SelectTrigger id="client-select"><SelectValue placeholder="Choisir un client..." /></SelectTrigger>
                        <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}</SelectContent>
                      </Select>
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
                      <p>Total Commission: <span className="font-bold">{totalCommission.toFixed(2)}€</span></p>
                      <p>Total Frais de Ménage: <span className="font-bold">{totalFraisMenage.toFixed(2)}€</span></p>
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
                            <div className="space-y-2"><Label>Déduire sur</Label><Select value={deductionSource} onValueChange={setDeductionSource}><SelectTrigger><SelectValue placeholder="Choisir une source" /></SelectTrigger><SelectContent>{paymentSources.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent></Select></div>
                          )}
                        </>
                      )}
                    </div>
                    <Button className="w-full" onClick={handleGenerateInvoice} disabled={processedData.length === 0}><FileText className="h-4 w-4 mr-2" />Sauvegarder le Relevé</Button>
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
                        <TableHead>Prix Séjour</TableHead>
                        <TableHead>Frais Ménage</TableHead>
                        <TableHead>Taxe Séjour</TableHead>
                        <TableHead>Montant Versé</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={helloKeysCollectsRent ? 10 : 9}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) : processedData.length > 0 ? processedData.map((row, index) => (
                        <TableRow key={index}>
                          {helloKeysCollectsRent && <TableCell><Checkbox checked={selectedReservations.has(index)} onCheckedChange={(checked) => { const newSet = new Set(selectedReservations); if (checked) newSet.add(index); else newSet.delete(index); setSelectedReservations(newSet); }} /></TableCell>}
                          <TableCell>{row.portail}</TableCell>
                          <TableCell>{row.voyageur}</TableCell>
                          <TableCell>{row.arrivee}</TableCell>
                          <TableCell>{row.prixSejour.toFixed(2)}€</TableCell>
                          <TableCell>{row.fraisMenage.toFixed(2)}€</TableCell>
                          <TableCell>{row.taxeDeSejour.toFixed(2)}€</TableCell>
                          <TableCell>{row.montantVerse.toFixed(2)}€</TableCell>
                          <TableCell>{row.commissionHelloKeys.toFixed(2)}€</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(row, index)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )) : <TableRow><TableCell colSpan={helloKeysCollectsRent ? 10 : 9} className="text-center text-gray-500 py-8">Aucun fichier importé.</TableCell></TableRow>}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="font-bold">
                        <TableCell colSpan={helloKeysCollectsRent ? 4 : 3}>Totaux</TableCell>
                        <TableCell>{totalPrixSejour.toFixed(2)}€</TableCell>
                        <TableCell>{totalFraisMenage.toFixed(2)}€</TableCell>
                        <TableCell>{totalTaxeDeSejour.toFixed(2)}€</TableCell>
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
                      <h3 className="font-semibold mb-2">Depuis {source.charAt(0).toUpperCase() + s.slice(1)}</h3>
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
    </MainLayout>
  );
};

export default AdminInvoiceGenerationPage;