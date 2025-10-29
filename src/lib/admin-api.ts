import { supabase } from "@/integrations/supabase/client";
import { createNotification, sendEmail } from "./notifications-api";
import { UserProfile } from "./profile-api";
import { Strategy } from "./strategy-api";
import { UserRoom } from "./user-room-api"; // Import UserRoom type
import { Idea } from "./ideas-api";
import { addDays, format, parseISO } from 'date-fns';
import { getProfileById } from "./profile-api"; // Import getProfileById

const MAKE_WEBHOOK_URL_CROTOY = "https://hook.eu1.make.com/jnnkji5edohpm7i8mstnq1vwqka0iqj9";
const MAKE_WEBHOOK_URL_BERCK = "https://hook.eu1.make.com/zuncswymvgd5ixlpio47ffn25de8v6lu";

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
  };
  pennylane_status?: string; // Ajout du statut Pennylane
  pennylane_invoice_url?: string | null; // Nouveau champ pour l'URL de la facture Pennylane
  krossbooking_property_id?: number | null; // Assurez-vous que ce champ est présent
  transfer_statuses?: { [key: string]: boolean } | null; // Remplacement de transfer_completed
  source_type?: 'generated' | 'manual'; // Ajout du type de source
  created_by?: string | null; // Nouvel attribut: admin créateur
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
  } | null;
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
  pennylane_customer_id?: number | null;
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
  is_payment_suspended: boolean;
  is_contract_terminated: boolean; // Nouveau champ pour la résiliation
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
  stripe_account_id?: string | null;
}

