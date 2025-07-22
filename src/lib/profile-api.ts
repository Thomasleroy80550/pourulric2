import { supabase } from "@/integrations/supabase/client";

export interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  google_sheet_id?: string;
  google_sheet_tab?: string;
  objective_amount?: number; // Nouvelle propriété pour l'objectif en Euros
  cguv_accepted_at?: string; // Nouveau champ pour la date d'acceptation des CGUV
  cguv_version?: string;      // Nouveau champ pour la version des CGUV acceptée
  commission_rate?: number; // Nouveau champ pour le taux de commission
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
    .select('id, first_name, last_name, role, google_sheet_id, google_sheet_tab, objective_amount, cguv_accepted_at, cguv_version, commission_rate') // Sélectionner les nouvelles colonnes
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
    .select()
    .single();

  if (error) {
    console.error("Error updating user profile:", error.message);
    throw new Error(`Erreur lors de la mise à jour du profil : ${error.message}`);
  }
  return data;
}