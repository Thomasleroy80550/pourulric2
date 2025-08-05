import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "./notifications-api";
import { UserProfile } from "./profile-api";
import { Strategy } from "./strategy-api";

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

export interface AccountantRequest {
  id: string;
  user_id: string;
  accountant_name: string;
  accountant_email: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  }
}

export interface AdminUserRoom extends UserRoom {
  profiles: {
    first_name: string;
    last_name: string;
  } | null;
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
 * Fetches all accountant access requests.
 * @returns A promise that resolves to an array of AccountantRequest objects.
 */
export async function getAccountantRequests(): Promise<AccountantRequest[]> {
  const { data, error } = await supabase
    .from('accountant_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching accountant requests:", error);
    throw new Error("Erreur lors de la récupération des demandes d'accès comptable.");
  }
  return data || [];
}

/**
 * Updates the status of an accountant access request.
 * @param requestId The ID of the request to update.
 * @param status The new status.
 */
export async function updateAccountantRequestStatus(requestId: string, status: 'approved' | 'rejected'): Promise<void> {
  const { error } = await supabase
    .from('accountant_requests')
    .update({ status })
    .eq('id', requestId);

  if (error) {
    console.error("Error updating accountant request status:", error);
    throw new Error(`Erreur lors de la mise à jour de la demande : ${error.message}`);
  }
}

/**
 * Saves a generated invoice/statement to the database.
 * @param userId The ID of the user the invoice belongs to.
 * @param period The period the invoice covers (e.g., "Juin 2024").
 * @param invoiceData The detailed data of the invoice.
 * @param totals The calculated totals for the invoice.
 * @returns A promise that resolves when the invoice is saved.
 */
export async function saveInvoice(userId: any, period: string, invoiceData: any, totals: any): Promise<SavedInvoice> {
  const payload = {
    user_id: userId,
    period: period,
    invoice_data: invoiceData,
    totals: totals,
  };

  // The error indicates that an object might be passed as the first argument.
  // Let's check for that and adjust the payload accordingly.
  if (typeof userId === 'object' && userId !== null) {
    const passedObject = userId;
    payload.user_id = passedObject.user_id;
    payload.period = passedObject.period;
    payload.invoice_data = passedObject.invoice_data;
    payload.totals = passedObject.totals;
  }

  const { data, error } = await supabase
    .from('invoices')
    .insert(payload)
    .select(`*, profiles(first_name, last_name)`)
    .single();

  if (error) {
    console.error("Error saving invoice:", error);
    throw new Error(`Erreur lors de la sauvegarde du relevé : ${error.message}`);
  }

  // Create a notification for the user
  if (data) {
    await createNotification(
      payload.user_id,
      `Votre nouveau relevé pour la période "${payload.period}" est disponible.`,
      '/finances' // Link to the finances page
    );
  }
  return data;
}

/**
 * Triggers an edge function to send the statement via email.
 * @param invoiceId The ID of the invoice to send.
 */
export async function sendStatementByEmail(invoiceId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('send-statement-email', {
    body: { invoiceId },
  });

  if (error) {
    console.error("Error sending statement email:", error);
    throw new Error(`Erreur lors de l'envoi de l'email : ${error.message}`);
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

/**
 * Creates a new user. This is an admin-only function.
 * It invites a user by email.
 * @param userData The user data.
 * @returns A promise that resolves with the created user data.
 */
export async function createUser(userData: { email: string; first_name: string; last_name: string; role: string; }) {
  const { data, error } = await supabase.functions.invoke('create-user-proxy', {
    body: userData,
  });

  if (error) {
    console.error('Error creating user:', error);
    throw new Error(`Erreur lors de la création de l'utilisateur : ${error.message}`);
  }

  return data;
}

export type UpdateUserPayload = { user_id: string } & Partial<Omit<UserProfile, 'id'>>;

/**
 * Updates a user's profile. This is an admin-only function.
 * @param userData The user data to update, including user_id.
 * @returns A promise that resolves with the updated user data.
 */
export async function updateUser(userData: UpdateUserPayload) {
  const { data, error } = await supabase.functions.invoke('update-user-proxy', {
    body: userData,
  });

  if (error) {
    console.error('Error updating user:', error);
    throw new Error(`Erreur lors de la mise à jour de l'utilisateur : ${error.message}`);
  }

  return data;
}

/**
 * Creates a link between an accountant and a client user.
 * @param accountantId The ID of the accountant profile.
 * @param clientId The ID of the client profile.
 */
export async function createAccountantClientRelation(accountantId: string, clientId: string): Promise<void> {
  const { error } = await supabase
    .from('accountant_client_relations')
    .insert({ accountant_id: accountantId, client_id: clientId });

  if (error) {
    console.error("Error creating accountant-client relation:", error);
    throw new Error(`Erreur lors de la liaison du comptable au client : ${error.message}`);
  }
}

/**
 * Fetches all user rooms with associated user profile data. This is an admin-only function.
 * @returns A promise that resolves to an array of AdminUserRoom objects.
 */
export async function getAllUserRooms(): Promise<AdminUserRoom[]> {
  const { data, error } = await supabase
    .from('user_rooms')
    .select(`
      *,
      profiles (
        first_name,
        last_name
      )
    `)
    .order('room_name', { ascending: true });

  if (error) {
    console.error("Error fetching all user rooms:", error);
    throw new Error(`Erreur lors de la récupération de tous les logements utilisateurs : ${error.message}`);
  }
  return data || [];
}

/**
 * Fetches all strategies from the database. Admin only.
 * @returns A promise that resolves to an array of Strategy objects.
 */
export async function getAllStrategies(): Promise<Strategy[]> {
  const { data, error } = await supabase
    .from('strategies')
    .select(`*`);

  if (error) {
    console.error("Error fetching all strategies:", error);
    throw new Error(`Erreur lors de la récupération des stratégies : ${error.message}`);
  }
  return data || [];
}

/**
 * Creates or updates a strategy for a user. Admin only.
 * @param userId The ID of the user.
 * @param adminId The ID of the admin creating the strategy.
 * @param content The content of the strategy.
 * @returns The created or updated strategy.
 */
export async function upsertStrategy(userId: string, adminId: string, content: string): Promise<Strategy> {
  const { data, error } = await supabase
    .from('strategies')
    .upsert({
      user_id: userId,
      created_by: adminId,
      strategy_content: content,
      status: 'active', // Reset status to active on any admin update
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting strategy:', error);
    throw new Error(`Erreur lors de la sauvegarde de la stratégie : ${error.message}`);
  }

  // Notify the user that their strategy has been updated
  await createNotification(
    userId,
    `Votre stratégie de performance a été mise à jour.`,
    '/performance'
  );

  return data;
}

/**
 * Deletes a strategy. Typically used to deny a creation request. Admin only.
 * @param strategyId The ID of the strategy to delete.
 */
export async function deleteStrategy(strategyId: string): Promise<void> {
  const { error } = await supabase
    .from('strategies')
    .delete()
    .eq('id', strategyId);

  if (error) {
    console.error("Error deleting strategy:", error);
    throw new Error(`Erreur lors de la suppression de la stratégie : ${error.message}`);
  }
}