import React, { createContext, useState, useContext, useCallback, ReactNode, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { UserProfile } from '@/lib/profile-api';
import { saveInvoice, sendStatementByEmail, sendStatementDataToMakeWebhook, updateInvoice, SavedInvoice } from '@/lib/admin-api';
import { uploadStatementPdf } from '@/lib/storage-api';
import { generateStatementPdf } from '@/lib/pdf-utils';
import { addDays, format, parseISO } from 'date-fns';

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
  ca: number; // Chiffre d'Affaires (Total payé par le voyageur)
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
  totalCA: number;
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
  ownerCleaningFee: number;
  setOwnerCleaningFee: React.Dispatch<React.SetStateAction<number>>;
  editingInvoiceId: string | null;
  
  recalculateTotals: (data: ProcessedReservation[]) => void;
  processFile: (fileToProcess: File, commissionRate: number) => Promise<void>;
  resetState: () => void;
  handleGenerateInvoice: (sendEmail?: boolean) => Promise<void>;
  loadInvoiceForEditing: (invoice: SavedInvoice) => void;
}

const InvoiceGenerationContext = createContext<InvoiceGenerationContextType | undefined>(undefined);

export const InvoiceGenerationProvider = ({ children }: { children: ReactNode }) => {
  const [file, setFile] = useState<File | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedReservation[]>([]);
  const [totalCA, setTotalCA] = useState(0);
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
  const [ownerCleaningFee, setOwnerCleaningFee] = useState(0);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  const totalFacture = totalCommission + totalFraisMenage + ownerCleaningFee;

  const resetState = useCallback(() => {
    setFile(null);
    setFileName('');
    setProcessedData([]);
    setTotalCA(0);
    setTotalCommission(0);
    setTotalPrixSejour(0);
    setTotalFraisMenage(0);
    setTotalTaxeDeSejour(0);
    setTotalRevenuGenere(0);
    setTotalMontantVerse(0);
    setTotalNuits(0);
    setTotalVoyageurs(0);
    setSelectedReservations(new Set());
    setOwnerCleaningFee(0);
    setEditingInvoiceId(null);
    // Do not reset client and period
  }, []);

  const recalculateTotals = useCallback((data: ProcessedReservation[]) => {
    let caSum = 0, commissionSum = 0, prixSejourSum = 0, fraisMenageSum = 0, taxeDeSejourSum = 0, revenuGenereSum = 0, montantVerseSum = 0, nuitsSum = 0, voyageursSum = 0;
    data.forEach(row => {
      caSum += row.ca;
      commissionSum += row.commissionHelloKeys;
      prixSejourSum += row.prixSejour;
      fraisMenageSum += row.fraisMenage;
      taxeDeSejourSum += row.taxeDeSejour;
      revenuGenereSum += row.revenuGenere;
      montantVerseSum += row.montantVerse;
      nuitsSum += row.nuits;
      voyageursSum += row.voyageurs;
    });
    setTotalCA(caSum);
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

          const ca = prixSejour + fraisMenage + taxeDeSejour; // Correct CA calculation
          const montantVerse = ca - commissionPlateforme - fraisPaiement;
          const revenuGenere = montantVerse - fraisMenage - taxeDeSejour;
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
            ca,
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

    return result;
  }, [selectedReservations, processedData, paymentSources]);

  const handleGenerateInvoice = useCallback(async (sendEmail: boolean = false) => {
    if (!selectedClientId || !invoicePeriod || processedData.length === 0) {
      toast.error("Veuillez sélectionner un client, une période et des données de réservation.");
      return;
    }

    const totals = {
      totalCommission,
      totalPrixSejour,
      totalFraisMenage,
      totalTaxeDeSejour,
      totalRevenuGenere,
      totalMontantVerse,
      totalNuits,
      totalVoyageurs,
      totalFacture: totalCommission + totalFraisMenage + ownerCleaningFee,
      ownerCleaningFee,
      transferDetails: {
        sources: transfersBySource,
        deductionInfo: {
          deducted: deductInvoice,
          source: deductionSource,
        }
      }
    };

    try {
      const isUpdate = !!editingInvoiceId;
      const savedInvoice = isUpdate
        ? await updateInvoice(editingInvoiceId, selectedClientId, invoicePeriod, processedData, totals)
        : await saveInvoice(selectedClientId, invoicePeriod, processedData, totals);
      
      const emissionDate = parseISO(savedInvoice.created_at);
      const deadlineDate = addDays(emissionDate, 15);
      const formattedEmissionDate = format(emissionDate, 'yyyy-MM-dd');
      const formattedDeadlineDate = format(deadlineDate, 'yyyy-MM-dd');

      await sendStatementDataToMakeWebhook(
        savedInvoice.id,
        invoicePeriod,
        totals,
        formattedEmissionDate,
        formattedDeadlineDate
      );

      if (sendEmail) {
        const toastId = toast.loading("Génération du PDF du relevé…");
        // 1) Générer le PDF à partir du relevé sauvegardé
        const pdfFile = await generateStatementPdf(savedInvoice);
        // 2) Uploader dans le bucket 'statements' sous userId/invoiceId.pdf
        const { path } = await uploadStatementPdf(savedInvoice.user_id, savedInvoice.id, pdfFile);
        // 3) Envoyer l'email via la fonction edge (avec lien signé/PIÈCE JOINTE côté serveur)
        await sendStatementByEmail(savedInvoice.id, path);
        toast.dismiss(toastId);
        toast.success("DING DONG ! Votre relevé est arrivé par email.");
      }
      
      toast.success(isUpdate ? "Relevé mis à jour avec succès !" : "Relevé sauvegardé avec succès !");

      resetState();

    } catch (error: any) {
      console.error("Failed to generate/update invoice:", error);
      toast.error(`Erreur lors de la ${editingInvoiceId ? 'mise à jour' : 'génération'} : ${error.message}`);
    }
  }, [selectedClientId, invoicePeriod, processedData, totalCommission, totalPrixSejour, totalFraisMenage, totalTaxeDeSejour, totalRevenuGenere, totalMontantVerse, totalNuits, totalVoyageurs, ownerCleaningFee, transfersBySource, deductInvoice, deductionSource, editingInvoiceId, resetState]);

  const loadInvoiceForEditing = useCallback((invoice: SavedInvoice) => {
    resetState();
    setEditingInvoiceId(invoice.id);
    setSelectedClientId(invoice.user_id);
    setInvoicePeriod(invoice.period);
    setProcessedData(invoice.invoice_data || []);
    setOwnerCleaningFee(invoice.totals.ownerCleaningFee || 0);
    setDeductInvoice(invoice.totals.transferDetails?.deductionInfo?.deducted || false);
    setDeductionSource(invoice.totals.transferDetails?.deductionInfo?.source || '');
    // Assume all reservations from the saved invoice are selected
    setSelectedReservations(new Set(invoice.invoice_data.map((_: any, index: number) => index)));
    recalculateTotals(invoice.invoice_data || []);
    setFileName(`Relevé existant pour ${invoice.period}`);
  }, [resetState, recalculateTotals]);

  const value = {
    file, setFile,
    processedData, setProcessedData,
    totalCA,
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
    ownerCleaningFee, setOwnerCleaningFee,
    editingInvoiceId,
    recalculateTotals,
    processFile,
    resetState,
    handleGenerateInvoice,
    loadInvoiceForEditing,
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