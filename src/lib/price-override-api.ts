import { supabase } from "@/integrations/supabase/client";

export interface PriceOverride {
  id: string;
  user_id: string;
  room_id: string;
  room_name: string;
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
  const { data, error } = await supabase
    .from('price_overrides')
    .insert([overrideData]) // Wrap in array for insert
    .select()
    .single();

  if (error) {
    console.error("Error adding price override:", error);
    throw new Error(`Erreur lors de l'ajout de la modification de prix : ${error.message}`);
  }
  return data;
}

export async function deleteOverride(id: string): Promise<void> {
  const { error } = await supabase
    .from('price_overrides')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error deleting price override:", error);
    throw new Error(`Erreur lors de la suppression de la modification de prix : ${error.message}`);
  }
}