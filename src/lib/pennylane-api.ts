import { supabase } from "@/integrations/supabase/client";

const PENNYLANE_PROXY_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/pennylane-proxy";

export interface PennylaneInvoice {
  id: number;
  invoice_number: string;
  date: string; // ISO 8601 date string
  amount: string;
  status: 'archived' | 'incomplete' | 'cancelled' | 'paid' | 'partially_cancelled' | 'upcoming' | 'late' | 'draft' | 'credit_note';
  public_file_url: string | null; // Champ corrigé de file_url à public_file_url
}

export interface PennylaneApiResponse {
  has_more: boolean;
  next_cursor: string | null;
  items: PennylaneInvoice[];
}

export async function fetchPennylaneInvoices(): Promise<PennylaneInvoice[]> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error("User not authenticated.");
    }
    
    const { data, error } = await supabase.functions.invoke("pennylane-proxy", {
      body: {} // Le proxy récupère l'ID client depuis la session, pas besoin de le passer ici
    });

    if (error) {
      let detailedError = "Erreur lors de la communication avec le service de facturation.";
      if (error.context && typeof error.context.body === 'string') {
          try {
              const errorBody = JSON.parse(error.context.body);
              if (errorBody.error) {
                  detailedError = errorBody.error;
              }
          } catch(e) {
              // Le corps de la réponse n'était pas du JSON, on utilise le message par défaut
          }
      } else if (error.message) {
        detailedError = error.message;
      }
      throw new Error(detailedError);
    }

    // Le proxy retourne la réponse de l'API Pennylane, les factures sont dans `items`
    return data?.items || [];
  } catch (error: any) {
    console.error("Error fetching Pennylane invoices:", error);
    throw error;
  }
}