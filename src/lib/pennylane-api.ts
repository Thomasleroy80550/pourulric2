import { supabase } from "@/integrations/supabase/client";
import { getProfile } from "./profile-api";

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

export async function fetchPennylaneInvoices(): Promise<PennylaneInvoice[]> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error("User not authenticated.");
    }
    const userProfile = await getProfile();
    
    const { data, error } = await supabase.functions.invoke("pennylane-proxy", {
      body: { 
        field: "customer_id",
        operator: "eq",
        limit: 100,
        value: userProfile.pennylane_customer_id 
      }
    });

    if (error) {
      throw new Error(error.message || "Failed to fetch invoices from Pennylane proxy.");
    }

    return data?.invoices || [];
  } catch (error: any) {
    console.error("Error fetching Pennylane invoices:", error);
    throw error;
  }
}