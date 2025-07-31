import { supabase } from "@/integrations/supabase/client";
import { UserRoom } from "./user-room-api";
import { createNotification } from "./notifications-api";

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

let roomTypesCache: {
  data: KrossbookingRoomType[];
  timestamp: number;
} | null = null;
const ROOM_TYPE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

let reservationsCache: {
  data: KrossbookingReservation[];
  timestamp: number;
} | null = null;
const RESERVATION_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

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

export async function fetchKrossbookingReservations(
  userRooms: UserRoom[],
  forceRefresh: boolean = false
): Promise<KrossbookingReservation[]> {
  const now = Date.now();
  if (!forceRefresh && reservationsCache && (now - reservationsCache.timestamp < RESERVATION_CACHE_DURATION)) {
    console.log("Returning cached Krossbooking reservations.");
    return reservationsCache.data;
  }
  
  console.log("Fetching fresh Krossbooking reservations from API.");
  try {
    // Make a single API call to get all reservations for the property
    const data = await callKrossbookingProxy('get_reservations');

    if (!Array.isArray(data)) {
      console.warn(`Unexpected Krossbooking API response structure for reservations or no data array:`, data);
      return [];
    }

    const allReservations = data.map((res: any): KrossbookingReservation => {
      const actualRoomId = res.rooms?.[0]?.id_room?.toString();
      const actualRoom = userRooms.find(ur => ur.room_id === actualRoomId);
      const propertyName = actualRoom ? actualRoom.room_name : 'Chambre inconnue';

      return {
        id: res.id_reservation.toString(),
        guest_name: res.label || 'N/A',
        property_name: propertyName,
        krossbooking_room_id: actualRoomId || '',
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
      };
    });

    const uniqueReservations = Array.from(new Map(allReservations.map(res => [res.id, res])).values());
    
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
): Promise<KrossbookingHousekeepingTask[]> {
  try {
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
    return allTasks.filter(task => roomIdsSet.has(task.id_room));

  } catch (error) {
    console.error(`Error fetching housekeeping tasks:`, error);
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

export async function fetchKrossbookingRoomTypes(): Promise<KrossbookingRoomType[]> {
  const now = Date.now();
  if (roomTypesCache && (now - roomTypesCache.timestamp < ROOM_TYPE_CACHE_DURATION)) {
    console.log("Returning cached Krossbooking room types.");
    return roomTypesCache.data;
  }

  try {
    console.log("Fetching fresh Krossbooking room types from API.");
    const flatRoomsData = await callKrossbookingProxy('get_room_types');

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