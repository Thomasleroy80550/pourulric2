import { supabase } from "@/integrations/supabase/client";

export type HivernageInstructions = {
  cut_water?: boolean;
  cut_water_heater?: boolean;
  heating_frost_mode?: boolean;
  empty_fridge?: boolean;
  remove_linen?: boolean;
  put_linen?: boolean;
  close_shutters?: boolean;
  no_change?: boolean;
};

export interface HivernageRequest {
  id: string;
  user_id: string;
  user_room_id?: string | null;
  instructions: HivernageInstructions;
  comments?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  profiles?: { first_name: string | null; last_name: string | null; email: string | null } | null;
  user_rooms?: { room_name: string | null } | null;
}

export async function createHivernageRequest(payload: {
  user_room_id?: string | null;
  instructions: HivernageInstructions;
  comments?: string;
}): Promise<HivernageRequest> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utilisateur non authentifié.");

  const { data, error } = await supabase
    .from('hivernage_requests')
    .insert({
      user_id: user.id,
      user_room_id: payload.user_room_id ?? null,
      instructions: payload.instructions,
      comments: payload.comments ?? null,
    })
    .select(`
      *,
      user_rooms (room_name)
    `)
    .single();

  if (error) {
    console.error("Erreur lors de la création de la demande d'hivernage:", error);
    throw new Error(`Impossible d'enregistrer la demande : ${error.message}`);
  }
  return data as HivernageRequest;
}

export async function getMyHivernageRequests(): Promise<HivernageRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('hivernage_requests')
    .select(`
      *,
      user_rooms (room_name)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erreur de récupération des demandes d'hivernage:", error);
    throw new Error("Impossible de récupérer vos demandes.");
  }
  return (data || []) as HivernageRequest[];
}

export async function getAllHivernageRequests(): Promise<HivernageRequest[]> {
  const { data, error } = await supabase
    .from('hivernage_requests')
    .select(`
      *,
      user_rooms (room_name)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erreur de récupération des demandes d'hivernage (admin):", error);
    throw new Error("Impossible de récupérer les demandes.");
  }
  return (data || []) as HivernageRequest[];
}