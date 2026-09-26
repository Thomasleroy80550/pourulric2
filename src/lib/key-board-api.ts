import { supabase } from "@/integrations/supabase/client";

export const KEY_BOARD_SLOT_COUNT = 90;

export interface KeyBoardSlot {
  id: string;
  slot_number: number;
  room_name: string;
  address: string | null;
  key_sets: number;
  badge_count: number;
  notes: string | null;
  updated_at: string;
}

export async function getKeyBoardSlots(): Promise<KeyBoardSlot[]> {
  const { data, error } = await supabase
    .from("key_board_slots")
    .select("*")
    .order("slot_number", { ascending: true });
  if (error) throw error;
  return (data || []) as KeyBoardSlot[];
}

export interface KeyBoardSlotInput {
  slot_number: number;
  room_name: string;
  address?: string | null;
  key_sets?: number;
  badge_count?: number;
  notes?: string | null;
}

export async function upsertKeyBoardSlot(input: KeyBoardSlotInput): Promise<void> {
  const { error } = await supabase
    .from("key_board_slots")
    .upsert(
      {
        slot_number: input.slot_number,
        room_name: input.room_name.trim(),
        address: input.address?.trim() || null,
        key_sets: input.key_sets ?? 1,
        badge_count: input.badge_count ?? 0,
        notes: input.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slot_number" },
    );
  if (error) throw error;
}

export async function clearKeyBoardSlot(slotNumber: number): Promise<void> {
  const { error } = await supabase
    .from("key_board_slots")
    .delete()
    .eq("slot_number", slotNumber);
  if (error) throw error;
}