export interface RoomUtilityEvent {
  id: string;
  user_room_id: string;
  user_id: string;
  utility: 'electricity' | 'water';
  action: 'cut' | 'restored';
  created_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

/**
 * Interface for the summary of transfers per user.
 */
export interface UserTransferSummary {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  stripe_account_id: string | null; // Ajout de l'ID de compte Stripe
  krossbooking_property_id?: number | null; // Ajout de l'ID de la propriété au niveau du résumé de l'utilisateur
  total_amount_to_transfer: number;
  details: {
    period: string;
    amount: number;
    amountsBySource: { [key: string]: number };
    invoice_id: string;
    transfer_statuses?: { [key: string]: boolean } | null; // Remplacement de transfer_completed
    krossbooking_property_id?: number | null; // Garder ici pour la granularité si une facture peut avoir une propriété différente du profil
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

export interface StripeAccount {
  id: string;
  object: string;
  business_profile: {
    name: string | null;
    url: string | null;
  };
  business_type: string | null;
  charges_enabled: boolean;
  country: string;
  created: number;
  default_currency: string;
  details_submitted: boolean;
  email: string | null;
  payouts_enabled: boolean;
  requirements: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
    disabled_reason: string | null;
  };
  settings: {
    dashboard: {
      display_name: string | null;
    }
  };
  type: string;
}

export interface StripeTransfer {
  id: string;
  object: string;
  amount: number;
  amount_reversed: number;
  balance_transaction: string | null;
  created: number;
  currency: string;
  description: string | null;
  destination: string | null;
  destination_payment: string | null;
  livemode: boolean;
  metadata: Record<string, string>;
  reversed: boolean;
  source_transaction: string | null;
  source_type: string;
  transfer_group: string | null;
}

export interface Prospect {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  message?: string | null;
  consent: boolean;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  source?: string | null;
  page_path?: string | null;
  created_at: string;
  status?: string | null;
  converted_user_id?: string | null;
  archived?: boolean | null;
}

/**
 * Fetches and aggregates billing statistics for Hello Keys.
 * @param period Optional period string (e.g., "Juin 2024") for filtering.
 * @returns A promise that resolves to BillingStats object.
 */
export async function getBillingStats(period?: string): Promise<BillingStats> {
  let query = supabase
    .from('invoices')
    .select('period, totals, created_at');

  if (period) {
    query = query.eq('period', period); // Filtrer par la période textuelle
  }

  const { data: invoices, error } = await query;

  if (error) {
    console.error("Error fetching invoices for billing stats:", error);
    throw new Error(`Erreur lors de la récupération des données de facturation : ${error.message}`);
  }

  let totalRevenue = 0;
  let totalCommission = 0;
  let totalCleaningFees = 0;
  const monthlyMap = new Map<string, { totalRevenue: number; totalCommission: number; totalCleaningFees: number }>();

  const monthNames: { [key: string]: number } = {
    "Janvier": 0, "Février": 1, "Mars": 2, "Avril": 3, "Mai": 4, "Juin": 5,
    "Juillet": 6, "Août": 7, "Septembre": 8, "Octobre": 9, "Novembre": 10, "Décembre": 11
  };

  invoices.forEach(invoice => {
    const invoicePeriod = invoice.period; // e.g., "Juin 2024"
    const revenue = invoice.totals?.totalRevenuGenere || 0;
    const commission = invoice.totals?.totalCommission || 0;
    const cleaningFees = invoice.totals?.totalFraisMenage || 0;

    totalRevenue += revenue;
    totalCommission += commission;
    totalCleaningFees += cleaningFees;

    if (!monthlyMap.has(invoicePeriod)) {
      monthlyMap.set(invoicePeriod, { totalRevenue: 0, totalCommission: 0, totalCleaningFees: 0 });
    }
    const currentMonthData = monthlyMap.get(invoicePeriod)!;
    currentMonthData.totalRevenue += revenue;
    currentMonthData.totalCommission += commission;
    currentMonthData.totalCleaningFees += cleaningFees;
  });

  const monthlyData = Array.from(monthlyMap.entries())
    .map(([invoicePeriod, data]) => {
      const parts = invoicePeriod.split(' ');
      const monthName = parts[0];
      const year = parseInt(parts[1]);
      const monthIndex = monthNames[monthName];

      if (monthIndex === undefined) {
        console.warn(`Unknown month name: ${monthName} in period ${invoicePeriod}`);
        return null;
      }

      return {
        sortKey: new Date(year, monthIndex),
        period: invoicePeriod,
        totalRevenue: data.totalRevenue,
        totalCommission: data.totalCommission,
        totalCleaningFees: data.totalCleaningFees,
      };
    })
    .filter(item => item !== null)
    .sort((a, b) => a!.sortKey.getTime() - b!.sortKey.getTime())
    .map(({ sortKey, ...rest }) => rest);

  return {
    totalRevenue,
    totalCommission,
    totalInvoices: invoices.length,
    totalCleaningFees,
    monthlyData: monthlyData as BillingStats['monthlyData'],
  };
}

/**
 * Fetches all unique invoice periods from the database.
 * @returns A promise that resolves to an array of unique period strings.
 */
export async function getAllInvoicePeriods(): Promise<string[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('period')
    .order('created_at', { ascending: false }); // Order to get recent periods first

  if (error) {
    console.error("Error fetching invoice periods:", error);
    throw new Error(`Erreur lors de la récupération des périodes de facturation : ${error.message}`);
  }

  const uniquePeriods = Array.from(new Set(data.map(item => item.period)));

  // Sort periods chronologically
  const monthNames: { [key: string]: number } = {
    "Janvier": 0, "Février": 1, "Mars": 2, "Avril": 3, "Mai": 4, "Juin": 5,
    "Juillet": 6, "Août": 7, "Septembre": 8, "Octobre": 9, "Novembre": 10, "Décembre": 11
  };

  uniquePeriods.sort((a, b) => {
    const [monthA, yearA] = a.split(' ');
    const [monthB, yearB] = b.split(' ');
    const dateA = new Date(parseInt(yearA), monthNames[monthA]);
    const dateB = new Date(parseInt(yearB), monthNames[monthB]);
    return dateA.getTime() - dateB.getTime();
  });

  return uniquePeriods;
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
      profiles!user_id (
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
 * Fetches all saved invoices/statements for a specific user.
 * @param userId The ID of the user.
 * @returns A promise that resolves to an array of SavedInvoice objects.
 */
export async function getInvoicesByUserId(userId: string): Promise<SavedInvoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error(`Error fetching invoices for user ${userId}:`, error);
    throw new Error(`Erreur lors de la récupération des relevés pour l'utilisateur : ${error.message}`);
  }
  return data || [];
}

/**
 * Fetches a single saved invoice/statement by its ID from the database.
 * @param invoiceId The ID of the invoice to fetch.
 * @returns A promise that resolves to a SavedInvoice object or null if not found.
 */
export async function getInvoiceById(invoiceId: string): Promise<SavedInvoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      profiles!user_id (
        first_name,
        last_name
      )
    `)
    .eq('id', invoiceId)
    .single();

  if (error) {
    console.error(`Error fetching invoice with ID ${invoiceId}:`, error);
    throw new Error(`Erreur lors de la récupération du relevé : ${error.message}`);
  }
  return data || null;
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
  let actualUserId = userId;
  // The error indicates that an object might be passed as the first argument.
  // Let's check for that and adjust the payload accordingly.
  if (typeof userId === 'object' && userId !== null) {
    const passedObject = userId;
    actualUserId = passedObject.user_id;
    period = passedObject.period;
    invoiceData = passedObject.invoice_data;
    totals = passedObject.totals;
  }

  // Fetch krossbooking_property_id from the user's profile
  const userProfile = await getProfileById(actualUserId);
  const krossbookingPropertyId = userProfile?.krossbooking_property_id || null;

  // Récupère l'admin connecté pour l'attribuer à created_by
  const { data: authData } = await supabase.auth.getUser();
  const creatorId = authData?.user?.id ?? null;

  const payload = {
    user_id: actualUserId,
    period: period,
    invoice_data: invoiceData,
    totals: totals,
    krossbooking_property_id: krossbookingPropertyId, // Add krossbooking_property_id to the payload
    created_by: creatorId, // Enregistre l'admin qui crée le relevé
  };

  const { data, error } = await supabase
    .from('invoices')
    .insert(payload)
    .select(`*, profiles!user_id (first_name, last_name)`)
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
 * Updates an existing invoice/statement in the database.
 * @param invoiceId The ID of the invoice to update.
 * @param userId The ID of the user the invoice belongs to.
 * @param period The period the invoice covers.
 * @param invoiceData The detailed data of the invoice.
 * @param totals The calculated totals for the invoice.
 * @returns A promise that resolves with the updated invoice data.
 */
export async function updateInvoice(invoiceId: string, userId: string, period: string, invoiceData: any, totals: any): Promise<SavedInvoice> {
  // Fetch krossbooking_property_id from the user's profile
  const userProfile = await getProfileById(userId);
  const krossbookingPropertyId = userProfile?.krossbooking_property_id || null;

  const payload = {
    user_id: userId,
    period: period,
    invoice_data: invoiceData,
    totals: totals,
    krossbooking_property_id: krossbookingPropertyId, // Add krossbooking_property_id to the payload
  };

  const { data, error } = await supabase
    .from('invoices')
    .update(payload)
    .eq('id', invoiceId)
    .select(`*, profiles!user_id (first_name, last_name)`)
    .single();

  if (error) {
    console.error("Error updating invoice:", error);
    throw new Error(`Erreur lors de la mise à jour du relevé : ${error.message}`);
  }

  if (data) {
    await createNotification(
      payload.user_id,
      `Votre relevé pour la période "${payload.period}" a été mis à jour.`,
      '/finances'
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

export async function deleteManualInvoice(invoiceId: string): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId)
    .eq('source_type', 'manual'); // sécurité : uniquement manuel

  if (error) {
    console.error('Erreur suppression facture manuelle:', error);
    throw new Error(`Impossible de supprimer la statistique : ${error.message}`);
  }
}

export interface ManualStatementEntry {
  period: string;
  totalCA: number;
  totalMontantVerse: number;
  totalFacture: number;
  totalNuits: number;
  totalVoyageurs: number;
  totalReservations: number;
}

export async function addManualStatements(userId: string, statements: ManualStatementEntry[]): Promise<SavedInvoice[]> {
  // Récupère l'admin connecté pour l'attribuer à created_by
  const { data: authData } = await supabase.auth.getUser();
  const creatorId = authData?.user?.id ?? null;

  const insertPayloads = statements.map(statement => {
    const { period, totalCA, totalMontantVerse, totalFacture, totalNuits, totalVoyageurs, totalReservations } = statement;

    const totals = {
      totalCA,
      totalMontantVerse,
      totalFacture,
      totalNuits,
      totalVoyageurs,
      totalReservations,
      // Default other values to 0 to prevent errors on frontend
      totalCommission: 0,
      totalPrixSejour: 0,
      totalFraisMenage: 0,
      totalTaxeDeSejour: 0,
      totalRevenuGenere: 0,
      ownerCleaningFee: 0,
      transferDetails: {},
    };

    return {
      user_id: userId,
      period,
      invoice_data: [], // Empty for manual stats
      totals,
      source_type: 'manual' as const,
      pennylane_status: 'not_applicable',
      created_by: creatorId, // trace l'admin créateur
    };
  });

  if (insertPayloads.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('invoices')
    .insert(insertPayloads)
    .select(`*, profiles!user_id (first_name, last_name)`);
  
  if (error) {
    console.error("Error saving manual statements:", error);
    throw new Error(`Erreur lors de la sauvegarde des statistiques manuelles : ${error.message}`);
  }

  // No notification or webhook call for manual entries.
  return data || [];
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
  pennylane_customer_id?: number; // Nouveau champ
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
 * Changes a user's password. This is an admin-only function.
 * @param userId The ID of the user whose password to change.
 * @param newPassword The new password.
 */
export async function changeUserPassword(userId: string, newPassword: string): Promise<void> {
  const { error } = await supabase.functions.invoke('update-user-password', {
    body: { user_id: userId, new_password: newPassword },
  });

  if (error) {
    console.error('Error changing user password:', error);
    throw new Error(`Erreur lors du changement de mot de passe : ${error.message}`);
  }
}

// Générateur de mot de passe temporaire robuste
function generateTempPassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const array = new Uint32Array(length);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < length; i++) array[i] = Math.floor(Math.random() * 0xffffffff);
  }
  return Array.from(array, (v) => chars[v % chars.length]).join('');
}

/**
 * Réinitialise le mot de passe d'un utilisateur avec un mot de passe temporaire
 * et renvoie un email de création de compte contenant ces informations.
 */
export async function resendWelcomeEmail(userId: string): Promise<void> {
  // 1) Récupérer le profil pour obtenir l'email et le nom
  const profile = await getProfileById(userId);
  if (!profile || !profile.email) {
    throw new Error("Impossible de trouver l'email de l'utilisateur.");
  }

  // 2) Générer un mot de passe temporaire
  const tempPassword = generateTempPassword();

  // 3) Mettre à jour le mot de passe côté auth via l'edge function existante
  const { error: pwError } = await supabase.functions.invoke('update-user-password', {
    body: { user_id: userId, new_password: tempPassword },
  });
  if (pwError) {
    console.error('Error updating password for welcome email:', pwError);
    throw new Error(`Erreur lors de la réinitialisation du mot de passe : ${pwError.message}`);
  }

  // 4) Envoyer l'email à l'utilisateur
  const loginUrl = 'https://beta.proprietaire.hellokeys.fr/login';
  const displayName = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Bonjour';
  const subject = "Votre accès Hello Keys – mot de passe temporaire";
  const html = `
    <p>${displayName},</p>
    <p>Votre compte Hello Keys est prêt. Voici vos identifiants de connexion&nbsp;:</p>
    <ul>
      <li>Email&nbsp;: <strong>${profile.email}</strong></li>
      <li>Mot de passe temporaire&nbsp;: <strong>${tempPassword}</strong></li>
    </ul>
    <p>Connectez-vous dès maintenant puis changez votre mot de passe depuis votre profil.</p>
    <p><a href="${loginUrl}" style="display:inline-block;padding:10px 16px;background:#111827;color:#fff;border-radius:8px;text-decoration:none">Se connecter</a></p>
    <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    <p>Cordialement,<br/>L'équipe Hello Keys</p>
  `;

  await sendEmail(profile.email, subject, html);
}

/**
 * Updates a user's email. This is an admin-only function.
 * @param userId The ID of the user whose email to update.
 * @param newEmail The new email address.
 */
export async function updateUserEmail(userId: string, newEmail: string): Promise<void> {
  const { error } = await supabase.functions.invoke('update-user-email', {
    body: { user_id: userId, new_email: newEmail },
  });

  if (error) {
    console.error('Error updating user email:', error);
    throw new Error(`Erreur lors de la mise à jour de l'email : ${error.message}`);
  }
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
 * Fetches all Stripe connected accounts. Admin only.
 * @returns A promise that resolves to an array of StripeAccount objects.
 */
export async function listStripeAccounts(): Promise<StripeAccount[]> {
  const { data, error } = await supabase.functions.invoke('list-stripe-accounts');

  if (error) {
    console.error('Error fetching Stripe accounts:', error);
    throw new Error(`Erreur lors de la récupération des comptes Stripe : ${error.message}`);
  }

  return data || [];
}

/**
 * Fetches a single Stripe connected account by its ID. Admin only.
 * @param accountId The ID of the Stripe account to fetch.
 * @returns A promise that resolves to a StripeAccount object.
 */
export async function getStripeAccount(accountId: string): Promise<StripeAccount> {
  const { data, error } = await supabase.functions.invoke('get-stripe-account', {
    body: { account_id: accountId },
  });

  if (error) {
    console.error(`Error fetching Stripe account ${accountId}:`, error);
    throw new Error(`Erreur lors de la récupération du compte Stripe : ${error.message}`);
  }

  return data;
}

/**
 * Creates a new Stripe connected account for a user. Admin only.
 * @param email The user's email.
 * @param country The user's country code (e.g., 'FR', 'US').
 * @returns A promise that resolves to the created StripeAccount object.
 */
export async function createStripeAccount(email: string, country: string): Promise<StripeAccount> {
  const { data, error } = await supabase.functions.invoke('create-stripe-account', {
    body: { email, country },
  });

  if (error) {
    console.error('Error creating Stripe account:', error);
    throw new Error(`Erreur lors de la création du compte Stripe : ${error.message}`);
  }

  return data;
}

/**
 * Fetches a list of Stripe transfers for a given connected account. Admin only.
 * @param accountId The ID of the Stripe account to fetch transfers for.
 * @returns A promise that resolves to an array of StripeTransfer objects.
 */
export async function listStripeTransfers(accountId: string): Promise<StripeTransfer[]> {
  const { data, error } = await supabase.functions.invoke('list-stripe-transfers', {
    body: { account_id: accountId },
  });

  if (error) {
    console.error(`Error fetching Stripe transfers for account ${accountId}:`, error);
    throw new Error(`Erreur lors de la récupération des transferts Stripe : ${error.message}`);
  }

  return data || [];
}

/**
 * Fetches a summary of transfers for all users, aggregating invoice details.
 * @returns A promise that resolves to an array of UserTransferSummary objects.
 */
export async function getTransferSummaries(): Promise<UserTransferSummary[]> {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`
      id,
      user_id,
      period,
      totals,
      transfer_statuses,
      krossbooking_property_id,
      profiles!user_id (
        first_name,
        last_name,
        stripe_account_id,
        krossbooking_property_id
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching invoices for transfer summary:", error);
    throw new Error(`Erreur lors de la récupération des relevés pour la synthèse des virements : ${error.message}`);
  }

  const userSummariesMap = new Map<string, UserTransferSummary>();

  invoices.forEach(invoice => {
    const userId = invoice.user_id;
    const firstName = invoice.profiles?.first_name || 'N/A';
    const lastName = invoice.profiles?.last_name || 'N/A';
    const stripeAccountId = invoice.profiles?.stripe_account_id || null;
    const userKrossbookingPropertyId = invoice.profiles?.krossbooking_property_id || null; // Get from profile

    if (!userSummariesMap.has(userId)) {
      userSummariesMap.set(userId, {
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        stripe_account_id: stripeAccountId,
        krossbooking_property_id: userKrossbookingPropertyId, // Assign to user summary
        total_amount_to_transfer: 0,
        details: [],
      });
    }

    const summary = userSummariesMap.get(userId)!;
    const amount = invoice.totals?.transferDetails?.sources?.stripe?.total || invoice.totals?.totalMontantVerse || 0; // Prioritize stripe total if available, otherwise totalMontantVerse

    summary.details.push({
      period: invoice.period,
      amount: amount,
      amountsBySource: invoice.totals?.transferDetails?.sources ? 
                       Object.fromEntries(Object.entries(invoice.totals.transferDetails.sources).map(([key, value]: [string, any]) => [key, value.total])) : 
                       { 'total': amount }, // Fallback if sources are not detailed
      invoice_id: invoice.id,
      transfer_statuses: invoice.transfer_statuses,
      krossbooking_property_id: invoice.krossbooking_property_id, // Keep invoice's property ID for detail if it exists
    });

    const pendingAmount = Object.entries(summary.details[summary.details.length - 1].amountsBySource)
      .reduce((acc, [source, sourceAmount]) => {
        if (!invoice.transfer_statuses?.[source]) {
          return acc + sourceAmount;
        }
        return acc;
      }, 0);
    
    summary.total_amount_to_transfer += pendingAmount;
  });

  // The client will handle filtering for pending/all transfers.
  return Array.from(userSummariesMap.values());
}

/**
 * Sends statement data to a Make.com webhook.
 * @param invoiceId The ID of the invoice to send.
 * @param invoicePeriod The period the invoice covers (e.g., "Juin 2024").
 * @param totals The calculated totals for the invoice.
 * @param dateEmission The date the invoice was issued (YYYY-MM-DD).
 * @param deadlinePaiement The payment deadline date (YYYY-MM-DD).
 */
export async function sendStatementDataToMakeWebhook(
  invoiceId: string,
  invoicePeriod: string,
  totals: InvoiceTotals,
  dateEmission: string,
  deadlinePaiement: string
): Promise<void> {
  try {
    // Set status to 'processing'
    await supabase.from('invoices').update({ pennylane_status: 'processing' }).eq('id', invoiceId);

    // Fetch the user's profile to get pennylane_customer_id
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .select('user_id')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoiceData) {
      await supabase.from('invoices').update({ pennylane_status: 'error' }).eq('id', invoiceId);
      throw new Error(`Failed to fetch invoice for webhook: ${invoiceError?.message}`);
    }

    const userId = invoiceData.user_id;

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('pennylane_customer_id, krossbooking_property_id') // Fetch krossbooking_property_id
      .eq('id', userId)
      .single();

    if (profileError) {
      await supabase.from('invoices').update({ pennylane_status: 'error' }).eq('id', invoiceId);
      throw new Error(`Failed to fetch profile for webhook: ${profileError.message}`);
    }

    const pennylaneCustomerId = profileData?.pennylane_customer_id || null;
    const krossbookingPropertyId = profileData?.krossbooking_property_id;

    let webhookUrl = '';
    if (krossbookingPropertyId === 1) {
      webhookUrl = MAKE_WEBHOOK_URL_CROTOY;
    } else if (krossbookingPropertyId === 2) {
      webhookUrl = MAKE_WEBHOOK_URL_BERCK;
    } else {
      // Default or error handling if krossbooking_property_id is not 1 or 2
      await supabase.from('invoices').update({ pennylane_status: 'error' }).eq('id', invoiceId);
      throw new Error(`Unknown krossbooking_property_id: ${krossbookingPropertyId} for user ${userId}. Cannot determine webhook URL.`);
    }

    const payload = {
      pennylane_customer_id: pennylaneCustomerId,
      invoice_period: invoicePeriod,
      commission_hello_keys: totals.totalCommission,
      total_frais_menage: totals.totalFraisMenage,
      owner_cleaning_fee: totals.ownerCleaningFee,
      date_emission: dateEmission,
      deadline_paiement: deadlinePaiement,
    };

    console.log("Sending statement data to Make.com webhook:", payload);

    const response = await fetch(webhookUrl, { // Use the dynamically determined webhookUrl
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      await supabase.from('invoices').update({ pennylane_status: 'error' }).eq('id', invoiceId);
      console.error("Failed to send data to Make.com webhook:", response.status, errorText);
      // Do not throw, just log and update status
      return;
    }

    const responseData = await response.json();
    let updatePayload: { pennylane_status: string; pennylane_invoice_url?: string } = { pennylane_status: 'success' };

    if (responseData && responseData.pennylane_invoice_url) {
      updatePayload.pennylane_invoice_url = responseData.pennylane_invoice_url;
    }

    await supabase.from('invoices').update(updatePayload).eq('id', invoiceId);
    console.log("Statement data successfully sent to Make.com webhook.");
  } catch (error: any) {
    await supabase.from('invoices').update({ pennylane_status: 'error' }).eq('id', invoiceId);
    console.error("Error in sendStatementDataToMakeWebhook:", error.message);
    // Do not re-throw, as this should not block invoice generation
  }
}

/**
 * Re-sends statement data to the Make.com webhook for Pennylane integration.
 * @param invoiceId The ID of the invoice to resend.
 */
export async function resendStatementToPennylane(invoiceId: string): Promise<void> {
  // 1. Fetch the invoice data
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('id, user_id, period, totals, created_at')
    .eq('id', invoiceId)
    .single();

  if (error || !invoice) {
    console.error("Error fetching invoice to resend:", error);
    throw new Error("Impossible de trouver le relevé à relancer.");
  }

  // 2. Prepare data for the webhook function
  const { user_id, period, totals } = invoice;
  const emissionDate = new Date(); // Utiliser la date du jour pour la relance
  const deadlineDate = addDays(emissionDate, 15);
  const formattedEmissionDate = format(emissionDate, 'yyyy-MM-dd');
  const formattedDeadlineDate = format(deadlineDate, 'yyyy-MM-dd');

  // 3. Call the webhook function
  await sendStatementDataToMakeWebhook(
    invoiceId,
    period,
    totals,
    formattedEmissionDate,
    formattedDeadlineDate
  );
}

/**
 * Creates an onboarding link for a Stripe connected account. Admin only.
 * @param accountId The ID of the Stripe account.
 * @param refreshUrl The URL to redirect to if the user needs to refresh the onboarding.
 * @param returnUrl The URL to redirect to after the user completes the onboarding.
 * @returns A promise that resolves to the account link data.
 */
export async function createStripeAccountLink(accountId: string, refreshUrl?: string, returnUrl?: string): Promise<any> {
  const { data, error } = await supabase.functions.invoke('create-stripe-account-link', {
    body: { account_id: accountId, refresh_url: refreshUrl, return_url: returnUrl },
  });

  if (error) {
    console.error('Error creating Stripe account link:', error);
    throw new Error(`Erreur lors de la création du lien d'onboarding Stripe : ${error.message}`);
  }

