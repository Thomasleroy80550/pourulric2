import { supabase } from "@/integrations/supabase/client";

export interface StripePaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  customer: string | null;
  description: string | null;
  receipt_email: string | null;
}

export interface StripeListResponse {
  object: "list";
  data: StripePaymentIntent[];
  has_more: boolean;
  url: string;
}

export async function getStripePaymentIntents(id?: string): Promise<StripeListResponse> {
  let queryString = '';
  if (id) {
    queryString = `?id=${encodeURIComponent(id)}`;
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