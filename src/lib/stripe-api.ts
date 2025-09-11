import { supabase } from "@/integrations/supabase/client";

export interface StripePaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  // customer peut être un ID string ou un objet Customer étendu
  customer: string | { id: string; email: string | null; name: string | null; } | null;
  description: string | null;
  receipt_email: string | null;
  latest_charge: {
    balance_transaction: {
      fee: number;
    } | null;
  } | null;
  metadata: { [key: string]: string } | null;
}

export interface StripeListResponse {
  object: "list";
  data: StripePaymentIntent[];
  has_more: boolean;
  url: string;
}

export async function getStripePaymentIntents(searchTerm?: string, limit: number = 20): Promise<StripeListResponse> {
  let queryString = '';
  // Si le terme de recherche ressemble à un ID de Payment Intent Stripe (commence par 'pi_')
  if (searchTerm && searchTerm.startsWith('pi_')) {
    queryString = `?id=${encodeURIComponent(searchTerm)}`;
  } else {
    // Sinon, on récupère une liste avec la limite donnée. Le filtrage textuel se fera côté client.
    queryString = `?limit=${limit}`;
  }

  const { data, error } = await supabase.functions.invoke(`stripe-proxy${queryString}`);

  if (error) {
    console.error("Error fetching Stripe payment intents:", error);
    throw new Error(`Erreur lors de la récupération des transactions Stripe: ${error.message}`);
  }

  // Handle cases where the function returns an error object within the data
  if (data && data.error) {
    throw new Error(`Erreur du service Stripe: ${data.error}`);
  }

  return data;
}