import { supabase } from "@/integrations/supabase/client";

export interface SeasonPricingItem {
  start_date: string; // yyyy-MM-dd
  end_date: string;   // yyyy-MM-dd
  period_type?: string;
  season?: string;
  price?: number | null;
  min_stay?: number | null;
  closed?: boolean;
  closed_on_arrival?: boolean;
  closed_on_departure?: boolean;
  comment?: string;
}

export interface CreateSeasonPricingRequestPayload {
  season_year: number;
  room_id?: string;
  room_name?: string;
  items: SeasonPricingItem[];
}

export const createSeasonPricingRequest = async (payload: CreateSeasonPricingRequestPayload) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!user) throw new Error("Utilisateur non authentifié.");

  const insertPayload = {
    user_id: user.id,
    season_year: payload.season_year,
    room_id: payload.room_id ?? null,
    room_name: payload.room_name ?? null,
    items: payload.items,
    status: 'pending' as const,
  };

  const { data, error } = await supabase
    .from('season_price_requests')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error("Error creating season pricing request:", error);
    throw new Error(error.message);
  }

  return data;
};