  return data;
}

/**
 * Initiates a Stripe payout process (Transfer + Payout).
 * @param payoutDetails Details for the payout.
 * @returns A promise that resolves when the payout is initiated.
 */
export async function initiateStripePayout(payoutDetails: {
  destinationAccountId: string;
  amount: number; // Amount in cents
  currency: string;
  invoiceIds: string[];
  description?: string;
}): Promise<any> {
  const { data, error } = await supabase.functions.invoke('initiate-stripe-payout', {
    body: {
      destination_account_id: payoutDetails.destinationAccountId,
      amount: payoutDetails.amount,
      currency: payoutDetails.currency,
      invoice_ids: payoutDetails.invoiceIds,
      description: payoutDetails.description,
    },
  });

  if (error) {
    console.error("Error initiating Stripe payout:", error);
    throw new Error(`Erreur lors de l'initiation du virement Stripe : ${error.message}`);
  }

  // --- Start: Add email notification ---
  try {
    if (payoutDetails.invoiceIds && payoutDetails.invoiceIds.length > 0) {
      // Get user_id from the first invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('user_id')
        .eq('id', payoutDetails.invoiceIds[0])
        .single();

      if (invoiceError || !invoiceData) {
        console.error("Error fetching user_id for email notification:", invoiceError);
        // Don't throw, just log and continue
      } else {
        const userId = invoiceData.user_id;
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('id', userId)
          .single();

        if (profileError || !profileData || !profileData.email) {
          console.error("Error fetching profile for email notification:", profileError);
          // Don't throw, just log and continue
        } else {
          const { email, first_name, last_name } = profileData;
          const formattedAmount = (payoutDetails.amount / 100).toFixed(2); // Convert cents to currency
          const subject = `Votre virement de ${formattedAmount} ${payoutDetails.currency.toUpperCase()} a été initié !`;
          const htmlBody = `
            <p>Bonjour ${first_name || ''} ${last_name || ''},</p>
            <p>Nous avons le plaisir de vous informer qu'un virement de <strong>${formattedAmount} ${payoutDetails.currency.toUpperCase()}</strong> a été initié vers votre compte Stripe connecté.</p>
            <p>Ce virement correspond aux montants dus pour les relevés suivants : ${payoutDetails.invoiceIds.join(', ')}.</p>
            <p>Vous devriez recevoir les fonds sur votre compte bancaire lié à Stripe dans les prochains jours ouvrables.</p>
            <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
            <p>Cordialement,</p>
            <p>L'équipe Hello Keys</p>
          `;

          await sendEmail(email, subject, htmlBody);
          console.log(`Email notification sent to ${email} for payout.`);
        }
      }
    }
  } catch (emailError) {
    console.error("Failed to send payout email notification:", emailError);
    // Continue execution, email notification failure should not stop the payout
  }
  // --- End: Add email notification ---

  return data;
}

