import { supabase } from "@/integrations/supabase/client";

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
  kyc_status?: 'not_verified' | 'pending_review' | 'verified' | 'rejected';
  kyc_documents?: { identity?: string; address?: string; };
}

/**
 * Fetches the current user's profile from the 'profiles' table.
 * @returns The user's profile data or null if not found/authenticated.
 */
export async function getProfile(): Promise<UserProfile | null> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Error getting user for profile:", userError?.message);
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id, first_name, last_name, role, phone_number, objective_amount, 
      cguv_accepted_at, cguv_version, commission_rate, pennylane_customer_id, 
      expenses_module_enabled, property_address, property_city, property_zip_code,
      iban_airbnb_booking, bic_airbnb_booking, sync_with_hellokeys, 
      iban_abritel_hellokeys, bic_abritel_hellokeys, linen_type, agency, 
      contract_start_date, notify_new_booking_email, notify_cancellation_email, 
      notify_new_booking_sms, notify_cancellation_sms, is_banned,
      kyc_status, kyc_documents
    `)
    .eq('id', user.id)
    .single();

  if (error) {
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
export async function updateProfile(updates: Partial<Omit<UserProfile, 'id' | 'role'>>): Promise<UserProfile> {
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