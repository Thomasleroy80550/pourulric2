import { supabase } from "@/integrations/supabase/client";
import { UserRoom } from "./user-room-api";
import { createNotification } from "./notifications-api";
import { asString } from "@/lib/utils";

// --- Interfaces ---

// This is the clean, normalized reservation object used throughout the app.
export interface NormalizedReservation {
  id: string;
  code: string;
  guest_name: string;
  property_name: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
  amount: string;
  cod_channel?: string;
  channel_ref?: string;
  email?: string;
  phone?: string;
  tourist_tax_amount?: number;
  rooms: {
    id_room: string | null;
    id_room_type: string | null;
  }[];
}

// This is a legacy interface, it will be replaced by NormalizedReservation.
// For now, we keep it to avoid breaking other components immediately.
export type KrossbookingReservation = NormalizedReservation & { krossbooking_room_id: string };


export interface KrossbookingHousekeepingTask {
  id_task: number;
  id_room: number;
  room_label: string;
  date: string;
  status: 'pending' | 'completed' | 'in_progress' | 'cancelled';
  task_type: 'check_in' | 'check_out' | 'daily' | 'extra';
  notes?: string;
  assigned_to?: string;
}

export interface SaveReservationPayload {
  id_reservation?: string;
  label: string;
  arrival: string;
  departure: string;
  email: string;
  phone: string;
  cod_reservation_status: 'PROP0' | 'PROPRI' | 'CANC';
  id_room: string;
  id_room_type?: string;
}

export interface KrossbookingMessage {
  id_message: number;
  id_thread: number;
  date: string;
  sender: 'guest' | 'host' | 'system';
  text: string;
  is_read: boolean;
}

export interface KrossbookingMessageThread {
  id_thread: number;
  id_reservation: number;
  cod_channel: string;
  last_message_date: string;
  last_message_text: string;
  messages: KrossbookingMessage[];
}

export interface Restrictions {
  MINST?: number;
  MINSA?: number;
  MAXST?: number;
  MAXSA?: number;
  EXST?: number;
  EXSTAR?: number;
  CLARR?: boolean;
  CLDEP?: boolean;
}

export interface ChannelManagerBlock {
  id_room_type: number;
  id_rate: number;
  cod_channel: string;
  date_from: string;
  date_to: string;
  price?: number;
  closed?: boolean;
  restrictions?: Restrictions;
}

export interface ChannelManagerPayload {
  cm: {
    [key: string]: ChannelManagerBlock;
  };
}

export interface KrossbookingRoomType {
  id_room_type: number;
  label: string;
  rooms: {
    id_room: number;
    label: string;
  }[];
}

// --- Constants & Cache ---

const KROSSBOOKING_PROXY_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/krossbooking-proxy";
const RESERVATION_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

let reservationsCache: {
  data: NormalizedReservation[];
  timestamp: number;
} | null = null;

// --- Core Functions ---

async function callKrossbookingProxy(action: string, payload?: any): Promise<any> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error("User not authenticated. Please log in.");
  }

  const response = await fetch(KROSSBOOKING_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error from Edge Function:", errorText);
    throw new Error(`Edge Function call failed: ${response.statusText}`);
  }

  const krossbookingResponse = await response.json();
  return krossbookingResponse.data;
}

export function clearReservationsCache() {
  reservationsCache = null;
  console.log("Krossbooking reservations cache cleared.");
}

