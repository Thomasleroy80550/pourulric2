import { supabase } from "@/integrations/supabase/client";
import { UserRoom } from "./user-room-api"; // Import UserRoom
import { createNotification } from "./notifications-api"; // Import the new function

interface KrossbookingReservation {
  id: string; // id_reservation from Krossbooking
  guest_name: string;
  property_name: string; // This will now be the actual room name from Krossbooking
  krossbooking_room_id: string; // Add this to store the actual Krossbooking room ID
  check_in_date: string;
  check_out_date: string;
  status: string;
  amount: string;
  cod_channel?: string; // Nouveau champ pour le code du canal (ex: 'AIRBNB', 'BOOKING')
  ota_id?: string;      // Nouveau champ pour l'ID de référence du canal
  channel_identifier?: string; // Utilisé pour la logique de couleur dans le calendrier
  email?: string; // Added for owner reservations
  phone?: string; // Added for owner reservations
}

// Define interface for Housekeeping Task
export interface KrossbookingHousekeepingTask {
  id_task: number;
  id_room: number;
  room_label: string;
  date: string; // yyyy-mm-dd
  status: 'pending' | 'completed' | 'in_progress' | 'cancelled';
  task_type: 'check_in' | 'check_out' | 'daily' | 'extra';
  notes?: string;
  assigned_to?: string;
}

// Define the payload for saving a reservation (create or update)
export interface SaveReservationPayload {
  id_reservation?: string; // Optional: for updating an existing reservation
  label: string;
  arrival: string; // yyyy-mm-dd
  departure: string; // yyyy-mm-dd
  email: string;
  phone: string;
  cod_reservation_status: 'PROP0' | 'PROPRI' | 'CANC'; // Added 'CANC' for cancellation
  id_room: string; // Krossbooking room ID
}

// New interfaces for Krossbooking Messaging
export interface KrossbookingMessage {
  id_message: number;
  id_thread: number;
  date: string; // yyyy-mm-dd hh:mm:ss
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

// New interfaces for Channel Manager
export interface Restrictions {
  MINST?: number; // Minimum stay
  MINSA?: number; // Minimum stay on arrival
  MAXST?: number; // Maximum stay
  MAXSA?: number; // Maximum stay on arrival
  EXST?: number; // Exact stay
  EXSTAR?: number; // Exact stay on arrival
  CLARR?: boolean; // Closed on arrival
  CLDEP?: boolean; // Closed on departure
}

export interface ChannelManagerBlock {
  id_room_type: number;
  id_rate: number;
  cod_channel: string;
  date_from: string; // yyyy-mm-dd
  date_to: string; // yyyy-mm-dd
  price?: number;
  closed?: boolean;
  restrictions?: Restrictions;
}

export interface ChannelManagerPayload {
  cm: {
    [key: string]: ChannelManagerBlock; // Dynamic keys like 'my_id_1'
  };
}

// Define the base URL for your Supabase Edge Function
const KROSSBOOKING_PROXY_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/krossbooking-proxy";

/**
 * Calls the Supabase Edge Function proxy for Krossbooking API.
 * @param action The action to perform (e.g., 'get_reservations', 'get_housekeeping_tasks', 'save_reservation', 'get_messages', 'get_single_message_thread', 'save_channel_manager').
 * @param payload The data payload for the action.
 * @returns A promise that resolves to the response data from the Edge Function.
 */
async function callKrossbookingProxy(action: string, payload?: any): Promise<any> {
  try {
    console.log(`Calling Krossbooking proxy with action: ${action}`);

    // Get the current Supabase session to include the authorization token
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
        'Authorization': `Bearer ${session.access_token}`, // Add the authorization header
      },
      body: JSON.stringify({ action, ...payload }), // Send action and payload
    });

    console.log(`Response status from Edge Function: ${response.status}`);
    const responseText = await response.text();
    console.log(`Raw response from Edge Function: ${responseText}`);

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
    console.log(`Parsed Krossbooking response from proxy (full data):`, krossbookingResponse); 

    return krossbookingResponse.data; // Return the 'data' array from the proxy response
  } catch (error: any) {
    console.error("Error calling Krossbooking proxy:", error.message);
    throw error;
  }
}

/**
 * Fetches reservations from Krossbooking API via the Supabase Edge Function proxy for multiple rooms.
 * @param userRooms An array of UserRoom objects to fetch reservations for.
 * @returns A promise that resolves to an array of KrossbookingReservation objects.
 */
export async function fetchKrossbookingReservations(userRooms: UserRoom[]): Promise<KrossbookingReservation[]> {
  let allReservations: KrossbookingReservation[] = [];
  const roomIds = userRooms.map(room => room.room_id); // Extract room_ids from userRooms

  for (const roomId of roomIds) {
    try {
      const data = await callKrossbookingProxy('get_reservations', { id_room: roomId });
      if (Array.isArray(data)) {
        const roomReservations = data.map((res: any) => {
          // Find the user-friendly room name based on the Krossbooking room ID
          const userFriendlyRoom = userRooms.find(ur => ur.room_id === roomId);
          const propertyName = userFriendlyRoom ? userFriendlyRoom.room_name : 'N/A';

          const krossbookingRoomId = res.rooms?.[0]?.id_room?.toString() || ''; // Capture the actual Krossbooking room ID
          return {
            id: res.id_reservation.toString(), 
            guest_name: res.label || 'N/A', 
            property_name: propertyName, // Use the user-friendly name
            krossbooking_room_id: krossbookingRoomId, // Populate it
            check_in_date: res.arrival || '', 
            check_out_date: res.departure || '', 
            status: res.cod_reservation_status, 
            amount: res.charge_total_amount ? `${res.charge_total_amount}€` : '0€', 
            cod_channel: res.cod_channel,
            ota_id: res.ota_id,
            channel_identifier: res.cod_channel || 'UNKNOWN',
            email: res.email || '', // Include email
            phone: res.phone || '', // Include phone
          };
        });
        allReservations = allReservations.concat(roomReservations);
      } else {
        console.warn(`Unexpected Krossbooking API response structure for reservations for room ${roomId} or no data array:`, data);
      }
    } catch (error) {
      console.error(`Error fetching reservations for room ${roomId}:`, error);
      // Continue fetching for other rooms even if one fails
    }
  }
  return allReservations;
}

