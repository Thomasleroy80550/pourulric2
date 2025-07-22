import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "./profile-api"; // Assuming UserProfile is exported from profile-api

/**
 * Fetches all user profiles. Intended for admin use.
 * @returns A promise that resolves to an array of UserProfile objects.
 */
export async function getAllProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('first_name', { ascending: true });

  if (error) {
    console.error("Error fetching all profiles:", error);
    throw new Error(`Erreur lors de la récupération des profils : ${error.message}`);
  }
  return data || [];
}

/**
 * Saves a generated invoice to the database.
 * @param invoicePayload The data for the invoice to be saved.
 * @returns The created invoice record.
 */
export async function saveInvoice(invoicePayload: {
  user_id: string;
  period: string;
  invoice_data: any[];
  totals: object;
}): Promise<any> {
  const { data, error } = await supabase
    .from('invoices')
    .insert([invoicePayload])
    .select()
    .single();

  if (error) {
    console.error("Error saving invoice:", error);
    throw new Error(`Erreur lors de la sauvegarde de la facture : ${error.message}`);
  }
  return data;
}