import { supabase } from "@/integrations/supabase/client";

export interface UserRoom {
  id: string;
  user_id: string;
  room_id: string; // The Krossbooking room ID
  room_name: string; // A user-friendly name for the room
  room_id_2?: string; // New field for secondary room ID (e.g., for price/restriction systems)
}

/**
 * Adds a new room configuration for the current user.
 * @param room_id The Krossbooking room ID.
 * @param room_name A user-friendly name for the room.
 * @param room_id_2 An optional secondary room ID.
 * @returns The created UserRoom object.
 */
export async function addUserRoom(room_id: string, room_name: string, room_id_2?: string): Promise<UserRoom> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .from('user_rooms')
    .insert({ user_id: user.id, room_id, room_name, room_id_2 })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // Unique violation code
      throw new Error(`La chambre avec l'ID "${room_id}" est déjà ajoutée.`);
    }
    throw new Error(`Erreur lors de l'ajout de la chambre : ${error.message}`);
  }
  return data;
}

/**
 * Fetches all room configurations for the current user.
 * @returns An array of UserRoom objects.
 */
export async function getUserRooms(): Promise<UserRoom[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // If no user, return empty array instead of throwing, as this might be called on public pages
    return [];
  }

  const { data, error } = await supabase
    .from('user_rooms')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    throw new Error(`Erreur lors de la récupération des chambres : ${error.message}`);
  }
  return data || [];
}

/**
 * Deletes a room configuration by its ID.
 * @param id The ID of the user_room entry to delete.
 */
export async function deleteUserRoom(id: string): Promise<void> {
  const { error } = await supabase
    .from('user_rooms')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Erreur lors de la suppression de la chambre : ${error.message}`);
  }
}

/**
 * Fetches all room configurations for a specific user. Admin use.
 * @param userId The ID of the user.
 * @returns An array of UserRoom objects.
 */
export async function getUserRoomsByUserId(userId: string): Promise<UserRoom[]> {
  const { data, error } = await supabase
    .from('user_rooms')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Erreur lors de la récupération des chambres pour l'utilisateur : ${error.message}`);
  }
  return data || [];
}

/**
 * Adds a new room configuration for a specific user. Admin use.
 * @param user_id The ID of the user.
 * @param room_id The Krossbooking room ID.
 * @param room_name A user-friendly name for the room.
 * @param room_id_2 An optional secondary room ID.
 * @returns The created UserRoom object.
 */
export async function adminAddUserRoom(user_id: string, room_id: string, room_name: string, room_id_2?: string): Promise<UserRoom> {
  const { data, error } = await supabase
    .from('user_rooms')
    .insert({ user_id, room_id, room_name, room_id_2 })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // Unique violation code
      throw new Error(`La chambre avec l'ID "${room_id}" est déjà ajoutée.`);
    }
    throw new Error(`Erreur lors de l'ajout de la chambre : ${error.message}`);
  }
  return data;
}

/**
 * Updates an existing room configuration for a specific user. Admin use.
 * @param id The ID of the user_room entry to update.
 * @param updates An object containing the fields to update (room_id, room_name, room_id_2).
 * @returns The updated UserRoom object.
 */
export async function updateUserRoom(id: string, updates: Partial<Omit<UserRoom, 'id' | 'user_id'>>): Promise<UserRoom> {
  const { data, error } = await supabase
    .from('user_rooms')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Erreur lors de la mise à jour de la chambre : ${error.message}`);
  }
  return data;
}