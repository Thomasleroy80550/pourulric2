import React, { useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, FileText, DollarSign, Loader2, Terminal } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

// Interface for a processed reservation row
interface ProcessedReservation {
  portail: string;
  voyageur: string;
  arrivee: string;
  depart: string;
  prixSejour: number;
  fraisMenage: number;
  revenuNet: number;
  commissionHelloKeys: number;
}

const AdminInvoiceGenerationPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedReservation[]>([]);
  const [totalCommission, setTotalCommission] = useState(0);
  const [totalPrixSejour, setTotalPrixSejour] = useState(0);
  const [totalFraisMenage, setTotalFraisMenage] = useState(0);
  const [totalRevenuNet, setTotalRevenuNet] = useState(0);
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
    setTotalPrixSejour(0);
    setTotalFraisMenage(0);
    setTotalRevenuNet(0);

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
      let prixSejourSum = 0;
      let fraisMenageSum = 0;
      let revenuNetSum = 0;
      const processedReservations: ProcessedReservation[] = [];

      json.forEach((row, index) => {
        try {
          if (!Array.isArray(row) || row.length < 39) {
            console.warn(`Ligne ${index + 2} ignorée : format de données incorrect ou nombre de colonnes insuffisant.`);
            return;
          }

          const voyageurOrStatus = row[18] || '';
          if (voyageurOrStatus.toUpperCase() === 'PROPRIETAIRE') {
            return;
          }

          const portail = row[16] || 'N/A';
          const totalPaye = parseFloat(row[22]) || 0;
          const prixSejour = parseFloat(row[23]) || 0;
          const fraisMenage = parseFloat(row[25]) || 0; // Column Z
          let commissionPlateforme = parseFloat(row[37]) || 0;
          const fraisPaiement = parseFloat(row[38]) || 0;

          if (portail === 'Hello Keys') {
            commissionPlateforme = (totalPaye * 1.4 / 100) + 0.25;
          }

          const revenuNet = prixSejour - commissionPlateforme - fraisPaiement;
          const commissionHelloKeys = revenuNet * 0.26;

          commissionSum += commissionHelloKeys;
          prixSejourSum += prixSejour;
          fraisMenageSum += fraisMenage;
          revenuNetSum += revenuNet;

          processedReservations.push({
            portail,
            voyageur: voyageurOrStatus,
            arrivee: row[2] || '',
            depart: row[3] || '',
            prixSejour,
            fraisMenage,
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
      setTotalPrixSejour(prixSejourSum);
      setTotalFraisMenage(fraisMenageSum);
      setTotalRevenuNet(revenuNetSum);
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
    toast.info("Simulation de la génération de facture...", {
      description: `Une facture de ${totalCommission.toFixed(2)}€ serait envoyée à Pennylane.`,
    });
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

          <div className="lg:col-span-2">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>3. Relevé Détaillé</CardTitle>
                <CardDescription>Vérifiez les réservations et les commissions calculées avant de générer la facture.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Voyageur</TableHead>
                        <TableHead>Arrivée</TableHead>
                        <TableHead>Départ</TableHead>
                        <TableHead>Prix Séjour</TableHead>
                        <TableHead>Frais Ménage</TableHead>
                        <TableHead>Revenu Net</TableHead>
                        <TableHead className="text-right">Commission (26%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                          </TableRow>
                        ))
                      ) : processedData.length > 0 ? (
                        processedData.map((row, index) => (
                          <TableRow key={index}>
                            <TableCell>{row.voyageur}</TableCell>
                            <TableCell>{row.arrivee}</TableCell>
                            <TableCell>{row.depart}</TableCell>
                            <TableCell>{row.prixSejour.toFixed(2)}€</TableCell>
                            <TableCell>{row.fraisMenage.toFixed(2)}€</TableCell>
                            <TableCell>{row.revenuNet.toFixed(2)}€</TableCell>
                            <TableCell className="text-right font-medium">{row.commissionHelloKeys.toFixed(2)}€</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                            Aucun fichier importé ou aucune réservation à facturer.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="font-bold">
                        <TableCell colSpan={3}>Totaux</TableCell>
                        <TableCell>{totalPrixSejour.toFixed(2)}€</TableCell>
                        <TableCell>{totalFraisMenage.toFixed(2)}€</TableCell>
                        <TableCell>{totalRevenuNet.toFixed(2)}€</TableCell>
                        <TableCell className="text-right">{totalCommission.toFixed(2)}€</TableCell>
                      </TableRow>
                    </TableFooter>
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