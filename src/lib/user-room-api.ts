import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "./profile-api";

export interface UserRoom {
  id: string;
  user_id: string;
  room_id: string; // Krossbooking room ID
  room_name: string;
  room_id_2?: string | null; // For price/restriction management
  keybox_code?: string | null;
  wifi_code?: string | null;
  property_type?: string | null;
  arrival_instructions?: string | null;
  parking_info?: string | null;
  house_rules?: string | null;
  utility_locations?: string | null;
  has_alarm_or_cctv?: boolean | null;
  wifi_ssid?: string | null;
  wifi_box_location?: string | null;
  parking_address?: string | null;
  parking_spots?: number | null;
  parking_type?: string | null;
  parking_badge_or_disk?: boolean | null;
  parking_regulated_zone_instructions?: string | null;
  is_non_smoking?: boolean | null;
  are_pets_allowed?: boolean | null;
  noise_limit_time?: string | null;
  waste_sorting_instructions?: string | null;
  forbidden_areas?: string | null;
  appliances_list?: string | null; // New field for equipment list
  bedding_description?: string | null;
  has_baby_cot?: boolean | null;
  has_high_chair?: boolean | null;
  outdoor_equipment?: string | null;
  specific_appliances?: string | null;
  has_cleaning_equipment?: boolean | null;
  technical_room_location?: string | null;
  recent_works?: string | null;
  logement_specificities?: string | null;
  departure_instructions?: string | null;
  has_house_manual?: boolean | null;
  has_smoke_detector?: boolean | null;
  has_co_detector?: boolean | null;
}

/**
 * Fetches all rooms assigned to the current authenticated user.
 * @returns A promise that resolves to an array of UserRoom objects.
 */
export async function getUserRooms(userId?: string): Promise<UserRoom[]> {
  let query = supabase
    .from('user_rooms')
    .select('*')
    .order('room_name', { ascending: true });

  if (userId) {
    query = query.eq('user_id', userId);
  } else {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Error getting user for getUserRooms:", userError?.message);
      throw new Error("Utilisateur non authentifié.");
    }
    query = query.eq('user_id', user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching user rooms:", error);
    throw new Error(`Erreur lors de la récupération des logements : ${error.message}`);
  }
  return data || [];
}

/**
 * Fetches a single user room by its ID.
 * @param roomId The ID of the room to fetch.
 * @returns A promise that resolves to a UserRoom object or null if not found.
 */
export async function getUserRoomById(roomId: string): Promise<UserRoom | null> {
  const { data, error } = await supabase
    .from('user_rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  if (error) {
    console.error("Error fetching user room by ID:", error);
    throw new Error(`Erreur lors de la récupération du logement : ${error.message}`);
  }
  return data;
}

/**
 * Adds a new room for a user (admin function).
 * @param userId The ID of the user to assign the room to.
 * @param roomId The Krossbooking room ID.
 * @param roomName The name of the room.
 * @param roomId2 Optional second room ID for price/restriction management.
 * @returns The newly created UserRoom.
 */
export async function adminAddUserRoom(userId: string, roomId: string, roomName: string, roomId2?: string): Promise<UserRoom> {
  const { data, error } = await supabase
    .from('user_rooms')
    .insert({ user_id: userId, room_id: roomId, room_name: roomName, room_id_2: roomId2 })
    .select()
    .single();

  if (error) {
    console.error("Error adding user room:", error);
    throw new Error(`Erreur lors de l'ajout du logement : ${error.message}`);
  }
  return data;
}

/**
 * Updates an existing user room (admin function).
 * @param roomId The ID of the room to update.
 * @param updates An object containing the fields to update.
 * @returns The updated UserRoom.
 */
export async function adminUpdateUserRoom(roomId: string, updates: Partial<Omit<UserRoom, 'id' | 'user_id'>>): Promise<UserRoom> {
  const { data, error } = await supabase
    .from('user_rooms')
    .update(updates)
    .eq('id', roomId)
    .select()
    .single();

  if (error) {
    console.error("Error updating user room:", error);
    throw new Error(`Erreur lors de la mise à jour du logement : ${error.message}`);
  }
  return data;
}

/**
 * Deletes a user room (admin function).
 * @param roomId The ID of the room to delete.
 */
export async function deleteUserRoom(roomId: string): Promise<void> {
  const { error } = await supabase
    .from('user_rooms')
    .delete()
    .eq('id', roomId);

  if (error) {
    console.error("Error deleting user room:", error);
    throw new Error(`Erreur lors de la suppression du logement : ${error.message}`);
  }
}

/**
 * Fetches all rooms assigned to a specific user ID (admin function).
 * @param userId The ID of the user whose rooms to fetch.
 * @returns A promise that resolves to an array of UserRoom objects.
 */
export async function getUserRoomsByUserId(userId: string): Promise<UserRoom[]> {
  const { data, error } = await supabase
    .from('user_rooms')
    .select('*')
    .eq('user_id', userId)
    .order('room_name', { ascending: true });

  if (error) {
    console.error("Error fetching user rooms by user ID:", error);
    throw new Error(`Erreur lors de la récupération des logements de l'utilisateur : ${error.message}`);
  }
  return data || [];
}

export async function updateRoomAppliances(roomId: string, appliancesList: string): Promise<UserRoom> {
  const { data, error } = await supabase
    .from('user_rooms')
    .update({ appliances_list: appliancesList })
    .eq('id', roomId)
    .select()
    .single();

  if (error) {
    console.error("Error updating room appliances:", error);
    throw new Error(`Erreur lors de la mise à jour des équipements de la chambre : ${error.message}`);
  }
  return data;
}