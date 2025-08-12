import { supabase } from "@/integrations/supabase/client";

export type OnboardingStatus = 'estimation_sent' | 'estimation_validated' | 'cguv_accepted' | 'keys_pending_reception' | 'keys_retrieved' | 'info_gathering' | 'photoshoot_done' | 'live';

export interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  phone_number?: string;
  objective_amount?: number;
  cguv_accepted_at?: string;
  cguv_version?: string;
  commission_rate?: number;
  pennylane_customer_id?: string;
  expenses_module_enabled?: boolean;
  property_address?: string;
  property_city?: string;
  property_zip_code?: string;
  iban_airbnb_booking?: string;
  bic_airbnb_booking?: string;
  sync_with_hellokeys?: boolean;
  iban_abritel_hellokeys?: string;
  bic_abritel_hellokeys?: string;
  linen_type?: string;
  agency?: string;
  contract_start_date?: string;
  notify_new_booking_email?: boolean;
  notify_cancellation_email?: boolean;
  notify_new_booking_sms?: boolean;
  notify_cancellation_sms?: boolean;
  is_banned?: boolean;
  can_manage_prices?: boolean;
  kyc_status?: 'not_verified' | 'pending_review' | 'verified' | 'rejected';
  kyc_documents?: { identity?: string; address?: string; };
  onboarding_status?: OnboardingStatus;
  estimation_details?: string;
  estimated_revenue?: number;
  key_delivery_method?: 'deposit' | 'mail';
  key_deposit_address?: string;
  key_sets_needed?: number;
}

/**
 * Fetches a user's profile. If userId is provided, fetches for that user.
 * Otherwise, fetches for the currently authenticated user.
 * @param userId Optional. The ID of the user whose profile to fetch.
 * @returns The user's profile data or null if not found.
 */
export async function getProfile(userId?: string): Promise<UserProfile | null> {
  let effectiveUserId = userId;

  if (!effectiveUserId) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Error getting user for profile:", userError?.message);
      return null;
    }
    effectiveUserId = user.id;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', effectiveUserId)
    .single();

  if (error) {
    // .single() throws an error if no row is found. This is not a fatal error,
    // as a profile might not exist yet. We can return null.
    if (error.code === 'PGRST116') {
      console.warn(`Profile not found for user ${effectiveUserId}. This may be expected.`);
      return null;
    }
    // For other errors, we should throw.
    console.error("Error fetching user profile:", error.message);
    throw new Error(`Erreur lors de la récupération du profil : ${error.message}`);
  }
  return data;
}

/**
 * Updates the current user's profile in the 'profiles' table.
 * @param updates An object containing the fields to update.
 * @returns The updated user profile data.
 */
export async function updateProfile(updates: Partial<Omit<UserProfile, 'id' | 'role' | 'is_banned' | 'can_manage_prices' | 'kyc_status'>>): Promise<UserProfile> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Error getting user for profile update:", userError?.message);
    throw new Error("Utilisateur non authentifié.");
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select('*')
    .single();

  if (error) {
    console.error("Error updating user profile:", error.message);
    throw new Error(`Erreur lors de la mise à jour du profil : ${error.message}`);
  }
  return data;
}

export async function sendSmsOtp(phoneNumber: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-sms-otp', {
    body: { phoneNumber },
  });

  if (error) {
    console.error("Error sending SMS OTP:", error);
    throw new Error(error.message);
  }
  return data;
}

export async function verifySmsOtp(phoneNumber: string, otp: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('verify-sms-otp', {
    body: { phoneNumber, otp },
  });

  if (error) {
    console.error("Error verifying SMS OTP:", error);
    const context = (error as any).context;
    throw new Error(context?.error || error.message);
  }
  return data;
}