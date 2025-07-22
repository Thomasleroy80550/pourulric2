import React, { useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, FileText, DollarSign, Loader2, Terminal } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

// Interface for a processed reservation row
interface ProcessedReservation {
  portail: string;
  voyageur: string;
  arrivee: string;
  depart: string;
  prixSejour: number;
  revenuNet: number;
  commissionHelloKeys: number;
}

const AdminInvoiceGenerationPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedReservation[]>([]);
  const [totalCommission, setTotalCommission] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      processFile(selectedFile);
    }
  };

  const processFile = async (fileToProcess: File) => {
    setIsLoading(true);
    setError(null);
    setProcessedData([]);
    setTotalCommission(0);

    try {
      const data = await fileToProcess.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheetName = workbook.SheetNames[0];
      if (!worksheetName) {
        throw new Error("Le fichier Excel ne contient aucune feuille de calcul.");
      }
      const worksheet = workbook.Sheets[worksheetName];
      const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

      if (!json || json.length < 2) {
        throw new Error("Le fichier Excel est vide ou ne contient pas de données après la ligne d'en-tête.");
      }

      // Remove header row from Krossbooking export
      json.splice(0, 1);

      let commissionSum = 0;
      const processedReservations: ProcessedReservation[] = [];

      json.forEach((row, index) => {
        try {
          // Add a check to ensure the row is an array and has enough columns
          if (!Array.isArray(row) || row.length < 39) {
            console.warn(`Ligne ${index + 2} ignorée : format de données incorrect ou nombre de colonnes insuffisant.`);
            return; // Skip this malformed row
          }

          // Rule 1: Exclude owner stays
          const voyageurOrStatus = row[18] || '';
          if (voyageurOrStatus.toUpperCase() === 'PROPRIETAIRE') {
            return; // Skip this row
          }

          // Extract data based on column index from your script
          const portail = row[16] || 'N/A';
          const totalPaye = parseFloat(row[22]) || 0;
          const prixSejour = parseFloat(row[23]) || 0;
          let commissionPlateforme = parseFloat(row[37]) || 0;
          const fraisPaiement = parseFloat(row[38]) || 0;

          // Rule 4: Special case for "Hello Keys"
          if (portail === 'Hello Keys') {
            commissionPlateforme = (totalPaye * 1.4 / 100) + 0.25;
          }

          // Rule 2: Calculate Net Revenue
          const revenuNet = prixSejour - commissionPlateforme - fraisPaiement;

          // Rule 3: Calculate our commission
          const commissionHelloKeys = revenuNet * 0.26;

          commissionSum += commissionHelloKeys;

          processedReservations.push({
            portail,
            voyageur: voyageurOrStatus,
            arrivee: row[2] || '',
            depart: row[3] || '',
            prixSejour,
            revenuNet,
            commissionHelloKeys,
          });
        } catch (rowError: any) {
          console.error(`Erreur lors du traitement de la ligne ${index + 2} du fichier:`, row, rowError);
          toast.warning(`La ligne ${index + 2} a été ignorée en raison d'une erreur.`);
        }
      });

      setProcessedData(processedReservations);
      setTotalCommission(commissionSum);
      toast.success(`Fichier "${fileToProcess.name}" analysé avec succès !`);

    } catch (err: any) {
      setError(`Erreur lors du traitement du fichier : ${err.message}`);
      toast.error("Une erreur est survenue lors de l'analyse du fichier.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateInvoice = () => {
    // This is where the call to the Pennylane Edge Function would go.
    // For now, we simulate the success of this action.
    toast.info("Simulation de la génération de facture...", {
      description: `Une facture de ${totalCommission.toFixed(2)}€ serait envoyée à Pennylane.`,
    });
    // In a future step, we would implement:
    // await createPennylaneInvoice({ amount: totalCommission, ... });
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Génération de Facture Manuelle</h1>
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Upload and Summary */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>1. Importer le relevé</CardTitle>
                <CardDescription>Importez le fichier Excel (.xlsx) exporté depuis Krossbooking.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    <Upload className="h-8 w-8 text-gray-500 mb-2" />
                    <span className="text-sm text-gray-500">Cliquez pour choisir un fichier</span>
                  </Label>
                  <Input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".xlsx, .xls" />
                  {fileName && <p className="text-sm text-center text-gray-600 dark:text-gray-400 mt-2">Fichier: {fileName}</p>}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>2. Résumé & Facturation</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">Commission totale à facturer</p>
                    <p className="text-4xl font-bold text-green-600">{totalCommission.toFixed(2)}€</p>
                    <Button 
                      className="w-full" 
                      onClick={handleGenerateInvoice} 
                      disabled={processedData.length === 0}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Générer la Facture (Simulation)
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Data Preview */}
          <div className="lg:col-span-2">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>3. Vérification des données</CardTitle>
                <CardDescription>Vérifiez les réservations et les commissions calculées avant de générer la facture.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Portail</TableHead>
                        <TableHead>Voyageur</TableHead>
                        <TableHead>Revenu Net</TableHead>
                        <TableHead className="text-right">Commission (26%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
                          </TableRow>
                        ))
                      ) : processedData.length > 0 ? (
                        processedData.map((row, index) => (
                          <TableRow key={index}>
                            <TableCell>{row.portail}</TableCell>
                            <TableCell>{row.voyageur}</TableCell>
                            <TableCell>{row.revenuNet.toFixed(2)}€</TableCell>
                            <TableCell className="text-right font-medium">{row.commissionHelloKeys.toFixed(2)}€</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                            Aucun fichier importé ou aucune réservation à facturer.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AdminInvoiceGenerationPage;