import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const KROSSBOOKING_API_BASE_URL = "https://api.krossbooking.com/v5";
const CRON_SECRET = (Deno.env.get("CRON_SECRET") ?? "").trim();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RoomRequest {
  room_id: string | number;
  room_name?: string | null;
  id_property?: string | number | null;
}

async function getAuthToken(): Promise<string> {
  const KROSSBOOKING_API_KEY = Deno.env.get("KROSSBOOKING_API_KEY");
  const KROSSBOOKING_HOTEL_ID = Deno.env.get("KROSSBOOKING_HOTEL_ID");
  const KROSSBOOKING_USERNAME = Deno.env.get("KROSSBOOKING_USERNAME");
  const KROSSBOOKING_PASSWORD = Deno.env.get("KROSSBOOKING_PASSWORD");

  if (!KROSSBOOKING_API_KEY || !KROSSBOOKING_HOTEL_ID || !KROSSBOOKING_USERNAME || !KROSSBOOKING_PASSWORD) {
    throw new Error("Missing Krossbooking API credentials in environment variables.");
  }

  const response = await fetch(`${KROSSBOOKING_API_BASE_URL}/auth/get-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: KROSSBOOKING_API_KEY,
      hotel_id: KROSSBOOKING_HOTEL_ID,
      username: KROSSBOOKING_USERNAME,
      password: KROSSBOOKING_PASSWORD,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get Krossbooking token: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  if (!data?.auth_token) {
    throw new Error("Krossbooking token not found in response.");
  }

  return data.auth_token;
}

async function postToKrossbooking(authToken: string, path: string, payload: Record<string, unknown>) {
  const response = await fetch(`${KROSSBOOKING_API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Krossbooking API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const headerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    const isCron = !!headerToken && headerToken === CRON_SECRET;
    let supabaseClient;

    if (!isCron) {
      supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } },
      );

      const {
        data: { user },
        error: authError,
      } = await supabaseClient.auth.getUser();

      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized: User not authenticated." }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: `Unsupported HTTP method: ${req.method}` }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const requestBody = await req.json();
    const { action } = requestBody;

    if (!action) {
      return new Response(JSON.stringify({ error: "Missing 'action' in request body." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const authToken = await getAuthToken();

    if (action === "get_reservations_for_user_rooms") {
      const rooms = Array.isArray(requestBody.rooms) ? (requestBody.rooms as RoomRequest[]) : [];
      if (rooms.length === 0) {
        throw new Error("Missing rooms for get_reservations_for_user_rooms.");
      }

      const reservationsById = new Map<string, any>();

      for (const room of rooms) {
        const roomId = Number(room.room_id);
        if (!Number.isFinite(roomId)) {
          continue;
        }

        const response = await postToKrossbooking(authToken, "/reservations/get-list", {
          with_rooms: true,
          id_room: roomId,
          id_property: room.id_property ? Number(room.id_property) : undefined,
        });

        for (const reservation of Array.isArray(response?.data) ? response.data : []) {
          reservationsById.set(String(reservation.id_reservation), reservation);
        }
      }

      const aggregatedReservations = Array.from(reservationsById.values());

      return new Response(JSON.stringify({
        data: aggregatedReservations,
        total_count: aggregatedReservations.length,
        count: aggregatedReservations.length,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let krossbookingPath = "";
    let payload: Record<string, unknown> = {};
    let returnFullData = false;

    switch (action) {
      case "get_reservations_for_room":
        if (!requestBody.id_room) {
          throw new Error("Missing id_room for get_reservations_for_room.");
        }
        krossbookingPath = "/reservations/get-list";
        payload = {
          with_rooms: true,
          id_room: Number(requestBody.id_room),
          id_property: requestBody.id_property ? Number(requestBody.id_property) : undefined,
        };
        break;

      case "get_housekeeping_tasks":
        if (!requestBody.date_from || !requestBody.date_to) {
          throw new Error("Missing date_from/date_to for get_housekeeping_tasks.");
        }
        krossbookingPath = "/housekeeping/get-tasks";
        payload = {
          date_from: requestBody.date_from,
          date_to: requestBody.date_to,
          id_property: requestBody.id_property ? Number(requestBody.id_property) : undefined,
        };
        break;

      case "save_reservation": {
        const { id_reservation, label, arrival, departure, cod_reservation_status, id_room, id_room_type, property_id } = requestBody;
        if (!label || !arrival || !departure || !cod_reservation_status || !id_room || !id_room_type || property_id === undefined) {
          throw new Error("Missing required parameters for save_reservation (label, arrival, departure, cod_reservation_status, id_room, id_room_type, property_id).");
        }

        krossbookingPath = "/reservations/save";
        payload = {
          label,
          arrival,
          departure,
          email: requestBody.email || "",
          phone: requestBody.phone || "",
          cod_reservation_status,
          id_property: Number(property_id),
          rooms: [{ id_room: Number(id_room), id_room_type: Number(id_room_type), guests: 1 }],
          ...(id_reservation ? { id_reservation: Number(id_reservation) } : {}),
        };
        break;
      }

      case "get_messages":
        if (!requestBody.id_reservation) {
          throw new Error("Missing id_reservation for get_messages.");
        }
        krossbookingPath = "/messaging/get-threads";
        payload = { id_reservation: Number(requestBody.id_reservation) };
        break;

      case "get_single_message_thread":
        if (!requestBody.id_thread) {
          throw new Error("Missing id_thread for get_single_message_thread.");
        }
        krossbookingPath = "/messaging/get-thread";
        payload = { id_thread: Number(requestBody.id_thread) };
        returnFullData = true;
        break;

      case "save_channel_manager":
        if (!requestBody.cm || typeof requestBody.cm !== "object") {
          throw new Error("Invalid 'cm' payload for save_channel_manager.");
        }
        krossbookingPath = "/channel/save-cm";
        payload = { cm: requestBody.cm };
        break;

      case "get_room_types":
        krossbookingPath = "/rooms/get-rooms";
        payload = {
          id_property: requestBody.id_property ? Number(requestBody.id_property) : undefined,
        };
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    const data = await postToKrossbooking(authToken, krossbookingPath, payload);

    const responsePayload = returnFullData
      ? { data }
      : {
          data: data.data || [],
          total_count: data.total_count,
          count: data.count,
          limit: data.limit,
          offset: data.offset,
        };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