/**
 * Fetches housekeeping tasks from Krossbooking API via the Supabase Edge Function proxy for multiple rooms.
 * @param dateFrom Start date (yyyy-mm-dd).
 * @param dateTo End date (yyyy-mm-dd).
 * @param roomIds An array of Krossbooking room IDs to fetch tasks for.
 * @param idProperty Optional: The ID of the property to fetch tasks for.
 * @returns A promise that resolves to an array of KrossbookingHousekeepingTask objects.
 */
export async function fetchKrossbookingHousekeepingTasks(
  dateFrom: string,
  dateTo: string,
  roomIds: number[], // Changed to array of numbers
  idProperty?: number,
): Promise<KrossbookingHousekeepingTask[]> {
  let allTasks: KrossbookingHousekeepingTask[] = [];
  for (const roomId of roomIds) {
    try {
      const data = await callKrossbookingProxy('get_housekeeping_tasks', {
        date_from: dateFrom,
        date_to: dateTo,
        id_property: idProperty,
        id_room: roomId, // Pass single room ID per call
      });

      if (Array.isArray(data)) {
        const roomTasks = data.map((task: any) => ({
          id_task: task.id_task,
          id_room: task.id_room,
          room_label: task.room_label || 'N/A',
          date: task.date || '', 
          status: task.cod_status, 
          task_type: task.cod_task_type, 
          notes: task.notes,
          assigned_to: task.assigned_to,
        }));
        allTasks = allTasks.concat(roomTasks);
      } else {
        console.warn(`Unexpected Krossbooking API response structure for housekeeping tasks for room ${roomId} or no data array:`, data);
      }
    } catch (error) {
      console.error(`Error fetching housekeeping tasks for room ${roomId}:`, error);
      // Continue fetching for other rooms even if one fails
    }
  }
  return allTasks;
}

/**
 * Saves a reservation (including owner blocks) to Krossbooking API via the Supabase Edge Function proxy.
 * Can also update an existing reservation if id_reservation is provided.
 * @param payload The reservation data to save/update.
 * @returns A promise that resolves to the response data from the Edge Function.
 */
export async function saveKrossbookingReservation(payload: SaveReservationPayload): Promise<any> {
  const response = await callKrossbookingProxy('save_reservation', payload);

  // After successfully saving, create a notification for the user
  const { data: { user } } = await supabase.auth.getUser();
  if (user && !payload.id_reservation) { // Only notify on creation, not update
    await createNotification(
      user.id,
      `Nouvelle réservation propriétaire créée : ${payload.label}`,
      '/calendar' // Link to the calendar page
    );
  }

  return response;
}

/**
 * Fetches message threads for a specific reservation from Krossbooking API via the Supabase Edge Function proxy.
 * This function now first gets the list of threads, then fetches messages for each thread.
 * @param reservationId The ID of the reservation to fetch messages for.
 * @returns A promise that resolves to an array of KrossbookingMessageThread objects.
 */
export async function fetchKrossbookingMessageThreads(reservationId: string): Promise<KrossbookingMessageThread[]> {
  try {
    // Step 1: Get the list of thread IDs for the reservation
    const threadsMetadata = await callKrossbookingProxy('get_messages', { id_reservation: reservationId });

    if (!Array.isArray(threadsMetadata)) {
      console.warn(`Unexpected Krossbooking API response structure for message threads metadata:`, threadsMetadata);
      return [];
    }

    // Step 2: For each thread, fetch its detailed messages
    const fullThreadsPromises = threadsMetadata.map(async (threadMetadata: any) => {
      if (threadMetadata.id_thread) {
        const singleThreadData = await callKrossbookingProxy('get_single_message_thread', { id_thread: threadMetadata.id_thread });
        
        // Krossbooking's get-thread returns a single object, not an array.
        // The messages array is directly inside this object.
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
          return { ...threadMetadata, messages: [] }; // Return metadata with empty messages if structure is unexpected
        }
      }
      return { ...threadMetadata, messages: [] }; // Return metadata with empty messages if no id_thread
    });

    const fullThreads = await Promise.all(fullThreadsPromises);
    return fullThreads;

  } catch (error) {
    console.error(`Error fetching message threads for reservation ${reservationId}:`, error);
    throw error;
  }
}

/**
 * Saves channel manager settings (prices and restrictions) to Krossbooking API via the Supabase Edge Function proxy.
 * @param payload The channel manager data to save.
 * @returns A promise that resolves to the response data from the Edge Function.
 */
export async function saveChannelManagerSettings(payload: ChannelManagerPayload): Promise<any> {
  return callKrossbookingProxy('save_channel_manager', payload);
}