/**
 * Triggers the reconciliation process between Stripe transfers and local invoices.
 * @returns A promise that resolves with the number of updated invoices.
 */
export async function reconcileStripeTransfers(): Promise<{ updatedCount: number }> {
  const { data, error } = await supabase.functions.invoke('reconcile-stripe-transfers');

  if (error) {
    console.error("Error reconciling Stripe transfers:", error);
    throw new Error(`Erreur lors du rapprochement Stripe : ${error.message}`);
  }

  if (data.error) {
    throw new Error(`Erreur lors du rapprochement Stripe : ${data.error}`);
  }

  return data;
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

/**
 * Updates the transfer status for a specific source of an invoice.
 * @param invoiceId The ID of the invoice to update.
 * @param source The payment source (e.g., 'stripe', 'airbnb').
 * @param completed The new transfer status for the source.
 * @returns A promise that resolves when the status is updated.
 */
export async function updateInvoiceSourceTransferStatus(invoiceId: string, source: string, completed: boolean): Promise<void> {
  const { error } = await supabase.rpc('update_invoice_source_status', {
    p_invoice_id: invoiceId,
    p_source: source,
    p_status: completed,
  });

  if (error) {
    console.error("Error updating source transfer status:", error);
    throw new Error(`Erreur lors de la mise à jour du statut du virement pour la source ${source} : ${error.message}`);
  }
}

/**
 * Met à jour le statut de coupure d'un compteur et enregistre un événement d'historique.
 * @param userRoomId ID du logement (user_rooms.id)
 * @param utility 'electricity' | 'water'
 * @param isCut true = coupé, false = rétabli
 */
export async function setRoomUtilityCutStatus(
  userRoomId: string,
  utility: 'electricity' | 'water',
  isCut: boolean
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utilisateur non authentifié.");

  const column = utility === 'electricity' ? 'is_electricity_cut' : 'is_water_cut';

  const { error: updateError } = await supabase
    .from('user_rooms')
    .update({ [column]: isCut })
    .eq('id', userRoomId);

  if (updateError) {
    console.error("Error updating counter status:", updateError);
    throw new Error(`Erreur lors de la mise à jour du compteur : ${updateError.message}`);
  }

  const { error: insertError } = await supabase
    .from('room_utility_events')
    .insert({
      user_room_id: userRoomId,
      user_id: user.id,
      utility,
      action: isCut ? 'cut' : 'restored',
    });

  if (insertError) {
    console.error("Error logging utility event:", insertError);
    // On n'empêche pas la MAJ si le log échoue, mais on informe
  }
}

/**
 * Récupère l'historique des compteurs d'un logement
 */
export async function getRoomUtilityEvents(userRoomId: string): Promise<RoomUtilityEvent[]> {
  const { data, error } = await supabase
    .from('room_utility_events')
    .select(`
      *,
      profiles!user_id (
        first_name,
        last_name
      )
    `)
    .eq('user_room_id', userRoomId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching room utility events:", error);
    throw new Error(`Erreur lors de la récupération de l'historique : ${error.message}`);
  }
  return data || [];
}

/**
 * Envoie une relance de paiement par email (avec pièces jointes) pour une facture donnée.
 * Admin uniquement.
 */
export async function sendPaymentReminder(invoiceId: string, statementPath?: string): Promise<void> {
  const { error } = await supabase.functions.invoke('send-payment-reminder', {
    body: { invoice_id: invoiceId, statement_path: statementPath },
  });

  if (error) {
    console.error("Error sending payment reminder:", error);
    throw new Error(`Erreur lors de l'envoi de la relance : ${error.message}`);
  }
}

export async function getLatestProspects(limit: number = 10): Promise<Prospect[]> {
  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('archived', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching prospects:", error);
    throw new Error("Erreur lors de la récupération des prospects.");
  }
  return data || [];
}

// Nouveau: types et fonctions de gestion de prospects
export type ProspectStatus = 'new' | 'callback_pending' | 'cancelled' | 'converted';

export async function updateProspectStatus(id: string, status: ProspectStatus): Promise<void> {
  const updateData: Record<string, any> = { status };
  if (status === 'cancelled') {
    updateData.archived = true;
  }

  const { error } = await supabase
    .from('prospects')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error("Error updating prospect status:", error);
    throw new Error(`Erreur lors de la mise à jour du prospect : ${error.message}`);
  }
}

export async function convertProspectToClient(prospect: Prospect): Promise<{ userId: string }> {
  if (!prospect.email || !prospect.first_name || !prospect.last_name) {
    throw new Error("Le prospect doit avoir email, prénom et nom pour être converti.");
  }

  // Générer un mot de passe temporaire robuste (utilise le générateur interne)
  const tempPassword = generateTempPassword();

  // Créer l'utilisateur via l'edge function (enverra un email de bienvenue automatiquement)
  const { user } = await createUser({
    email: prospect.email,
    password: tempPassword,
    first_name: prospect.first_name,
    last_name: prospect.last_name,
    role: 'user',
  });

  // Mettre à jour le prospect comme converti et lier l'utilisateur créé
  const { error } = await supabase
    .from('prospects')
    .update({ status: 'converted', converted_user_id: user.id })
    .eq('id', prospect.id);

  if (error) {
    console.error("Error marking prospect converted:", error);
    throw new Error(`Erreur lors de la mise à jour du prospect converti : ${error.message}`);
  }

  return { userId: user.id };
}