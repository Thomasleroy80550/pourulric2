import { supabase } from "@/integrations/supabase/client";

export type ProfileUpdatePayload = {
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
  property_address?: string | null;
  property_city?: string | null;
  property_zip_code?: string | null;
  notify_new_booking_email?: boolean;
  notify_cancellation_email?: boolean;
  notify_new_booking_sms?: boolean;
  notify_cancellation_sms?: boolean;
  objective_amount?: number | null;
  commission_rate?: number | null;
  digital_booklet_enabled?: boolean;
  can_manage_prices?: boolean;
  // Ajoutez ici d'autres champs si nécessaire
};

export async function saveProfile(updates: ProfileUpdatePayload) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) {
    throw new Error("Utilisateur non authentifié.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      ...updates,
      // horodatage géré côté DB via triggers/policies si existant
    })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
  return true;
}

// Hook utilitaire pour gérer la sauvegarde avec état de chargement
import { useState, useCallback } from "react";

export function useSaveProfile() {
  const [saving, setSaving] = useState(false);

  const runSave = useCallback(async (payload: ProfileUpdatePayload) => {
    setSaving(true);
    const result = await saveProfile(payload);
    setSaving(false);
    return result;
  }, []);

  return { saving, save: runSave };
}

// Récupérer le profil (utilisateur courant par défaut)
export type Profile = Record<string, any>;

export async function getProfile(userId?: string): Promise<Profile> {
  let uid = userId;
  if (!uid) {
    const { data: sessionData } = await supabase.auth.getSession();
    uid = sessionData.session?.user?.id || undefined;
  }
  if (!uid) {
    throw new Error("Utilisateur non authentifié.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", uid)
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}