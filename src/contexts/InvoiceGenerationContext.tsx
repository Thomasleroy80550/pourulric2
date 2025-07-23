import React, { createContext, useState, useContext, useCallback, ReactNode, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { UserProfile } from '@/lib/profile-api';
import { saveInvoice } from '@/lib/admin-api';

// Interface for a processed reservation row
export interface ProcessedReservation {
  portail: string;
  voyageur: string;
  arrivee: string;
  depart: string;
  nuits: number;
  voyageurs: number;
  prixSejour: number;
  fraisMenage: number;
  taxeDeSejour: number;
  revenuGenere: number;
  commissionHelloKeys: number;
  montantVerse: number;
  // Original data for recalculation
  originalTotalPaye: number;
  originalCommissionPlateforme: number;
  originalFraisPaiement: number;
}

interface InvoiceGenerationContextType {
  file: File | null;
  setFile: React.Dispatch<React.SetStateAction<File | null>>;
  processedData: ProcessedReservation[];
  setProcessedData: React.Dispatch<React.SetStateAction<ProcessedReservation[]>>;
  totalCommission: number;
  totalPrixSejour: number;
  totalFraisMenage: number;
  totalTaxeDeSejour: number;
  totalRevenuGenere: number;
  totalMontantVerse: number;
  totalNuits: number;
  totalVoyageurs: number;
  isLoading: boolean;
  error: string | null;
  fileName: string;
  setFileName: React.Dispatch<React.SetStateAction<string>>;
  selectedClientId: string;
  setSelectedClientId: React.Dispatch<React.SetStateAction<string>>;
  invoicePeriod: string;
  setInvoicePeriod: React.Dispatch<React.SetStateAction<string>>;
  helloKeysCollectsRent: boolean;
  setHelloKeysCollectsRent: React.Dispatch<React.SetStateAction<boolean>>;
  selectedReservations: Set<number>;
  setSelectedReservations: React.Dispatch<React.SetStateAction<Set<number>>>;
  paymentSources: string[];
  setPaymentSources: React.Dispatch<React.SetStateAction<string[]>>;
  deductInvoice: boolean;
  setDeductInvoice: React.Dispatch<React.SetStateAction<boolean>>;
  deductionSource: string;
  setDeductionSource: React.Dispatch<React.SetStateAction<string>>;
  transfersBySource: { [key: string]: { reservations: ProcessedReservation[], total: number } };
  
  recalculateTotals: (data: ProcessedReservation[]) => void;
  processFile: (fileToProcess: File, commissionRate: number) => Promise<void>;
  resetState: () => void;
  handleGenerateInvoice: () => Promise<void>;
}

const InvoiceGenerationContext = createContext<InvoiceGenerationContextType | undefined>(undefined);

export const InvoiceGenerationProvider = ({ children }: { children: ReactNode }) => {
  const [file, setFile] = useState<File | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedReservation[]>([]);
  const [totalCommission, setTotalCommission] = useState(0);
  const [totalPrixSejour, setTotalPrixSejour] = useState(0);
  const [totalFraisMenage, setTotalFraisMenage] = useState(0);
  const [totalTaxeDeSejour, setTotalTaxeDeSejour] = useState(0);
  const [totalRevenuGenere, setTotalRevenuGenere] = useState(0);
  const [totalMontantVerse, setTotalMontantVerse] = useState(0);
  const [totalNuits, setTotalNuits] = useState(0);
  const [totalVoyageurs, setTotalVoyageurs] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [invoicePeriod, setInvoicePeriod] = useState<string>('');
  const [helloKeysCollectsRent, setHelloKeysCollectsRent] = useState(false);
  const [selectedReservations, setSelectedReservations] = useState<Set<number>>(new Set());
  const [paymentSources, setPaymentSources] = useState<string[]>([]);
  const [deductInvoice, setDeductInvoice] = useState(false);
  const [deductionSource, setDeductionSource] = useState('');

  const totalFacture = totalCommission + totalFraisMenage;

  const resetState = useCallback(() => {
    setFile(null);
    setFileName('');
    setProcessedData([]);
    setTotalCommission(0);
    setTotalPrixSejour(0);
    setTotalFraisMenage(0);
    setTotalTaxeDeSejour(0);
    setTotalRevenuGenere(0);
    setTotalMontantVerse(0);
    setTotalNuits(0);
    setTotalVoyageurs(0);
    setSelectedReservations(new Set());
    // Do not reset client and period
  }, []);

  const recalculateTotals = useCallback((data: ProcessedReservation[]) => {
    let commissionSum = 0, prixSejourSum = 0, fraisMenageSum = 0, taxeDeSejourSum = 0, revenuGenereSum = 0, montantVerseSum = 0, nuitsSum = 0, voyageursSum = 0;
    data.forEach(row => {
      commissionSum += row.commissionHelloKeys;
      prixSejourSum += row.prixSejour;
      fraisMenageSum += row.fraisMenage;
      taxeDeSejourSum += row.taxeDeSejour;
      revenuGenereSum += row.revenuGenere;
      montantVerseSum += row.montantVerse;
      nuitsSum += row.nuits;
      voyageursSum += row.voyageurs;
    });
    setTotalCommission(commissionSum);
    setTotalPrixSejour(prixSejourSum);
    setTotalFraisMenage(fraisMenageSum);
    setTotalTaxeDeSejour(taxeDeSejourSum);
    setTotalRevenuGenere(revenuGenereSum);
    setTotalMontantVerse(montantVerseSum);
    setTotalNuits(nuitsSum);
    setTotalVoyageurs(voyageursSum);
  }, []);

  const processFile = useCallback(async (fileToProcess: File, commissionRate: number) => {
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
      let taxWasModified = false;

      json.forEach((row, index) => {
        try {
          if (!Array.isArray(row) || row.length < 40) return;
          if ((row[18] || '').toUpperCase() === 'PROPRIETAIRE') return;

          const portail = row[16] || 'N/A';
          const nuits = parseInt(row[4]) || 0; // Column E
          const voyageurs = parseInt(row[7]) || 0; // Column H
          const prixSejour = parseFloat(row[23]) || 0;
          let taxeDeSejour = parseFloat(row[24]) || 0;
          const fraisMenage = parseFloat(row[25]) || 0;
          const commissionPlateforme = parseFloat(row[38]) || 0;
          const fraisPaiement = parseFloat(row[39]) || 0;

          const portailLower = portail.toLowerCase();
          if (portailLower.includes('airbnb') || portailLower.includes('booking')) {
            if (taxeDeSejour !== 0) taxWasModified = true;
            taxeDeSejour = 0;
          }

          const montantVerse = prixSejour + fraisMenage + taxeDeSejour - commissionPlateforme - fraisPaiement;
          const revenuGenere = montantVerse - fraisMenage - taxeDeSejour; // As per user formula
          const commissionHelloKeys = revenuGenere * commissionRate;

          processedReservations.push({
            portail,
            voyageur: row[18] || '',
            arrivee: row[2] || '',
            depart: row[3] || '',
            nuits,
            voyageurs,
            prixSejour,
            fraisMenage,
            taxeDeSejour,
            revenuGenere,
            commissionHelloKeys,
            montantVerse,
            originalTotalPaye: parseFloat(row[22]) || 0,
            originalCommissionPlateforme: commissionPlateforme,
            originalFraisPaiement: fraisPaiement,
          });
        } catch (rowError: any) {
          toast.warning(`La ligne ${index + 2} a été ignorée en raison d'une erreur.`);
        }
      });

      setProcessedData(processedReservations);
      recalculateTotals(processedReservations);
      
      if (taxWasModified) {
        toast.info("La taxe de séjour a été mise à 0 pour les réservations Airbnb et Booking.com.");
      }

      toast.success(`Fichier "${fileToProcess.name}" analysé avec succès !`);

    } catch (err: any) {
      setError(`Erreur lors du traitement du fichier : ${err.message}`);
      toast.error("Une erreur est survenue lors de l'analyse du fichier.");
    } finally {
      setIsLoading(false);
    }
  }, [recalculateTotals]);

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

  const handleGenerateInvoice = useCallback(async () => {
    if (!selectedClientId || !invoicePeriod || processedData.length === 0) {
      toast.error("Veuillez sélectionner un client, définir une période et importer un fichier.");
      return;
    }

    const totalsObject = {
      totalCommission,
      totalFraisMenage,
      totalPrixSejour,
      totalTaxeDeSejour,
      totalRevenuGenere,
      totalMontantVerse,
      totalNuits,
      totalVoyageurs,
      totalFacture,
      transferDetails: helloKeysCollectsRent ? {
        sources: transfersBySource,
        deductionInfo: {
          deducted: deductInvoice,
          source: deductionSource,
        },
      } : null,
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
  }, [selectedClientId, invoicePeriod, processedData, totalCommission, totalFraisMenage, totalPrixSejour, totalTaxeDeSejour, totalRevenuGenere, totalMontantVerse, totalNuits, totalVoyageurs, totalFacture, helloKeysCollectsRent, transfersBySource, deductInvoice, deductionSource, resetState]);

  const value = {
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
    recalculateTotals,
    processFile,
    resetState,
    handleGenerateInvoice,
  };

  return (
    <InvoiceGenerationContext.Provider value={value}>
      {children}
    </InvoiceGenerationContext.Provider>
  );
};

export const useInvoiceGeneration = () => {
  const context = useContext(InvoiceGenerationContext);
  if (context === undefined) {
    throw new Error('useInvoiceGeneration must be used within an InvoiceGenerationProvider');
  }
  return context;
};