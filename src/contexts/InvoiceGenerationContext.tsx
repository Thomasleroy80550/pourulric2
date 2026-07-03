import React, { createContext, useState, useContext, useCallback, ReactNode, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { UserProfile } from '@/lib/profile-api';
import { saveInvoice, sendStatementByEmail, sendStatementDataToMakeWebhook, updateInvoice, SavedInvoice, getAllUserRooms } from '@/lib/admin-api';
import { fetchKrossbookingReservationsForAdminRooms } from '@/lib/krossbooking';
import { uploadStatementPdf } from '@/lib/storage-api';
import { generateStatementPdf } from '@/lib/pdf-utils';
import { addDays, format, parseISO, differenceInCalendarDays, isValid, startOfMonth, endOfMonth } from 'date-fns';

// Alpha: mapping des mois français vers un index (0-11) pour interpréter la période
const FRENCH_MONTHS: { [key: string]: number } = {
  janvier: 0, février: 1, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
  juillet: 6, août: 7, aout: 7, septembre: 8, octobre: 9, novembre: 10,
  décembre: 11, decembre: 11,
};

// Alpha: convertit une période texte ("Juillet 2024") en intervalle de dates
function parseFrenchPeriodToRange(period: string): { start: Date; end: Date } | null {
  if (!period) return null;
  const parts = period.trim().toLowerCase().split(/\s+/);
  if (parts.length < 2) return null;
  const month = FRENCH_MONTHS[parts[0]];
  const year = parseInt(parts[1], 10);
  if (month === undefined || !Number.isFinite(year)) return null;
  const start = startOfMonth(new Date(year, month, 1));
  const end = endOfMonth(start);
  return { start, end };
}

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
  processFromKrossbooking: (clientId: string, commissionRate: number, period: string) => Promise<void>;
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

  // Alpha: génère le relevé directement depuis les réservations Krossbooking, sans fichier Excel.
  const processFromKrossbooking = useCallback(async (clientId: string, commissionRate: number, period: string) => {
    setIsLoading(true);
    setError(null);
    setProcessedData([]);
    setSelectedReservations(new Set());

    try {
      const range = parseFrenchPeriodToRange(period);
      if (!range) {
        throw new Error('Période invalide. Utilisez le format "Mois AAAA" (ex : Juillet 2024).');
      }
      const { start, end } = range;

      const allRooms = await getAllUserRooms();
      const clientRooms = allRooms.filter((room) => room.user_id === clientId);
      if (clientRooms.length === 0) {
        throw new Error("Aucun logement configuré pour ce client.");
      }

      const reservations = await fetchKrossbookingReservationsForAdminRooms(clientRooms, true);

      const processedReservations: ProcessedReservation[] = [];
      let taxWasModified = false;

      reservations.forEach((res) => {
        const status = (res.status || '').toUpperCase();
        // Exclure les annulations et les blocages propriétaire
        if (status === 'CANC' || status === 'PROPRI' || status === 'PROP0') return;

        const checkIn = res.check_in_date ? parseISO(res.check_in_date) : null;
        if (!checkIn || !isValid(checkIn)) return;
        // Filtrer par mois de la date d'arrivée
        if (checkIn < start || checkIn > end) return;

        const portail = res.cod_channel || res.channel_identifier || 'N/A';
        const nuits = res.check_out_date && isValid(parseISO(res.check_out_date))
          ? Math.max(differenceInCalendarDays(parseISO(res.check_out_date), checkIn), 0)
          : 0;
        const voyageurs = res.n_guests || 0;

        // Le montant Krossbooking (amount) est du type "123.45€"
        const ca = parseFloat((res.amount || '0').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
        let taxeDeSejour = res.tourist_tax_amount || 0;
        const fraisMenage = res.cleaning_fee_amount || 0;
        const commissionPlateforme = res.ota_commissions_collected || 0;
        const fraisPaiement = res.ota_commissions_deducted || 0;

        const portailLower = portail.toLowerCase();
        if (portailLower.includes('airbnb') || portailLower.includes('booking')) {
          if (taxeDeSejour !== 0) taxWasModified = true;
          taxeDeSejour = 0;
        }

        const prixSejour = ca - fraisMenage - taxeDeSejour;
        const montantVerse = ca - commissionPlateforme - fraisPaiement;
        const revenuGenere = montantVerse - fraisMenage - taxeDeSejour;
        const commissionHelloKeys = revenuGenere * commissionRate;

        processedReservations.push({
          portail,
          voyageur: res.guest_name || '',
          arrivee: res.check_in_date || '',
          depart: res.check_out_date || '',
          nuits,
          voyageurs,
          prixSejour,
          fraisMenage,
          taxeDeSejour,
          ca,
          revenuGenere,
          commissionHelloKeys,
          montantVerse,
          originalTotalPaye: ca,
          originalCommissionPlateforme: commissionPlateforme,
          originalFraisPaiement: fraisPaiement,
        });
      });

      processedReservations.sort((a, b) => (a.arrivee > b.arrivee ? 1 : a.arrivee < b.arrivee ? -1 : 0));

      // --- DEBUG: vérifier que les commissions sont bien remontées pour le relevé ---
      console.log('[ALPHA DEBUG] Réservations retenues pour le relevé:', processedReservations.map((r) => ({
        voyageur: r.voyageur,
        canal: r.portail,
        ca: r.ca,
        commissionPlateforme: r.originalCommissionPlateforme,
        fraisPaiement: r.originalFraisPaiement,
        fraisMenage: r.fraisMenage,
        montantVerse: r.montantVerse,
      })));
      const nbAvecCommission = processedReservations.filter((r) => (r.originalCommissionPlateforme + r.originalFraisPaiement) > 0).length;
      console.log(`[ALPHA DEBUG] ${nbAvecCommission}/${processedReservations.length} réservation(s) avec des commissions OTA > 0`);
      // --- FIN DEBUG ---

      setProcessedData(processedReservations);
      recalculateTotals(processedReservations);
      setFileName(`Généré depuis Krossbooking (Alpha) — ${period}`);

      if (taxWasModified) {
        toast.info("La taxe de séjour a été mise à 0 pour les réservations Airbnb et Booking.com.");
      }

      if (processedReservations.length === 0) {
        toast.warning("Aucune réservation trouvée pour ce client sur cette période.");
      } else {
        toast.success(`${processedReservations.length} réservation(s) importée(s) depuis Krossbooking (Alpha). Vérifiez les montants avant de sauvegarder.`);
      }
    } catch (err: any) {
      setError(`Erreur lors de la génération depuis Krossbooking : ${err.message}`);
      toast.error(err.message || "Une erreur est survenue lors de la génération depuis Krossbooking.");
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

      // Envoi d'email pour notifier le relevé, même en mode "Sauvegarder" simple
      if (sendEmail) {
        const toastId = toast.loading("Génération du PDF du relevé…");
        const pdfFile = await generateStatementPdf(savedInvoice);
        const { path } = await uploadStatementPdf(savedInvoice.user_id, savedInvoice.id, pdfFile);
        await sendStatementByEmail(savedInvoice.id, path);
        toast.dismiss(toastId);
        toast.success("DING DONG ! Votre relevé est arrivé par email.");
      } else {
        // Mode silencieux: générer le PDF et envoyer l'email sans loader
        const pdfFile = await generateStatementPdf(savedInvoice);
        const { path } = await uploadStatementPdf(savedInvoice.user_id, savedInvoice.id, pdfFile);
        await sendStatementByEmail(savedInvoice.id, path);
        toast.success("Email de notification du relevé envoyé.");
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
    processFromKrossbooking,
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