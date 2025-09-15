import { supabase } from "@/integrations/supabase/client";
import { UserRoom } from "./user-room-api";
import { createNotification, sendEmail } from "./notifications-api";
import { getProfile } from "./profile-api";
import { format, parseISO, isValid, isAfter, subDays, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface KrossbookingReservation {
  id: string;
  guest_name: string;
  property_name: string;
  krossbooking_room_id: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
  amount: string;
  cod_channel?: string;
  ota_id?: string;
  channel_identifier?: string;
  email?: string;
  phone?: string;
  tourist_tax_amount?: number;
  property_id: number;
  id_room_type?: string; // Add this line
}

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
  id_room_type?: string; // NEW: Krossbooking room type ID
  property_id: number;
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

const KROSSBOOKING_PROXY_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/krossbooking-proxy";

// Cache variables and durations
let roomTypesCache: {
  data: KrossbookingRoomType[];
  timestamp: number;
} | null = null;
const ROOM_TYPE_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

let reservationsCache: {
  data: KrossbookingReservation[];
  timestamp: number;
} | null = null;
const RESERVATION_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

let housekeepingTasksCache: {
  [key: string]: { // Key will be a combination of dateFrom, dateTo, idProperty
    data: KrossbookingHousekeepingTask[];
    timestamp: number;
  };
} = {};
const HOUSEKEEPING_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function callKrossbookingProxy(action: string, payload?: any): Promise<any> {
  try {
    console.log(`Calling Krossbooking proxy with action: ${action}`);

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Error getting Supabase session:", sessionError);
      throw new Error("Could not retrieve Supabase session for authorization.");
    }

    if (!session) {
      console.warn("No active Supabase session found. Cannot authorize Edge Function call.");
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

    console.log(`Response status from Edge Function: ${response.status}`);
    const responseText = await response.text();

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = responseText;
      }
      console.error("Error from Edge Function:", errorData);
      throw new Error(`Failed to perform Krossbooking action: Edge Function returned a non-2xx status code. Details: ${JSON.stringify(errorData)}`);
    }

    const krossbookingResponse = JSON.parse(responseText);

    return krossbookingResponse.data;
  } catch (error: any) {
    console.error("Error calling Krossbooking proxy:", error.message);
    throw error;
  }
}

export function clearReservationsCache() {
  reservationsCache = null;
  console.log("Krossbooking reservations cache cleared.");
}

export function clearHousekeepingTasksCache() {
  housekeepingTasksCache = {}; // Clear all cached housekeeping tasks
  console.log("Krossbooking housekeeping tasks cache cleared.");
}

