import { supabase } from "@/integrations/supabase/client";

export interface PriceOverride {
  id: string;
  user_id: string;
  room_id: string;
  room_name: string;
  room_id_2?: string; // Ajout de ce champ
  start_date: string; // ISO date string
  end_date: string; // ISO date string
  price?: number;
  closed?: boolean;
  min_stay?: number;
  closed_on_arrival?: boolean;
  closed_on_departure?: boolean;
  created_at: string;
}

export type NewPriceOverride = Omit<PriceOverride, 'id' | 'user_id' | 'created_at'>;

export type PriceOverrideInsert = {
  user_id: string;
  room_id?: string | null;
  room_id_2?: string | null;
  room_name?: string | null;
  start_date: string; // ISO date string (YYYY-MM-DD)
  end_date: string;   // ISO date string (YYYY-MM-DD)
  price?: number | null;
  min_stay?: number | null;
  closed?: boolean | null;
  closed_on_arrival?: boolean | null;
  closed_on_departure?: boolean | null;
};

export async function getOverrides(): Promise<PriceOverride[]> {
  const { data, error } = await supabase
    .from('price_overrides')
    .select('*')
    .order('start_date', { ascending: false });

  if (error) {
    console.error("Error fetching price overrides:", error);
    throw new Error(`Erreur lors de la récupération des modifications de prix : ${error.message}`);
  }
  return data || [];
}

export async function addOverride(overrideData: NewPriceOverride): Promise<PriceOverride> {
  const { data: { user } } = await supabase.auth.getUser();
  const ruid = user?.id || 'unknown_user';

  const { data, error } = await supabase
    .from('price_overrides')
    .insert([overrideData]) // Wrap in array for insert
    .select()
    .single();

  if (error) {
    console.error(`RUID: ${ruid} - Error adding price override:`, error);
    throw new Error(`Erreur lors de l'ajout de la modification de prix : ${error.message}`);
  }
  console.log(`RUID: ${ruid} - Successfully added price override:`, data);
  return data;
}

export async function addOverrides(overridesData: NewPriceOverride[]): Promise<PriceOverride[]> {
  if (overridesData.length === 0) return [];

  const { data: { user } } = await supabase.auth.getUser();
  const ruid = user?.id || 'unknown_user';

  const { data, error } = await supabase
    .from('price_overrides')
    .insert(overridesData)
    .select();

  if (error) {
    console.error(`RUID: ${ruid} - Error adding multiple price overrides:`, error);
    throw new Error(`Erreur lors de l'ajout des modifications de prix : ${error.message}`);
  }
  console.log(`RUID: ${ruid} - Successfully added multiple price overrides:`, data);
  return data || [];
}

export async function deleteOverride(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const ruid = user?.id || 'unknown_user';

  const { error } = await supabase
    .from('price_overrides')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`RUID: ${ruid} - Error deleting price override with ID ${id}:`, error);
    throw new Error(`Erreur lors de la suppression de la modification de prix : ${error.message}`);
  }
  console.log(`RUID: ${ruid} - Successfully deleted price override with ID ${id}.`);
}