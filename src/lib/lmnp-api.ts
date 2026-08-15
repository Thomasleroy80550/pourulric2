import { supabase } from "@/integrations/supabase/client";

export const LMNP_MODULE_NAME = "Compta LMNP";

// Interrupteur : tant que false, les clients ne peuvent pas demander l'activation
// (phase de validation du bilan de test par l'expert-comptable).
export const LMNP_ACTIVATION_OPEN = false;

export interface LmnpSettings {
  user_id: string;
  declarant_name?: string | null;
  siret?: string | null;
  activity_start_date?: string | null; // ISO date
  property_address?: string | null;
  regime?: string | null;
  deferred_amortization?: number | null;
  prior_deficits?: number | null;
  created_at?: string;
  updated_at?: string;
}

export type LmnpAssetCategory =
  | "Bâti (hors terrain)"
  | "Travaux / Aménagements"
  | "Mobilier / Équipement"
  | "Frais d'acquisition (notaire, agence)";

export const LMNP_ASSET_CATEGORIES: { value: LmnpAssetCategory; defaultYears: number }[] = [
  { value: "Bâti (hors terrain)", defaultYears: 30 },
  { value: "Travaux / Aménagements", defaultYears: 10 },
  { value: "Mobilier / Équipement", defaultYears: 7 },
  { value: "Frais d'acquisition (notaire, agence)", defaultYears: 30 },
];

export interface LmnpFixedAsset {
  id: string;
  user_id: string;
  label: string;
  category: string;
  acquisition_date: string; // ISO date
  amount: number;
  duration_years: number;
  created_at: string;
}

export type NewLmnpFixedAsset = Omit<LmnpFixedAsset, "id" | "user_id" | "created_at">;

// --- Settings ---

export async function getLmnpSettings(): Promise<LmnpSettings | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("lmnp_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching LMNP settings:", error);
    throw new Error(`Erreur lors de la récupération des paramètres LMNP : ${error.message}`);
  }
  return data;
}

export async function upsertLmnpSettings(
  updates: Omit<LmnpSettings, "user_id" | "created_at" | "updated_at">,
): Promise<LmnpSettings> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utilisateur non authentifié.");

  const { data, error } = await supabase
    .from("lmnp_settings")
    .upsert({ ...updates, user_id: user.id, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) {
    console.error("Error upserting LMNP settings:", error);
    throw new Error(`Erreur lors de l'enregistrement des paramètres LMNP : ${error.message}`);
  }
  return data;
}

// --- Fixed assets ---

export async function getLmnpFixedAssets(): Promise<LmnpFixedAsset[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("lmnp_fixed_assets")
    .select("*")
    .eq("user_id", user.id)
    .order("acquisition_date", { ascending: true });

  if (error) {
    console.error("Error fetching LMNP fixed assets:", error);
    throw new Error(`Erreur lors de la récupération des immobilisations : ${error.message}`);
  }
  return data || [];
}

export async function addLmnpFixedAsset(asset: NewLmnpFixedAsset): Promise<LmnpFixedAsset> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utilisateur non authentifié.");

  const { data, error } = await supabase
    .from("lmnp_fixed_assets")
    .insert({ ...asset, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error("Error adding LMNP fixed asset:", error);
    throw new Error(`Erreur lors de l'ajout de l'immobilisation : ${error.message}`);
  }
  return data;
}

export async function updateLmnpFixedAsset(id: string, asset: NewLmnpFixedAsset): Promise<LmnpFixedAsset> {
  const { data, error } = await supabase
    .from("lmnp_fixed_assets")
    .update(asset)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating LMNP fixed asset:", error);
    throw new Error(`Erreur lors de la modification de l'immobilisation : ${error.message}`);
  }
  return data;
}

export async function deleteLmnpFixedAsset(id: string): Promise<void> {
  const { error } = await supabase.from("lmnp_fixed_assets").delete().eq("id", id);

  if (error) {
    console.error("Error deleting LMNP fixed asset:", error);
    throw new Error(`Erreur lors de la suppression de l'immobilisation : ${error.message}`);
  }
}
