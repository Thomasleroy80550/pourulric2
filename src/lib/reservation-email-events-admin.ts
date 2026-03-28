import { supabase } from "@/integrations/supabase/client";

export interface ReservationEmailEventLookup {
  reservation_id: string | null;
  room_name: string;
  guest_name: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  matched_user_room_ids: string[];
}

export async function getReservationEmailEventLookups(
  reservationIds: Array<string | number>,
): Promise<ReservationEmailEventLookup[]> {
  const normalizedIds = Array.from(
    new Set(
      reservationIds
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  );

  if (normalizedIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("reservation_email_events")
    .select("reservation_id, room_name, guest_name, arrival_date, departure_date, matched_user_room_ids, occurred_at")
    .in("reservation_id", normalizedIds)
    .order("occurred_at", { ascending: false });

  if (error) {
    console.error("Error fetching reservation email events:", error);
    throw new Error(`Erreur lors de la récupération des correspondances de réservation : ${error.message}`);
  }

  const byReservationId = new Map<string, ReservationEmailEventLookup>();

  for (const row of data || []) {
    const key = String(row.reservation_id || "").trim();
    if (!key || byReservationId.has(key)) {
      continue;
    }

    byReservationId.set(key, {
      reservation_id: row.reservation_id,
      room_name: row.room_name,
      guest_name: row.guest_name,
      arrival_date: row.arrival_date,
      departure_date: row.departure_date,
      matched_user_room_ids: Array.isArray(row.matched_user_room_ids) ? row.matched_user_room_ids : [],
    });
  }

  return Array.from(byReservationId.values());
}
