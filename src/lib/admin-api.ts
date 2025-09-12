import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "./notifications-api";
import { UserProfile } from "./profile-api";
import { Strategy } from "./strategy-api";
import { UserRoom } from "./user-room-api"; // Import UserRoom type
import { Idea } from "./ideas-api";

const MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/jnnkji5edohpm7i8mstnq1vwqka0iqj9";

export interface AppSetting {
  key: string;
  value: any;
}

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

export interface InvoiceTotals {
  totalCommission: number;
  totalPrixSejour: number;
  totalFraisMenage: number; // This is from reservations
  totalTaxeDeSejour: number;
  totalRevenuGenere: number;
  totalMontantVerse: number;
  totalNuits: number;
  totalVoyageurs: number;
  totalFacture: number;
  ownerCleaningFee: number; // New field for owner cleaning fee
  transferDetails: {
    sources: { [key: string]: { reservations: any[], total: number } };
    deductionInfo: {
      deducted: boolean;
      source: string;
    };
  };
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

export interface AdminIdea extends Idea {
  profiles: {
    first_name: string;
    last_name: string;
  } | null;
}

export interface UserProfile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  google_sheet_id?: string | null;
  google_sheet_tab?: string | null;
  objective_amount?: number | null;
  cguv_accepted_at?: string | null;
  cguv_version?: string | null;
  pennylane_customer_id?: number | null; // Ceci est la bonne définition
  commission_rate?: number | null;
  phone_number?: string | null;
  expenses_module_enabled?: boolean | null;
  property_address?: string | null;
  property_city?: string | null;
  property_zip_code?: string | null;
  iban_airbnb_booking?: string | null;
  bic_airbnb_booking?: string | null;
  sync_with_hellokeys: boolean;
  iban_abritel_hellokeys?: string | null;
  bic_abritel_hellokeys?: string | null;
  linen_type?: string | null;
  agency?: string | null;
  contract_start_date?: string | null;
  notify_new_booking_email: boolean;
  notify_cancellation_email: boolean;
  notify_new_booking_sms: boolean;
  notify_cancellation_sms: boolean;
  is_banned: boolean;
  kyc_status?: string | null;
  kyc_documents?: any | null;
  can_manage_prices: boolean;
  email?: string | null;
  onboarding_status?: string | null;
  estimation_details?: string | null;
  estimated_revenue?: number | null;
  key_deposit_address?: string | null;
  key_sets_needed?: number | null;
  key_delivery_method?: string | null;
  revyoos_holding_ids?: string[] | null;
  cguv_signed_document_url?: string | null;
  last_seen_at?: string | null;
  referral_code?: string | null;
  referral_credits: number;
  digital_booklet_enabled?: boolean | null;
  krossbooking_property_id?: number | null;
}

/**
 * Interface for the summary of transfers per user.
 */
export interface UserTransferSummary {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  total_amount_to_transfer: number;
  details: {
    period: string;
    amount: number;
    invoice_id: string;
    transfer_completed: boolean;
  }[];
}

export interface BillingStats {
  totalRevenue: number;
  totalCommission: number;
  totalInvoices: number;
  totalCleaningFees: number; // Nouveau champ pour les frais de ménage
  monthlyData: {
    period: string; // e.g., "Jan 2023"
    totalRevenue: number;
    totalCommission: number;
    totalCleaningFees: number; // Nouveau champ
  }[];
}

/**
 * Fetches and aggregates billing statistics for Hello Keys.
 * @param startDate Optional start date for filtering.
 * @param endDate Optional end date for filtering.
 * @returns A promise that resolves to BillingStats object.
 */
