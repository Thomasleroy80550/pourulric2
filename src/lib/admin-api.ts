import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "./profile-api"; // Assuming UserProfile is exported from profile-api

export interface SavedInvoice {
  id: string;
  user_id: string;
  period: string;
  invoice_data: any[];
  totals: any;
  created_at: string;
  admin_comment: string | null; // New field for admin comments
  profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export interface NewUserPayload {
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  role: 'user' | 'admin';
}

export interface UpdateUserPayload {
  user_id: string;
  first_name: string;
  last_name: string;
  role: 'user' | 'admin';
}

const CREATE_USER_PROXY_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/create-user-proxy";
const UPDATE_USER_PROXY_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/update-user-proxy";

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
 * Creates a new user via a secure Edge Function. Intended for admin use.
 * @param userData The data for the new user.
 * @returns The newly created user data.
 */
export async function createUser(userData: NewUserPayload): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Admin not authenticated.");

  const response = await fetch(CREATE_USER_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(userData),
  });

  const responseData = await response.json();
  if (!response.ok) {
    throw new Error(responseData.error || "Failed to create user.");
  }
  return responseData.data;
}

/**
 * Updates a user's profile via a secure Edge Function. Intended for admin use.
 * @param userData The data to update for the user.
 * @returns The updated user profile data.
 */
export async function updateUser(userData: UpdateUserPayload): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Admin not authenticated.");

  const response = await fetch(UPDATE_USER_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(userData),
  });

  const responseData = await response.json();
  if (!response.ok) {
    throw new Error(responseData.error || "Failed to update user.");
  }
  return responseData.data;
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
    console.error("Error fetching saved invoices:", error);
    throw new Error(`Erreur lors de la récupération des relevés sauvegardés : ${error.message}`);
  }
  return data || [];
}

/**
 * Updates the admin comment on a specific invoice.
 * @param id The ID of the invoice to update.
 * @param admin_comment The new comment text.
 * @returns The updated invoice record.
 */
export async function updateInvoiceComment(id: string, admin_comment: string | null): Promise<SavedInvoice> {
  const { data, error } = await supabase
    .from('invoices')
    .update({ admin_comment })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error("Error updating invoice comment:", error);
    throw new Error(`Erreur lors de la mise à jour du commentaire : ${error.message}`);
  }
  return data;
}

/**
 * Deletes a specific invoice.
 * @param id The ID of the invoice to delete.
 */
export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error deleting invoice:", error);
    throw new Error(`Erreur lors de la suppression du relevé : ${error.message}`);
  }
}