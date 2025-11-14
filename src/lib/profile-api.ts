import { supabase } from "@/integrations/supabase/client";

export type OnboardingStatus = 'estimation_sent' | 'estimation_validated' | 'cguv_accepted' | 'keys_pending_reception' | 'keys_retrieved' | 'photoshoot_done' | 'live';

export interface KycDocument {
  name: string;
  path: string;
  uploaded_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  phone_number?: string;
  objective_amount?: number;
  cguv_accepted_at?: string;
  cguv_version?: string;
  commission_rate?: number;
  pennylane_customer_id?: string;
  expenses_module_enabled?: boolean;
  digital_booklet_enabled?: boolean;
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
  is_payment_suspended?: boolean;
  is_contract_terminated?: boolean;
  can_manage_prices?: boolean;
  kyc_status?: 'not_verified' | 'pending_review' | 'verified' | 'rejected';
  kyc_documents?: KycDocument[];
  onboarding_status?: OnboardingStatus;
  estimation_details?: string;
  estimated_revenue?: number;
  key_delivery_method?: 'deposit' | 'mail';
  revyoos_holding_ids?: string[];
  cguv_signed_document_url?: string;
  last_seen_at?: string;
  last_sign_in_at?: string;
  referral_code?: string;
  referral_credits?: number;
  krossbooking_property_id?: number;
  stripe_account_id?: string;
}

export async function getProfile(): Promise<UserProfile | null> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Error getting user for profile:", userError?.message);
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      onboarding_status,
      estimation_details,
      estimated_revenue,
      key_delivery_method,
      revyoos_holding_ids,
      kyc_documents,
      krossbooking_property_id
    `)
    .eq('id', user.id)
    .single();

  if (error) {
    console.error("Error fetching user profile:", error.message);
    throw new Error(`Erreur lors de la récupération du profil : ${error.message}`);
  }
  return data;
}

export async function getProfileById(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      onboarding_status,
      estimation_details,
      estimated_revenue,
      key_delivery_method,
      revyoos_holding_ids,
      kyc_documents,
      krossbooking_property_id
    `)
    .eq('id', userId)
    .single();

  if (error) {
    console.error(`Error fetching user profile by ID ${userId}:`, error.message);
    return null;
  }
  return data;
}

export async function updateUserLastSeen(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('profiles')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) {
    console.warn("Could not update user's last_seen_at timestamp:", error.message);
  }
}

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
    body: { phoneNumber, mode: 'profile' },
  });

  if (error) {
    console.error("Error sending SMS OTP:", error);
    throw new Error(error.message || "Une erreur est survenue lors de l'envoi du code.");
  }
  return data;
}

export async function verifySmsOtp(phoneNumber: string, otp: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('verify-sms-otp', {
    body: { phoneNumber, otp, mode: 'profile' },
  });

  if (error) {
    console.error("Error verifying SMS OTP:", error);
    const context = (error as any).context;
    throw new Error(context?.error || error.message || "Une erreur est survenue lors de la vérification du code.");
  }
  return data;
}