import { supabase } from "@/integrations/supabase/client";
import { getProfile } from "./profile-api";
import { getProfileById } from "./profile-api";

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

export async function fetchPennylaneInvoices(): Promise<PennylaneInvoice[]> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error("User not authenticated.");
    }
    const userProfile = await getProfile();

    // Check if current user is a delegated viewer and has an accepted invite
    const { data: invites } = await supabase
      .from('delegated_invoice_viewers')
      .select('owner_id')
      .eq('viewer_id', session.user.id)
      .eq('status', 'accepted')
      .order('accepted_at', { ascending: false })
      .limit(1);

    const delegatedOwnerId = invites && invites.length > 0 ? invites[0].owner_id : null;

    // Determine which profile to use for Pennylane (owner if delegated, otherwise current)
    let effectiveCustomerId = userProfile?.pennylane_customer_id;
    if (delegatedOwnerId) {
      const ownerProfile = await getProfileById(delegatedOwnerId);
      if (ownerProfile?.pennylane_customer_id) {
        effectiveCustomerId = ownerProfile.pennylane_customer_id as any;
      }
    }

    const { data, error } = await supabase.functions.invoke("pennylane-proxy", {
      body: { 
        action: "list_invoices",
        payload:{
          field: "customer_id",
          operator: "eq",
          limit: 100,
          value: effectiveCustomerId 
        }
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