export async function getBillingStats(startDate?: Date, endDate?: Date): Promise<BillingStats> {
  let query = supabase
    .from('invoices')
    .select('period, totals, created_at'); // Sélectionner created_at pour le filtrage

  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }
  if (endDate) {
    query = query.lte('created_at', endDate.toISOString());
  }

  const { data: invoices, error } = await query;

  if (error) {
    console.error("Error fetching invoices for billing stats:", error);
    throw new Error(`Erreur lors de la récupération des données de facturation : ${error.message}`);
  }

  let totalRevenue = 0;
  let totalCommission = 0;
  let totalCleaningFees = 0; // Initialiser le nouveau total
  const monthlyMap = new Map<string, { totalRevenue: number; totalCommission: number; totalCleaningFees: number }>(); // Mettre à jour le type de la carte

  const monthNames: { [key: string]: number } = {
    "Janvier": 0, "Février": 1, "Mars": 2, "Avril": 3, "Mai": 4, "Juin": 5,
    "Juillet": 6, "Août": 7, "Septembre": 8, "Octobre": 9, "Novembre": 10, "Décembre": 11
  };

  invoices.forEach(invoice => {
    const period = invoice.period; // e.g., "Juin 2024"
    const revenue = invoice.totals?.totalRevenuGenere || 0;
    const commission = invoice.totals?.totalCommission || 0;
    const cleaningFees = invoice.totals?.totalFraisMenage || 0; // Extraire les frais de ménage

    totalRevenue += revenue;
    totalCommission += commission;
    totalCleaningFees += cleaningFees; // Ajouter au total

    if (!monthlyMap.has(period)) {
      monthlyMap.set(period, { totalRevenue: 0, totalCommission: 0, totalCleaningFees: 0 }); // Initialiser avec les frais de ménage
    }
    const currentMonthData = monthlyMap.get(period)!;
    currentMonthData.totalRevenue += revenue;
    currentMonthData.totalCommission += commission;
    currentMonthData.totalCleaningFees += cleaningFees; // Ajouter aux données mensuelles
  });

  const monthlyData = Array.from(monthlyMap.entries())
    .map(([period, data]) => {
      const parts = period.split(' '); // e.g., ["Juin", "2024"]
      const monthName = parts[0];
      const year = parseInt(parts[1]);
      const monthIndex = monthNames[monthName];

      if (monthIndex === undefined) {
        console.warn(`Unknown month name: ${monthName} in period ${period}`);
        return null;
      }

      return {
        sortKey: new Date(year, monthIndex),
        period,
        totalRevenue: data.totalRevenue,
        totalCommission: data.totalCommission,
        totalCleaningFees: data.totalCleaningFees, // Inclure dans les données mensuelles
      };
    })
    .filter(item => item !== null)
    .sort((a, b) => a!.sortKey.getTime() - b!.sortKey.getTime())
    .map(({ sortKey, ...rest }) => rest);

  return {
    totalRevenue,
    totalCommission,
    totalInvoices: invoices.length,
    totalCleaningFees, // Retourner le total des frais de ménage
    monthlyData: monthlyData as BillingStats['monthlyData'], // Cast to ensure correct type after filter
  };
}

/**
 * Fetches all user profiles. This is an admin-only function.
 * @returns A promise that resolves to an array of UserProfile objects.
 */
