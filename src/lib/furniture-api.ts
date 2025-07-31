import { supabase } from "@/integrations/supabase/client";
import { uploadFiles } from "./storage-api";

export interface RoomFurniture {
  id: string;
  user_room_id: string;
  name: string;
  price?: number;
  invoice_url?: string;
  created_at: string;
}

/**
 * Fetches all furniture for a specific user room.
 * @param userRoomId The ID of the user_room.
 * @returns An array of RoomFurniture objects.
 */
export async function getFurnitureForRoom(userRoomId: string): Promise<RoomFurniture[]> {
  const { data, error } = await supabase
    .from('room_furniture')
    .select('*')
    .eq('user_room_id', userRoomId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erreur lors de la récupération du mobilier : ${error.message}`);
  }
  return data || [];
}

/**
 * Adds a new piece of furniture to a room.
 * @param userRoomId The ID of the user_room.
 * @param name The name of the furniture.
 * @param price The price of the furniture.
 * @param invoiceFile The invoice file to upload.
 * @returns The created RoomFurniture object.
 */
export async function addFurniture(userRoomId: string, name: string, price?: number, invoiceFile?: File): Promise<RoomFurniture> {
  let invoiceUrl: string | undefined = undefined;

  if (invoiceFile) {
    const fileList = new DataTransfer();
    fileList.items.add(invoiceFile);
    const urls = await uploadFiles(fileList.files, 'furniture-invoices', userRoomId);
    if (urls.length > 0) {
      invoiceUrl = urls[0];
    }
  }

  const { data, error } = await supabase
    .from('room_furniture')
    .insert({
      user_room_id: userRoomId,
      name,
      price,
      invoice_url: invoiceUrl,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erreur lors de l'ajout du meuble : ${error.message}`);
  }
  return data;
}

/**
 * Deletes a piece of furniture.
 * @param furnitureId The ID of the furniture to delete.
 */
export async function deleteFurniture(furnitureId: string): Promise<void> {
  const { error } = await supabase
    .from('room_furniture')
    .delete()
    .eq('id', furnitureId);

  if (error) {
    throw new Error(`Erreur lors de la suppression du meuble : ${error.message}`);
  }
}