import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CRON_SECRETS = [
  Deno.env.get("CRON_SECRET"),
  Deno.env.get("CRON_SECRET_2"),
  Deno.env.get("CRONSECRETNOTIFYNEWRESA"),
  Deno.env.get("CRON_SECRET_NOTIFY_NEW_RESA"),
]
  .map((value) => (value ?? "").trim())
  .filter(Boolean);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function isAllowedCronSecret(value: string): boolean {
  return !!value && CRON_SECRETS.includes(value.trim());
}

function cleanKey(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseDate(value: unknown): string | null {
  const raw = cleanKey(value);
  if (!raw) return null;
  const isoLike = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(isoLike) ? isoLike : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callKrossProxy(action: string, cronSecret: string, extra: Record<string, unknown> = {}) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/krossbooking-proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${cronSecret}`,
    },
    body: JSON.stringify({ action, cron_secret: cronSecret, ...extra }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`krossbooking-proxy ${action} error: ${response.status} - ${text.slice(0, 240)}`);
  }

  return text ? JSON.parse(text) : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const headerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  const bodyToken = typeof body.cron_secret === "string" ? body.cron_secret.trim() : "";
  const cronSecret = isAllowedCronSecret(headerToken) ? headerToken : isAllowedCronSecret(bodyToken) ? bodyToken : "";

  if (!cronSecret) {
    console.warn("[scan-krossbooking-reviews] unauthorized request");
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const stats = {
    totalReviews: 0,
    matchedReviews: 0,
    unmatchedReviews: 0,
    reservationsScanned: 0,
    reservationPages: 0,
    upserted: 0,
  };

  try {
    console.log("[scan-krossbooking-reviews] start");

    // 1. Récupérer TOUS les avis (scan global).
    const dateFrom = typeof body.date_from === "string" && body.date_from.trim() ? body.date_from.trim() : "2000-01-01";
    const dateTo = typeof body.date_to === "string" && body.date_to.trim()
      ? body.date_to.trim()
      : new Date().toISOString().slice(0, 10);

    const reviewsResponse = await callKrossProxy("get_reviews", cronSecret, {
      date_from: dateFrom,
      date_to: dateTo,
      limit: 5000,
    });
    const reviews: Record<string, unknown>[] = Array.isArray(reviewsResponse?.data) ? reviewsResponse.data : [];
    stats.totalReviews = reviews.length;
    console.log(`[scan-krossbooking-reviews] fetched reviews=${reviews.length}`);

    // 2. Récupérer TOUTES les réservations (paginées) et construire les correspondances
    //    reference OTA (ota_id) -> id_room et id_reservation -> id_room.
    const otaToRoom = new Map<string, string>();
    const resIdToRoom = new Map<string, string>();

    const pageLimit = 1000;
    let offset = 0;
    let totalReservations = Infinity;

    while (offset < totalReservations) {
      const resp = await callKrossProxy("get_all_reservations", cronSecret, { limit: pageLimit, offset });
      const list: Record<string, unknown>[] = Array.isArray(resp?.data) ? resp.data : [];
      stats.reservationPages += 1;

      if (typeof resp?.total_count === "number") {
        totalReservations = resp.total_count;
      } else if (list.length < pageLimit) {
        totalReservations = offset + list.length;
      }

      for (const reservation of list) {
        stats.reservationsScanned += 1;

        const roomsArray = Array.isArray(reservation.rooms) ? (reservation.rooms as Record<string, unknown>[]) : [];
        const idRoom = cleanKey(roomsArray[0]?.id_room ?? reservation.id_room);
        if (!idRoom) continue;

        const ota = cleanKey(reservation.ota_id);
        if (ota) otaToRoom.set(ota, idRoom);

        const resId = cleanKey(reservation.id_reservation);
        if (resId) resIdToRoom.set(resId, idRoom);
      }

      if (list.length === 0) break;
      offset += pageLimit;

      // Petite pause pour éviter le rate limiting de l'API Krossbooking.
      await sleep(400);
    }

    console.log(
      `[scan-krossbooking-reviews] reservations scanned=${stats.reservationsScanned} pages=${stats.reservationPages} otaKeys=${otaToRoom.size} resKeys=${resIdToRoom.size}`,
    );

    // 3. Correspondance logement -> propriétaire.
    const { data: userRooms, error: roomsError } = await supabaseAdmin
      .from("user_rooms")
      .select("room_id, room_name, user_id");

    if (roomsError) {
      throw roomsError;
    }

    const roomToOwner = new Map<string, { user_id: string; room_name: string | null }>();
    for (const room of userRooms || []) {
      roomToOwner.set(cleanKey(room.room_id), { user_id: room.user_id, room_name: room.room_name ?? null });
    }

    // 4. Associer chaque avis à un propriétaire et préparer les lignes.
    const rows = reviews
      .map((review) => {
        const idReview = Number(review.id_review);
        if (!Number.isFinite(idReview)) return null;

        const resId = cleanKey(review.id_reservation);
        const otaRef = cleanKey(review.external_reservation_reference);

        const idRoom =
          (resId && resIdToRoom.get(resId)) ||
          (otaRef && otaToRoom.get(otaRef)) ||
          null;

        const owner = idRoom ? roomToOwner.get(idRoom) ?? null : null;

        if (owner) {
          stats.matchedReviews += 1;
        } else {
          stats.unmatchedReviews += 1;
        }

        return {
          id_review: idReview,
          user_id: owner?.user_id ?? null,
          room_id: idRoom,
          room_name: owner?.room_name ?? null,
          id_reservation: resId ? Number(resId) : null,
          external_reservation_reference: otaRef || null,
          external_listing_reference: cleanKey(review.external_listing_reference) || null,
          id_room_type: Number.isFinite(Number(review.id_room_type)) ? Number(review.id_room_type) : null,
          name_room_type: cleanKey(review.name_room_type) || null,
          review_date: parseDate(review.date),
          cod_channel: cleanKey(review.cod_channel) || null,
          review_title: cleanKey(review.review_title) || null,
          review_text: cleanKey(review.review_text) || null,
          rating: Number.isFinite(Number(review.rating)) ? Number(review.rating) : null,
          ratings: {
            rating_clean: review.rating_clean ?? null,
            rating_comfort: review.rating_comfort ?? null,
            rating_facilities: review.rating_facilities ?? null,
            rating_location: review.rating_location ?? null,
            rating_staff: review.rating_staff ?? null,
            rating_value: review.rating_value ?? null,
            rating_respect_house_rules: review.rating_respect_house_rules ?? null,
            rating_communication: review.rating_communication ?? null,
            rating_checkin: review.rating_checkin ?? null,
            rating_accuracy: review.rating_accuracy ?? null,
          },
          raw: review,
          scanned_at: new Date().toISOString(),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    // 5. Upsert par lots.
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error: upsertError } = await supabaseAdmin
        .from("krossbooking_reviews")
        .upsert(chunk, { onConflict: "id_review" });

      if (upsertError) {
        console.error(`[scan-krossbooking-reviews] upsert error chunk=${i}: ${upsertError.message}`);
      } else {
        stats.upserted += chunk.length;
      }
    }

    console.log(
      `[scan-krossbooking-reviews] done total=${stats.totalReviews} matched=${stats.matchedReviews} unmatched=${stats.unmatchedReviews} upserted=${stats.upserted}`,
    );

    return new Response(JSON.stringify({ success: true, stats }), { status: 200, headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[scan-krossbooking-reviews] error ${message}`);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  }
});
