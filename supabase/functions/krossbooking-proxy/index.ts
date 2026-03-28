import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const KROSSBOOKING_API_BASE_URL = "https://api.krossbooking.com/v5";
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
};

interface RoomRequest {
  room_id: string | number;
  room_name?: string | null;
  id_property?: string | number | null;
}

interface UserContext {
  userId: string;
  propertyId: number | null;
  rooms: RoomRequest[];
}

function isAllowedCronSecret(value: string): boolean {
  return !!value && CRON_SECRETS.includes(value.trim());
}

function normalizeKrossData<T>(payload: T | { data?: T } | null | undefined): T | null {
  if (!payload) {
    return null;
  }

  if (typeof payload === "object" && "data" in payload) {
    return (payload as { data?: T }).data ?? null;
  }

  return payload as T;
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

async function getUserContext(authHeader: string): Promise<UserContext> {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );

  const authResponse = await supabaseClient.auth.getUser();
  const user = authResponse.data?.user ?? null;
  const authError = authResponse.error ?? null;

  if (authError || !user) {
    console.warn(`[krossbooking-proxy] unauthorized request authError=${authError?.message ?? "missing-user"}`);
    throw new Response(JSON.stringify({ error: "Unauthorized: User not authenticated." }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const [{ data: profile, error: profileError }, { data: rooms, error: roomsError }] = await Promise.all([
    supabaseClient
      .from("profiles")
      .select("krossbooking_property_id")
      .eq("id", user.id)
      .maybeSingle(),
    supabaseClient
      .from("user_rooms")
      .select("room_id, room_name")
      .eq("user_id", user.id),
  ]);

  if (profileError) {
    console.error(`[krossbooking-proxy] failed to load profile userId=${user.id} error=${profileError.message}`);
    throw new Error(`Unable to load user profile: ${profileError.message}`);
  }

  if (roomsError) {
    console.error(`[krossbooking-proxy] failed to load rooms userId=${user.id} error=${roomsError.message}`);
    throw new Error(`Unable to load user rooms: ${roomsError.message}`);
  }

  return {
    userId: user.id,
    propertyId: typeof profile?.krossbooking_property_id === "number" ? profile.krossbooking_property_id : null,
    rooms: Array.isArray(rooms) ? rooms : [],
  };
}

async function getAuthorizedReservations(authToken: string, userContext: UserContext) {
  const reservationsById = new Map<number, Record<string, unknown>>();

  for (const room of userContext.rooms) {
    const roomId = Number(room.room_id);
    if (!Number.isFinite(roomId)) {
      console.warn(`[krossbooking-proxy] skipped invalid room_id=${String(room.room_id)} userId=${userContext.userId}`);
      continue;
    }

    const response = await postToKrossbooking(authToken, "/reservations/get-list", {
      with_rooms: true,
      id_room: roomId,
      id_property: userContext.propertyId ?? undefined,
    });

    const reservations = normalizeKrossData<Record<string, unknown>[]>(response) ?? [];

    for (const reservation of reservations) {
      const reservationId = Number((reservation as { id_reservation?: unknown }).id_reservation);
      if (!Number.isFinite(reservationId)) {
        continue;
      }

      reservationsById.set(reservationId, {
        ...reservation,
        room_id: room.room_id,
        room_name: room.room_name ?? null,
      });
    }
  }

  return reservationsById;
}

async function getAuthorizedThread(authToken: string, userContext: UserContext, idThread: number) {
  const threadResponse = await postToKrossbooking(authToken, "/messaging/get-thread", {
    id_thread: idThread,
  });
  const thread = normalizeKrossData<Record<string, unknown>>(threadResponse);

  if (!thread) {
    throw new Error("Thread not found.");
  }

  const reservationId = Number((thread as { id_reservation?: unknown }).id_reservation);
  if (!Number.isFinite(reservationId)) {
    throw new Error("Thread does not contain a valid reservation.");
  }

  const authorizedReservations = await getAuthorizedReservations(authToken, userContext);
  if (!authorizedReservations.has(reservationId)) {
    console.warn(`[krossbooking-proxy] forbidden thread access userId=${userContext.userId} idThread=${idThread} reservationId=${reservationId}`);
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  return {
    thread,
    reservation: authorizedReservations.get(reservationId) ?? null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: `Unsupported HTTP method: ${req.method}` }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  let requestBody: Record<string, unknown> = {};

  try {
    requestBody = await req.json();
  } catch {
    requestBody = {};
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const headerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    const bodyToken = typeof requestBody.cron_secret === "string" ? requestBody.cron_secret.trim() : "";
    const isCron = isAllowedCronSecret(headerToken) || isAllowedCronSecret(bodyToken);
    const action = typeof requestBody.action === "string" ? requestBody.action : "";

    console.log(`[krossbooking-proxy] start action=${action || "unknown"} isCron=${isCron}`);

    if (!action) {
      return new Response(JSON.stringify({ error: "Missing 'action' in request body." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userContext = !isCron ? await getUserContext(authHeader) : null;
    const authToken = await getAuthToken();

    if (action === "get_reservations_for_user_rooms") {
      const rooms = Array.isArray(requestBody.rooms) ? (requestBody.rooms as RoomRequest[]) : [];
      if (rooms.length === 0) {
        throw new Error("Missing rooms for get_reservations_for_user_rooms.");
      }

      console.log(`[krossbooking-proxy] fetching reservations for ${rooms.length} rooms`);
      const reservationsById = new Map<string, unknown>();

      for (const room of rooms) {
        const roomId = Number(room.room_id);
        if (!Number.isFinite(roomId)) {
          console.warn(`[krossbooking-proxy] skipped invalid room_id=${String(room.room_id)}`);
          continue;
        }

        const response = await postToKrossbooking(authToken, "/reservations/get-list", {
          with_rooms: true,
          id_room: roomId,
          id_property: room.id_property ? Number(room.id_property) : undefined,
        });

        const roomReservations = normalizeKrossData<Record<string, unknown>[]>(response) ?? [];
        console.log(`[krossbooking-proxy] room_id=${roomId} reservations=${roomReservations.length}`);

        for (const reservation of roomReservations) {
          reservationsById.set(String((reservation as { id_reservation?: string | number }).id_reservation), reservation);
        }
      }

      const aggregatedReservations = Array.from(reservationsById.values());
      console.log(`[krossbooking-proxy] aggregated reservations=${aggregatedReservations.length}`);

      return new Response(JSON.stringify({
        data: aggregatedReservations,
        total_count: aggregatedReservations.length,
        count: aggregatedReservations.length,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "list_message_threads") {
      if (!userContext) {
        throw new Error("Unauthorized");
      }

      const authorizedReservations = await getAuthorizedReservations(authToken, userContext);
      const response = await postToKrossbooking(authToken, "/messaging/get-threads", {
        ...(typeof requestBody.last_update === "string" ? { last_update: requestBody.last_update } : {}),
        ...(typeof requestBody.to_read === "boolean" ? { to_read: requestBody.to_read } : {}),
        ...(typeof requestBody.search === "string" && requestBody.search.trim() ? { search: requestBody.search.trim() } : {}),
        ...(typeof requestBody.cod_channel === "string" && requestBody.cod_channel.trim() ? { cod_channel: requestBody.cod_channel.trim() } : {}),
      });

      const threads = normalizeKrossData<Record<string, unknown>[]>(response) ?? [];
      const filteredThreads = threads.filter((thread) => {
        const reservationId = Number((thread as { id_reservation?: unknown }).id_reservation);
        return Number.isFinite(reservationId) && authorizedReservations.has(reservationId);
      });

      const enrichedThreads = filteredThreads.map((thread) => {
        const reservationId = Number((thread as { id_reservation?: unknown }).id_reservation);
        const reservation = authorizedReservations.get(reservationId) ?? null;
        return {
          ...thread,
          reservation,
        };
      });

      console.log(`[krossbooking-proxy] list_message_threads userId=${userContext.userId} returned=${enrichedThreads.length}`);

      return new Response(JSON.stringify({
        data: enrichedThreads,
        total_count: enrichedThreads.length,
        count: enrichedThreads.length,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "get_authorized_message_thread") {
      if (!userContext) {
        throw new Error("Unauthorized");
      }

      const idThread = Number(requestBody.id_thread);
      if (!Number.isFinite(idThread)) {
        throw new Error("Missing id_thread for get_authorized_message_thread.");
      }

      const authorizedThread = await getAuthorizedThread(authToken, userContext, idThread);

      return new Response(JSON.stringify({ data: authorizedThread }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "send_message_to_thread") {
      if (!userContext) {
        throw new Error("Unauthorized");
      }

      const idThread = Number(requestBody.id_thread);
      const message = typeof requestBody.message === "string" ? requestBody.message.trim() : "";

      if (!Number.isFinite(idThread)) {
        throw new Error("Missing id_thread for send_message_to_thread.");
      }

      if (!message) {
        throw new Error("Missing message for send_message_to_thread.");
      }

      await getAuthorizedThread(authToken, userContext, idThread);

      const sendResponse = await postToKrossbooking(authToken, "/messaging/send-message", {
        id_thread: idThread,
        message,
      });

      console.log(`[krossbooking-proxy] send_message_to_thread userId=${userContext.userId} idThread=${idThread}`);

      return new Response(JSON.stringify({ data: normalizeKrossData(sendResponse) ?? sendResponse }), {
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

      case "get_reservations_log":
        krossbookingPath = "/logs/get-reservations-log";
        payload = {
          limit: typeof requestBody.limit === "number" ? requestBody.limit : 20,
          offset: typeof requestBody.offset === "number" ? requestBody.offset : 0,
          ...(typeof requestBody.page === "number" ? { page: requestBody.page } : {}),
        };
        returnFullData = true;
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
    const normalizedData = normalizeKrossData(data);

    const responsePayload = returnFullData
      ? { data: normalizedData ?? data }
      : {
          data: Array.isArray(normalizedData) ? normalizedData : normalizedData ?? [],
          total_count: data?.total_count,
          count: data?.count,
          limit: data?.limit,
          offset: data?.offset,
        };

    console.log(`[krossbooking-proxy] success action=${action}`);

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error(`[krossbooking-proxy] error ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
