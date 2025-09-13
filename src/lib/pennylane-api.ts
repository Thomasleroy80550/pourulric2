import { supabase } from "@/integrations/supabase/client";
import { getProfile } from "./profile-api";
import { getAllProfiles } from "./admin-api";
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const PENNYLANE_PROXY_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/pennylane-proxy";

export interface PennylaneInvoice {
  id: number;
  invoice_number: string;
  date: string; // ISO 8601 date string
  amount: string;
  status: 'archived' | 'incomplete' | 'cancelled' | 'paid' | 'partially_cancelled' | 'upcoming' | 'late' | 'draft' | 'credit_note';
  file_url: string | null;
}

export interface PennylaneApiResponse {
  has_more: boolean;
  next_cursor: string | null;
  items: PennylaneInvoice[];
}

export interface PennylaneInvoiceLine {
  label: string;
  quantity: number;
  unit: string;
  unit_amount: number;
  vat_rate: string;
}

export interface PennylaneInvoicePayload {
  customer_id: number; // Changement ici
  label: string;
  date: string; // YYYY-MM-DD
  draft: boolean;
  currency: 'EUR';
  language: 'fr_FR';
  invoice_lines: PennylaneInvoiceLine[];
}

export interface PennylaneCreatedInvoice {
  id: number;
  invoice_number: string;
  public_file_url: string;
}

export async function createPennylaneInvoice(payload: PennylaneInvoicePayload): Promise<PennylaneCreatedInvoice> {
  const { data, error } = await supabase.functions.invoke("pennylane-proxy", {
    body: {
      action: "create_customer_invoice",
      payload: payload,
    }
  });

  if (error) {
    throw new Error(error.message || "Failed to create invoice via Pennylane proxy.");
  }

  return data;
}

async function fetchInvoicesForCustomer(customerId: number): Promise<PennylaneInvoice[]> {
  const { data, error } = await supabase.functions.invoke("pennylane-proxy", {
    body: {
      action: "list_invoices",
      customer_id: customerId, // L'admin peut spécifier un customer_id
      limit: 100,
    }
  });

  if (error) {
    throw new Error(error.message || "Failed to fetch invoices for customer from Pennylane proxy.");
  }

  return data?.invoices || [];
}

export async function findMatchingPennylaneInvoice(userId: string, targetAmount: number, targetPeriod: string): Promise<string | null> {
  // 1. Obtenir le pennylane_customer_id de l'utilisateur
  const profiles = await getAllProfiles();
  const userProfile = profiles.find(p => p.id === userId);
  
  if (!userProfile || !userProfile.pennylane_customer_id) {
    throw new Error("Impossible de trouver le profil ou l'ID client Pennylane pour cet utilisateur.");
  }
  const pennylaneCustomerId = userProfile.pennylane_customer_id;

  // 2. Récupérer toutes les factures pour ce client
  const invoices = await fetchInvoicesForCustomer(pennylaneCustomerId);

  if (invoices.length === 0) {
    return null; // Aucune facture à comparer
  }

  // 3. Chercher la correspondance
  const matchedInvoice = invoices.find(invoice => {
    const invoiceAmount = parseFloat(invoice.amount);
    // Comparaison avec une tolérance pour les erreurs de virgule flottante
    const amountMatches = Math.abs(invoiceAmount - targetAmount) < 0.01;

    // Formater la date de la facture Pennylane pour correspondre au format de la période (ex: "Juin 2024")
    // On met en minuscule pour éviter les problèmes de casse
    const invoiceDate = parseISO(invoice.date);
    const invoicePeriod = format(invoiceDate, 'MMMM yyyy', { locale: fr }).toLowerCase();
    const periodMatches = invoicePeriod === targetPeriod.toLowerCase();

    return amountMatches && periodMatches;
  });

  return matchedInvoice?.file_url || null;
}


export async function fetchPennylaneInvoices(): Promise<PennylaneInvoice[]> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error("User not authenticated.");
    }
    const userProfile = await getProfile();
    
    if (!userProfile?.pennylane_customer_id) {
        return []; // Pas d'ID client, pas de factures
    }

    return await fetchInvoicesForCustomer(userProfile.pennylane_customer_id);

  } catch (error: any) {
    console.error("Error fetching Pennylane invoices:", error);
    throw error;
  }
}