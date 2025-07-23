import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "./notifications-api";
import { UserProfile } from "./profile-api";

export interface SavedInvoice {
  id: string;
  user_id: string;
  period: string;
  invoice_data: any;
  totals: any;
  created_at: string;
  admin_comment?: string;
  profiles: {
    first_name: string;
    last_name: string;
  }
}

/**
 * Fetches all user profiles. This is an admin-only function.
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
 * Fetches all saved invoices/statements from the database.
 * @returns A promise that resolves to an array of SavedInvoice objects.
 */
export async function getSavedInvoices(): Promise<SavedInvoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      profiles (
        first_name,
        last_name
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching all statements:", error);
    throw new Error(`Erreur lors de la récupération des relevés : ${error.message}`);
  }
  return data || [];
}

/**
 * Saves a generated invoice/statement to the database.
 * @param userId The ID of the user the invoice belongs to.
 * @param period The period the invoice covers (e.g., "Juin 2024").
 * @param invoiceData The detailed data of the invoice.
 * @param totals The calculated totals for the invoice.
 * @returns A promise that resolves when the invoice is saved.
 */
export async function saveInvoice(userId: string, period: string, invoiceData: any, totals: any): Promise<void> {
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      user_id: userId,
      period: period,
      invoice_data: invoiceData,
      totals: totals,
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving invoice:", error);
    throw new Error(`Erreur lors de la sauvegarde du relevé : ${error.message}`);
  }

  // Create a notification for the user
  if (data) {
    await createNotification(
      userId,
      `Votre nouveau relevé pour la période "${period}" est disponible.`,
      '/finances' // Link to the finances page
    );
  }
}

/**
 * Adds or updates an admin comment on a specific invoice.
 * @param invoiceId The ID of the invoice to update.
 * @param comment The comment text.
 * @returns A promise that resolves when the comment is saved.
 */
export async function updateInvoiceComment(invoiceId: string, comment: string): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .update({ admin_comment: comment })
    .eq('id', invoiceId);

  if (error) {
    console.error("Error saving admin comment:", error);
    throw new Error(`Erreur lors de la sauvegarde du commentaire : ${error.message}`);
  }
}

/**
 * Deletes a specific invoice.
 * @param invoiceId The ID of the invoice to delete.
 * @returns A promise that resolves when the invoice is deleted.
 */
export async function deleteInvoice(invoiceId: string): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId);

  if (error) {
    console.error("Error deleting invoice:", error);
    throw new Error(`Erreur lors de la suppression du relevé : ${error.message}`);
  }
}