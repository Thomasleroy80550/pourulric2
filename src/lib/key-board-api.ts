import { supabase } from "@/integrations/supabase/client";

export const KEY_BOARD_SLOT_COUNT = 90;

export type KeyBoardAgency = "baie_de_somme" | "cote_opale";

export const KEY_BOARD_AGENCIES: { value: KeyBoardAgency; label: string }[] = [
  { value: "baie_de_somme", label: "Baie de Somme" },
  { value: "cote_opale", label: "Côte d'Opale" },
];

export interface KeyBoardSlot {
  id: string;
  agency: KeyBoardAgency;
  slot_number: number;
  room_name: string;
  address: string | null;
  key_sets: number;
  badge_count: number;
  notes: string | null;
  updated_at: string;
}

export async function getKeyBoardSlots(agency: KeyBoardAgency): Promise<KeyBoardSlot[]> {
  const { data, error } = await supabase
    .from("key_board_slots")
    .select("*")
    .eq("agency", agency)
    .order("slot_number", { ascending: true });
  if (error) throw error;
  return (data || []) as KeyBoardSlot[];
}

export interface KeyBoardSlotInput {
  agency: KeyBoardAgency;
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
        agency: input.agency,
        slot_number: input.slot_number,
        room_name: input.room_name.trim(),
        address: input.address?.trim() || null,
        key_sets: input.key_sets ?? 1,
        badge_count: input.badge_count ?? 0,
        notes: input.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "agency,slot_number" },
    );
  if (error) throw error;
}

export async function getAllKeyBoardSlots(): Promise<KeyBoardSlot[]> {
  const { data, error } = await supabase.from("key_board_slots").select("*");
  if (error) throw error;
  return (data || []) as KeyBoardSlot[];
}

export async function bulkUpsertKeyBoardSlots(inputs: KeyBoardSlotInput[]): Promise<void> {
  if (inputs.length === 0) return;
  const now = new Date().toISOString();
  const { error } = await supabase.from("key_board_slots").upsert(
    inputs.map((input) => ({
      agency: input.agency,
      slot_number: input.slot_number,
      room_name: input.room_name.trim(),
      address: input.address?.trim() || null,
      key_sets: input.key_sets ?? 1,
      badge_count: input.badge_count ?? 0,
      notes: input.notes?.trim() || null,
      updated_at: now,
    })),
    { onConflict: "agency,slot_number" },
  );
  if (error) throw error;
}

export interface KeyBoardRoomCandidate {
  room_id: string;
  room_name: string;
  address: string | null;
  owner_name: string;
  suggested: KeyBoardAgency;
  sure: boolean;
  reason: string;
}

function normalizeText(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Récupère les logements actifs et devine l'agence à partir du profil du propriétaire. */
export async function fetchKeyBoardRoomCandidates(): Promise<KeyBoardRoomCandidate[]> {
  const { data, error } = await supabase
    .from("user_rooms")
    .select(
      `room_id, room_name, profiles ( first_name, last_name, agency, krossbooking_property_id, role, is_contract_terminated, property_address, property_zip_code, property_city )`,
    )
    .order("room_name", { ascending: true });
  if (error) throw error;

  const candidates: KeyBoardRoomCandidate[] = [];
  for (const row of (data || []) as any[]) {
    const p = row.profiles;
    if (!p || p.role === "admin" || p.is_contract_terminated) continue;

    const agencyText = normalizeText(p.agency || "");
    const pid: number | null = p.krossbooking_property_id ?? null;

    let suggested: KeyBoardAgency = "baie_de_somme";
    let sure = false;
    let reason = "";

    if (agencyText.includes("somme") && pid !== 2) {
      suggested = "baie_de_somme";
      sure = true;
      reason = "Profil : Baie de Somme";
    } else if (agencyText.includes("opal") && pid === 2) {
      suggested = "cote_opale";
      sure = true;
      reason = "Profil : Côte d'Opale";
    } else if (agencyText.includes("opal")) {
      suggested = "cote_opale";
      reason = "Profil Côte d'Opale mais ID Krossbooking Baie de Somme";
    } else if (agencyText.includes("somme")) {
      suggested = "baie_de_somme";
      reason = "Profil Baie de Somme mais ID Krossbooking Côte d'Opale";
    } else if (pid === 2) {
      suggested = "cote_opale";
      reason = "Agence non renseignée (ID Krossbooking Côte d'Opale)";
    } else {
      suggested = "baie_de_somme";
      reason = "Agence non renseignée sur le profil";
    }

    const address = [p.property_address, [p.property_zip_code, p.property_city].filter(Boolean).join(" ")]
      .filter((x) => x && String(x).trim())
      .join(", ");

    candidates.push({
      room_id: row.room_id,
      room_name: row.room_name,
      address: address || null,
      owner_name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
      suggested,
      sure,
      reason,
    });
  }
  return candidates;
}

export async function clearKeyBoardSlot(agency: KeyBoardAgency, slotNumber: number): Promise<void> {
  const { error } = await supabase
    .from("key_board_slots")
    .delete()
    .eq("agency", agency)
    .eq("slot_number", slotNumber);
  if (error) throw error;
}