export async function fetchKrossbookingReservations(
  userRooms: UserRoom[],
  forceRefresh: boolean = false
): Promise<KrossbookingReservation[]> {
  const now = Date.now();
  const oldReservationsMap = new Map((reservationsCache?.data || []).map(r => [r.id, r]));

  if (!forceRefresh && reservationsCache && (now - reservationsCache.timestamp < RESERVATION_CACHE_DURATION)) {
    console.log("Returning cached Krossbooking reservations.");
    return reservationsCache.data;
  }
  
  console.log("Fetching fresh Krossbooking reservations from API for each user room.");
  try {
    if (userRooms.length === 0) {
      console.log("No configured rooms to fetch reservations for.");
      return [];
    }

    const profile = await getProfile();
    const userEmail = (await supabase.auth.getUser()).data.user?.email;

    // Fetch room types to map room_id to room_type_id
    const roomTypes = await fetchKrossbookingRoomTypes(forceRefresh);
    const roomIdToRoomTypeMap = new Map<string, string>();
    roomTypes.forEach(type => {
      type.rooms.forEach(room => {
        roomIdToRoomTypeMap.set(room.id_room.toString(), type.id_room_type.toString());
      });
    });

    const allReservationsPromises = userRooms.map(async (room) => {
      // Pass property_id if available from the user's profile
      const data = await callKrossbookingProxy('get_reservations_for_room', { 
        id_room: room.room_id,
        id_property: profile?.krossbooking_property_id // Pass the property ID
      });
      if (!Array.isArray(data)) {
        console.warn(`Unexpected Krossbooking API response for room ${room.room_id}:`, data);
        return [];
      }
      return data.map((res: any): KrossbookingReservation => ({
        id: res.id_reservation.toString(),
        guest_name: res.label || 'N/A',
        property_name: room.room_name, // Use the name from the loop context
        krossbooking_room_id: room.room_id,
        check_in_date: res.arrival || '',
        check_out_date: res.departure || '',
        status: res.cod_reservation_status,
        amount: res.charge_total_amount ? `${res.charge_total_amount}€` : '0€',
        cod_channel: res.cod_channel,
        ota_id: res.ota_id,
        channel_identifier: res.cod_channel || 'UNKNOWN',
        email: res.email || '',
        phone: res.phone || '',
        tourist_tax_amount: res.city_tax_amount ? parseFloat(res.city_tax_amount) : 0,
        property_id: res.property_id || profile?.krossbooking_property_id, // Use profile's property_id as fallback
        id_room_type: res.id_room_type ? res.id_room_type.toString() : roomIdToRoomTypeMap.get(room.room_id),
      }));
    });

    const reservationsByRoom = await Promise.all(allReservationsPromises);
    const flattenedReservations = reservationsByRoom.flat();
    
    const uniqueReservations = Array.from(new Map(flattenedReservations.map(res => [res.id, res])).values());

    // --- Notification Logic ---
    // This logic is now handled by the server-side `check-new-reservations` Edge Function.
    // The client-side logic is removed to avoid duplicate notifications and reliance on user activity.
    // --- End Notification Logic ---
    
    reservationsCache = {
      data: uniqueReservations,
      timestamp: now,
    };
    console.log("Krossbooking reservations cached successfully.");

    return uniqueReservations;

  } catch (error) {
    console.error(`Error fetching all reservations:`, error);
    if (reservationsCache) {
      console.warn("Returning stale reservations cache due to API error.");
      return reservationsCache.data;
    }
    return [];
  }
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
      console.warn('Unexpected Krossbooking API response for rooms/get-rooms:', data);
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
  
  // Clear cache after a modification
  clearReservationsCache();
  clearHousekeepingTasksCache(); // Also clear housekeeping cache as reservations affect tasks

  return response;
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

export async function saveChannelManagerSettings(payload: ChannelManagerPayload): Promise<any> {
  return callKrossbookingProxy('save_channel_manager', payload);
}

export async function fetchKrossbookingRoomTypes(forceRefresh: boolean = false): Promise<KrossbookingRoomType[]> { // Add forceRefresh
  const now = Date.now();
  if (!forceRefresh && roomTypesCache && (now - roomTypesCache.timestamp < ROOM_TYPE_CACHE_DURATION)) {
    console.log("Returning cached Krossbooking room types.");
    return roomTypesCache.data;
  }

  try {
    console.log("Fetching fresh Krossbooking room types from API.");
    const profile = await getProfile(); // Fetch profile to get krossbooking_property_id
    const flatRoomsData = await callKrossbookingProxy('get_room_types', {
      id_property: profile?.krossbooking_property_id // Pass the property ID
    });

    if (!Array.isArray(flatRoomsData)) {
      console.warn('Unexpected Krossbooking API response for rooms/get-rooms:', flatRoomsData);
      return [];
    }

    const roomTypesMap = new Map<number, KrossbookingRoomType>();

    for (const room of flatRoomsData) {
      const typeId = room.id_room_type;
      const typeLabel = room.room_type_label || `Type ${typeId}`;

      if (!typeId) continue;

      if (!roomTypesMap.has(typeId)) {
        roomTypesMap.set(typeId, {
          id_room_type: typeId,
          label: typeLabel,
          rooms: [],
        });
      }

      const roomType = roomTypesMap.get(typeId);
      if (roomType) {
        roomType.rooms.push({
          id_room: room.id_room,
          label: room.label,
        });
      }
    }

    const processedRoomTypes = Array.from(roomTypesMap.values());
    
    roomTypesCache = {
      data: processedRoomTypes,
      timestamp: now,
    };
    console.log("Krossbooking room types cached successfully.");

    return processedRoomTypes;
  } catch (error) {
    console.error('Error fetching and processing Krossbooking room types:', error);
    if (roomTypesCache) {
      console.warn("Returning stale cache due to API error.");
      return roomTypesCache.data;
    }
    throw error;
  }
}