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

export interface SeasonPricingRequest {
  id: string;
  user_id: string;
  season_year: number;
  room_id?: string | null;
  room_name?: string | null;
  items: SeasonPricingItem[];
  status: 'pending' | 'processing' | 'done' | 'cancelled';
  created_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export type SeasonPricingStatus = 'pending' | 'processing' | 'done' | 'cancelled';

export const getAllSeasonPricingRequests = async (): Promise<SeasonPricingRequest[]> => {
  // Récupère les demandes sans embed
  const { data: requests, error } = await supabase
    .from('season_price_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching season pricing requests:", error);
    throw new Error(error.message);
  }

  const list = requests || [];
  const userIds = Array.from(new Set(list.map(r => r.user_id).filter(Boolean)));

  if (userIds.length === 0) {
    return list.map(r => ({ ...r, profiles: null })) as SeasonPricingRequest[];
  }

  // Récupère les profils pour associer prénom/nom
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', userIds);

  if (profilesError) {
    console.error("Error fetching profiles for season pricing requests:", profilesError);
    // Si l'embed échoue, on retourne quand même les demandes sans profils
    return list.map(r => ({ ...r, profiles: null })) as SeasonPricingRequest[];
  }

  const profileMap = new Map<string, { first_name: string | null; last_name: string | null }>();
  (profiles || []).forEach(p => {
    profileMap.set(p.id, { first_name: p.first_name ?? null, last_name: p.last_name ?? null });
  });

  return list.map(r => ({
    ...r,
    profiles: profileMap.get(r.user_id) ?? null,
  })) as SeasonPricingRequest[];
};

export const updateSeasonPricingRequestStatus = async (id: string, status: SeasonPricingStatus): Promise<void> => {
  const { error } = await supabase
    .from('season_price_requests')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error("Error updating season pricing request status:", error);
    throw new Error(error.message);
  }
};

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