export async function getAllProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase.functions.invoke('get-all-users-admin');

  if (error) {
    console.error("Error fetching all profiles via edge function:", error);
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
 * @param pdfPath The path of the generated PDF in Supabase Storage.
 */
export async function sendStatementByEmail(invoiceId: string, pdfPath: string): Promise<void> {
  const { error } = await supabase.functions.invoke('send-statement-email', {
    body: { invoiceId, pdfPath },
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

// Define the type for the user data expected by the create-user-proxy Edge Function
export interface CreateUserPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
  estimation_details?: string;
  estimated_revenue?: number;
}

export interface CreatedUserResponse {
  user: { id: string; email: string; };
  message: string;
}

/**
 * Creates a new user. This is an admin-only function.
 * It creates a user with a temporary password and sends a welcome email.
 * @param userData The user data, including a temporary password.
 * @returns A promise that resolves with the created user data.
 */
export async function createUser(userData: CreateUserPayload): Promise<CreatedUserResponse> {
  const { data, error } = await supabase.functions.invoke('create-user-proxy', {
    body: userData, // Pass the entire userData object as the body
  });

  if (error) {
    console.error('Error creating user:', error);
    throw new Error(`Erreur lors de la création de l'utilisateur : ${error.message}`);
  }

  // The edge function returns { data: { user: User, session: Session | null }, message: "User created successfully." }
  // We want to extract the `user` object directly from this nested structure.
  const createdUserData = data?.data?.user;
  const message = data?.message;

  if (!createdUserData || !createdUserData.id) {
    console.error('Edge function did not return a valid user object:', data);
    throw new Error("La création de l'utilisateur n'a pas retourné d'ID valide depuis la fonction Edge.");
  }

  return { user: { id: createdUserData.id, email: createdUserData.email }, message };
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

/**
 * Fetches all ideas from the database. Admin only.
 * @returns A promise that resolves to an array of AdminIdea objects.
 */
export async function getAllIdeas(): Promise<AdminIdea[]> {
  const { data, error } = await supabase
    .from('ideas')
    .select(`
      *,
      profiles (
        first_name,
        last_name
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching all ideas:", error);
    throw new Error(`Erreur lors de la récupération des idées : ${error.message}`);
  }
  return data || [];
}

/**
 * Updates the status of an idea. Admin only.
 * @param ideaId The ID of the idea to update.
 * @param status The new status.
 * @returns The updated idea.
 */
export async function updateIdeaStatus(ideaId: string, status: string): Promise<Idea> {
  const { data, error } = await supabase
    .from('ideas')
    .update({ status })
    .eq('id', ideaId)
    .select()
    .single();

  if (error) {
    console.error('Error updating idea status:', error);
    throw new Error(`Erreur lors de la mise à jour du statut de l'idée : ${error.message}`);
  }
  return data;
}

/**
 * Deletes an idea. Admin only.
 * @param ideaId The ID of the idea to delete.
 */
export async function deleteIdea(ideaId: string): Promise<void> {
  const { error } = await supabase
    .from('ideas')
    .delete()
    .eq('id', ideaId);

  if (error) {
    console.error("Error deleting idea:", error);
    throw new Error(`Erreur lors de la suppression de l'idée : ${error.message}`);
  }
}

export async function getSetting(key: string): Promise<AppSetting | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('key', key)
    .single();

  if (error && error.code !== 'PGRST116') { // Ignorer les erreurs "non trouvé"
    console.error(`Error fetching setting ${key}:`, error);
    throw new Error(`Erreur lors de la récupération du paramètre : ${error.message}`);
  }
  return data;
}

export async function updateSetting(key: string, value: any): Promise<AppSetting> {
  const { data, error } = await supabase
    .from('app_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select()
    .single();

  if (error) {
    console.error(`Error updating setting ${key}:`, error);
    throw new Error(`Erreur lors de la mise à jour du paramètre : ${error.message}`);
  }
  return data;
}

/**
 * Sends statement data to a Make.com webhook.
 * @param userId The ID of the user the invoice belongs to.
 * @param period The period the invoice covers (e.g., "Juin 2024").
 * @param totals The calculated totals for the invoice.
 * @param dateEmission The date the invoice was issued (YYYY-MM-DD).
 * @param deadlinePaiement The payment deadline date (YYYY-MM-DD).
 */
export async function sendStatementDataToMakeWebhook(
  userId: string,
  period: string,
  totals: InvoiceTotals,
  dateEmission: string,
  deadlinePaiement: string
): Promise<void> {
  try {
    // Fetch the user's profile to get pennylane_customer_id
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('pennylane_customer_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error("Error fetching profile for webhook:", profileError);
      throw new Error(`Failed to fetch profile for webhook: ${profileError.message}`);
    }

    const pennylaneCustomerId = profileData?.pennylane_customer_id || null;

    const payload = {
      pennylane_customer_id: pennylaneCustomerId,
      invoice_period: period,
      commission_hello_keys: totals.totalCommission,
      total_frais_menage: totals.totalFraisMenage,
      owner_cleaning_fee: totals.ownerCleaningFee,
      date_emission: dateEmission,
      deadline_paiement: deadlinePaiement,
    };

    console.log("Sending statement data to Make.com webhook:", payload);

    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to send data to Make.com webhook:", response.status, errorText);
      throw new Error(`Failed to send data to Make.com webhook: ${response.status} - ${errorText}`);
    }

    console.log("Statement data successfully sent to Make.com webhook.");
  } catch (error: any) {
    console.error("Error in sendStatementDataToMakeWebhook:", error.message);
    // Do not re-throw, as this should not block invoice generation
  }
}

/**
 * Calculates the total amount to transfer for each user based on their saved invoices.
 * This is an admin-only function.
 * @returns A promise that resolves to an array of UserTransferSummary objects.
 */
export async function getTransferSummaries(): Promise<UserTransferSummary[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      id,
      user_id,
      period,
      totals,
      transfer_completed,
      profiles (
        first_name,
        last_name
      )
    `);

  if (error) {
    console.error("Error fetching invoices for transfer summary:", error);
    throw new Error(`Erreur lors de la récupération des relevés pour le résumé des virements : ${error.message}`);
  }

  const transferMap = new Map<string, { first_name: string | null, last_name: string | null, total: number, details: { period: string; amount: number; invoice_id: string; transfer_completed: boolean; }[] }>();

  data.forEach(invoice => {
    const userId = invoice.user_id;
    const period = invoice.period;
    const firstName = invoice.profiles?.first_name || null;
    const lastName = invoice.profiles?.last_name || null;
    const invoiceId = invoice.id;
    const transferCompleted = invoice.transfer_completed || false;

    // Recalculate amount to transfer based on relevant sources only
    let amountToTransfer = 0;
    const sources = invoice.totals?.transferDetails?.sources;

    if (sources) {
      // Sum amounts from sources collected by Hello Keys (keys are lowercase)
      if (sources['stripe']) {
        amountToTransfer += sources['stripe'].total || 0;
      }
      if (sources['airbnb']) {
        amountToTransfer += sources['airbnb'].total || 0;
      }
    }

    // Only process if there is an actual amount to transfer from our sources
    if (amountToTransfer > 0) {
      if (transferMap.has(userId)) {
        const current = transferMap.get(userId)!;
        current.total += amountToTransfer;
        current.details.push({ period, amount: amountToTransfer, invoice_id: invoiceId, transfer_completed: transferCompleted });
        transferMap.set(userId, current);
      } else {
        transferMap.set(userId, {
          first_name: firstName,
          last_name: lastName,
          total: amountToTransfer,
          details: [{ period, amount: amountToTransfer, invoice_id: invoiceId, transfer_completed: transferCompleted }]
        });
      }
    }
  });

  return Array.from(transferMap.entries()).map(([userId, summary]) => ({
    user_id: userId,
    first_name: summary.first_name,
    last_name: summary.last_name,
    total_amount_to_transfer: summary.total,
    details: summary.details.sort((a, b) => (b.period || '').localeCompare(a.period || ''))
  }));
}

/**
 * Updates the transfer status of a specific invoice.
 * @param invoiceId The ID of the invoice to update.
 * @param completed The new transfer status.
 * @returns A promise that resolves when the status is updated.
 */
export async function updateTransferStatus(invoiceId: string, completed: boolean): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .update({ transfer_completed: completed })
    .eq('id', invoiceId);

  if (error) {
    console.error("Error updating transfer status:", error);
    throw new Error(`Erreur lors de la mise à jour du statut du virement : ${error.message}`);
  }
}