export async function fetchKrossbookingReservations(
  userRooms: UserRoom[],
  forceRefresh: boolean = false
): Promise<KrossbookingReservation[]> {
  const now = Date.now();

  if (!forceRefresh && reservationsCache && (now - reservationsCache.timestamp < RESERVATION_CACHE_DURATION)) {
    console.log("Returning cached Krossbooking reservations.");
    // The cache is already filtered, so we can return it directly.
    // The filtering logic is now part of the fetch function itself.
    return reservationsCache.data.map(r => ({ ...r, krossbooking_room_id: r.rooms[0]?.id_room ?? '' }));
  }
  
  console.log("Fetching ALL Krossbooking reservations from API and filtering.");
  if (userRooms.length === 0) {
    console.log("No configured rooms to fetch reservations for.");
    return [];
  }

  try {
    const apiReservations = await callKrossbookingProxy('get_all_reservations');
    console.debug("DEBUG: First raw reservation from API:", apiReservations?.[0]);

    const roomNameMap = new Map(userRooms.map(room => [room.room_id, room.room_name]));

    // 1. Normalize the data defensively
    const normalizedReservations = (apiReservations ?? []).map((r: any): NormalizedReservation => ({
      id: asString(r?.id_reservation)!,
      code: asString(r?.cod_reservation) ?? `Res #${asString(r?.id_reservation)}`,
      guest_name: asString(r?.label) ?? 'N/A',
      property_name: roomNameMap.get(asString(r?.rooms?.[0]?.id_room) ?? '') ?? 'Unknown Room',
      check_in_date: asString(r?.arrival)!,
      check_out_date: asString(r?.departure)!,
      status: asString(r?.cod_reservation_status) ?? 'UNKNOWN',
      amount: r?.charge_total_amount ? `${r.charge_total_amount}€` : '0€',
      cod_channel: asString(r?.cod_channel),
      channel_ref: asString(r?.ota_id),
      email: asString(r?.email),
      phone: asString(r?.phone),
      tourist_tax_amount: r?.city_tax_amount ? parseFloat(r.city_tax_amount) : 0,
      rooms: Array.isArray(r?.rooms)
        ? r.rooms.map((rm: any) => ({
            id_room: asString(rm?.id_room) ?? null,
            id_room_type: asString(rm?.id_room_type) ?? null,
          }))
        : [],
    })).filter(r => r.id && r.check_in_date && r.check_out_date); // Ensure basic data integrity

    // 2. Filter by user's rooms
    const userRoomIds = new Set(userRooms.map(r => r.room_id));
    console.debug("DEBUG: User's configured room IDs (Set):", userRoomIds);

    const filteredReservations = normalizedReservations.filter(res =>
      res.rooms.some(rm => {
        const roomId = rm.id_room;
        // We only check against room_id for now as per Supabase schema.
        // If room_id_2 (for room_type) becomes a primary identifier, we can add it here.
        return roomId !== null && userRoomIds.has(roomId);
      })
    );
    
    console.debug(`DEBUG: Found ${filteredReservations.length} reservations for the user.`);

    // Cache the filtered reservations
    reservationsCache = {
      data: filteredReservations,
      timestamp: now,
    };
    console.log("User-specific Krossbooking reservations cached successfully.");

    // Adapt to legacy KrossbookingReservation type for now
    return filteredReservations.map(r => ({ ...r, krossbooking_room_id: r.rooms[0]?.id_room ?? '' }));

  } catch (error) {
    console.error(`Error in fetchKrossbookingReservations:`, error);
    return []; // Return empty array on error to prevent UI crashes
  }
}


// --- Other Functions (unchanged for now, but may need updates) ---

// Note: These functions might need to be updated to use the new NormalizedReservation interface
// and the asString helper if they handle reservation data.

export async function saveKrossbookingReservation(payload: SaveReservationPayload): Promise<any> {
  const response = await callKrossbookingProxy('save_reservation', payload);
  const { data: { user } } = await supabase.auth.getUser();
  if (user && !payload.id_reservation) {
    await createNotification(
      user.id,
      `Nouvelle réservation propriétaire créée : ${payload.label}`,
      '/calendar'
    );
  }
  clearReservationsCache();
  return response;
}

export async function fetchKrossbookingRoomTypes(forceRefresh: boolean = false): Promise<KrossbookingRoomType[]> {
  try {
    const flatRoomsData = await callKrossbookingProxy('get_room_types');
    if (!Array.isArray(flatRoomsData)) return [];

    const roomTypesMap = new Map<number, KrossbookingRoomType>();
    for (const room of flatRoomsData) {
      const typeId = room.id_room_type;
      if (!typeId) continue;
      if (!roomTypesMap.has(typeId)) {
        roomTypesMap.set(typeId, {
          id_room_type: typeId,
          label: room.room_type_label || `Type ${typeId}`,
          rooms: [],
        });
      }
      roomTypesMap.get(typeId)?.rooms.push({
        id_room: room.id_room,
        label: room.label,
      });
    }
    return Array.from(roomTypesMap.values());
  } catch (error) {
    console.error('Error fetching Krossbooking room types:', error);
    return [];
  }
}

export async function saveChannelManagerSettings(payload: ChannelManagerPayload): Promise<any> {
  return callKrossbookingProxy('save_channel_manager', payload);
}

