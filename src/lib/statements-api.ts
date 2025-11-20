import { supabase } from "@/integrations/supabase/client";
import { SavedInvoice } from "./admin-api"; // Re-using the same type

/**
 * Fetches all saved invoices/statements for the currently logged-in user.
 * @returns A promise that resolves to an array of SavedInvoice objects.
 */
export async function getMyStatements(): Promise<SavedInvoice[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // If no user, return empty array as this might be called during logout transition
    return [];
  }

  const { data, error } = await supabase
    .from('invoices')
    .select('*') // Rely on RLS to return only allowed rows (own, delegated, accountant)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching user's statements:", error);
    throw new Error(`Erreur lors de la récupération de vos relevés : ${error.message}`);
  }
  return data || [];
}