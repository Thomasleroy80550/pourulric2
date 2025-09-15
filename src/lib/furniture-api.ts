import { supabase } from "@/integrations/supabase/client";
import { uploadFiles } from "./storage-api";

export interface RoomFurniture {
  id: string;
  user_room_id: string;
  name: string;
  price?: number;
  invoice_url?: string;
  created_at: string;
  purchase_date?: string;
  serial_number?: string;
  photo_url?: string;
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

interface AddFurniturePayload {
  userRoomId: string;
  name: string;
  price?: number;
  purchase_date?: Date;
  serial_number?: string;
  invoiceFile?: File;
  photoFile?: File;
}

function createFileList(file: File): FileList {
    const dt = new DataTransfer();
    dt.items.add(file);
    return dt.files;
}

/**
 * Adds a new piece of furniture to a room.
 * @param payload The data for the new furniture.
 * @returns The created RoomFurniture object.
 */
export async function addFurniture(payload: AddFurniturePayload): Promise<RoomFurniture> {
  let invoiceUrl: string | undefined = undefined;
  let photoUrl: string | undefined = undefined;

  if (payload.invoiceFile) {
    const urls = await uploadFiles(createFileList(payload.invoiceFile), 'furniture-invoices', payload.userRoomId);
    if (urls.length > 0) invoiceUrl = urls[0];
  }

  if (payload.photoFile) {
    const urls = await uploadFiles(createFileList(payload.photoFile), 'furniture-photos', payload.userRoomId);
    if (urls.length > 0) photoUrl = urls[0];
  }

  const { data, error } = await supabase
    .from('room_furniture')
    .insert({
      user_room_id: payload.userRoomId,
      name: payload.name,
      price: payload.price,
      purchase_date: payload.purchase_date,
      serial_number: payload.serial_number,
      invoice_url: invoiceUrl,
      photo_url: photoUrl,
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