export async function fetchKrossbookingHousekeepingTasks(
  dateFrom: string,
  dateTo: string,
  roomIds: number[], // Kept for potential future filtering, but not used for fetching
  idProperty?: number,
  forceRefresh: boolean = false // Add forceRefresh parameter
): Promise<KrossbookingHousekeepingTask[]> {
  const now = Date.now();
  const cacheKey = `${dateFrom}-${dateTo}-${idProperty || 'all'}`; // Create a unique cache key

  // Cache variables and durations (moved from top to here for clarity in this specific fix)
  let housekeepingTasksCache: {
    [key: string]: { // Key will be a combination of dateFrom, dateTo, idProperty
      data: KrossbookingHousekeepingTask[];
      timestamp: number;
    };
  } = {};
  const HOUSEKEEPING_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  if (!forceRefresh && housekeepingTasksCache[cacheKey] && (now - housekeepingTasksCache[cacheKey].timestamp < HOUSEKEEPING_CACHE_DURATION)) {
    console.log(`Returning cached Krossbooking housekeeping tasks for key: ${cacheKey}`);
    return housekeepingTasksCache[cacheKey].data;
  }

  try {
    console.log(`Fetching fresh Krossbooking housekeeping tasks from API for key: ${cacheKey}`);
    // Single call for all tasks in the date range
    const data = await callKrossbookingProxy('get_housekeeping_tasks', {
      date_from: dateFrom,
      date_to: dateTo,
      id_property: idProperty,
    });

    if (!Array.isArray(data)) {
      console.warn(`Unexpected Krossbooking API response structure for housekeeping tasks or no data array:`, data);
      return [];
    }

    const allTasks = data.map((task: any) => ({
      id_task: task.id_task,
      id_room: task.id_room,
      room_label: task.room_label || 'N/A',
      date: task.date || '', 
      status: task.cod_status, 
      task_type: task.cod_task_type, 
      notes: task.notes,
      assigned_to: task.assigned_to,
    }));
    
    // Filter tasks for the requested rooms on the client side
    const roomIdsSet = new Set(roomIds);
    const filteredTasks = allTasks.filter(task => roomIdsSet.has(task.id_room));

    housekeepingTasksCache[cacheKey] = {
      data: filteredTasks,
      timestamp: now,
    };
    console.log(`Krossbooking housekeeping tasks cached successfully for key: ${cacheKey}`);

    return filteredTasks;

  } catch (error) {
    console.error(`Error fetching housekeeping tasks:`, error);
    if (housekeepingTasksCache[cacheKey]) {
      console.warn("Returning stale housekeeping tasks cache due to API error.");
      return housekeepingTasksCache[cacheKey].data;
    }
    return [];
  }
}

export async function fetchKrossbookingMessageThreads(reservationId: string): Promise<KrossbookingMessageThread[]> {
  try {
    const threadsMetadata = await callKrossbookingProxy('get_messages', { id_reservation: reservationId });

    if (!Array.isArray(threadsMetadata)) {
      console.warn(`Unexpected Krossbooking API response structure for message threads metadata:`, threadsMetadata);
      return [];
    }

    const fullThreadsPromises = threadsMetadata.map(async (threadMetadata: any) => {
      if (threadMetadata.id_thread) {
        const singleThreadData = await callKrossbookingProxy('get_single_message_thread', { id_thread: threadMetadata.id_thread });
        
        if (singleThreadData && Array.isArray(singleThreadData.messages)) {
          return {
            id_thread: singleThreadData.id_thread,
            id_reservation: singleThreadData.id_reservation,
            cod_channel: singleThreadData.cod_channel,
            last_message_date: singleThreadData.last_message_date,
            last_message_text: singleThreadData.last_message_text,
            messages: singleThreadData.messages.map((msg: any) => ({
              id_message: msg.id_message,
              id_thread: msg.id_thread,
              date: msg.date,
              sender: msg.sender,
              text: msg.text,
              is_read: msg.is_read,
            })),
          };
        } else {
          console.warn(`Unexpected Krossbooking API response structure for single message thread ${threadMetadata.id_thread}:`, singleThreadData);
          return { ...threadMetadata, messages: [] };
        }
      }
      return { ...threadMetadata, messages: [] };
    });

    const fullThreads = await Promise.all(fullThreadsPromises);
    return fullThreads;

  } catch (error) {
    console.error(`Error fetching message threads for reservation ${reservationId}:`, error);
    throw error;
  }
}