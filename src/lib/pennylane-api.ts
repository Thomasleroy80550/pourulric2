import { supabase } from "@/integrations/supabase/client";

const PENNYLANE_PROXY_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/pennylane-proxy";

export interface PennylaneInvoice {
  id: number;
  invoice_number: string;
  date: string; // ISO 8601 date string
  amount: string;
  status: 'archived' | 'incomplete' | 'cancelled' | 'paid' | 'partially_cancelled' | 'upcoming' | 'late' | 'draft' | 'credit_note';
  public_file_url: string | null;
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

    const response = await fetch(PENNYLANE_PROXY_URL, {
      method: 'POST', // POST to send body, though the function performs a GET to Pennylane
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      // No body needed as the function gets the customer ID from the user session
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch invoices from Pennylane proxy.");
    }

    return (data as PennylaneApiResponse).items || [];
  } catch (error: any) {
    console.error("Error fetching Pennylane invoices:", error);
    throw error;
  }
}