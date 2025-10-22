import { supabase } from "@/integrations/supabase/client";

export interface HousekeepingNote {
  id: string;
  staff_id: string;
  room_id: string;
  room_name?: string;
  content: string;
  cleaning_date?: string; // ISO date string
  photos?: string[]; // optional URLs
  created_at: string;
}

/**
 * Crée une note de ménage pour l'utilisateur connecté (doit être 'housekeeper').
 */
export async function createHousekeepingNote(payload: {
  room_id: string;
  room_name?: string;
  content: string;
  cleaning_date?: string;
  photos?: string[];
}): Promise<HousekeepingNote> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Utilisateur non authentifié.");
  }

  const insertPayload = {
    staff_id: user.id,
    room_id: payload.room_id,
    room_name: payload.room_name || null,
    content: payload.content,
    cleaning_date: payload.cleaning_date || null,
    photos: payload.photos ? payload.photos : null,
  };

  const { data, error } = await supabase
    .from("housekeeping_notes")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Erreur lors de la création de la note: ${error.message}`);
  }

  return data as HousekeepingNote;
}

/**
 * Liste les notes de ménage de l'utilisateur connecté (housekeeper).
 */
export async function getMyHousekeepingNotes(): Promise<HousekeepingNote[]> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Utilisateur non authentifié.");
  }

  const { data, error } = await supabase
    .from("housekeeping_notes")
    .select("*")
    .eq("staff_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Erreur lors de la récupération des notes: ${error.message}`);
  }

  return (data || []) as HousekeepingNote[];
}