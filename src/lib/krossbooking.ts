import { supabase } from "@/integrations/supabase/client";

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

// Define the base URL for your Supabase Edge Function
const KROSSBOOKING_PROXY_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/krossbooking-proxy";

/**
 * Calls the Supabase Edge Function proxy for Krossbooking API.
 * @param action The action to perform (e.g., 'get_reservations', 'get_housekeeping_tasks', 'save_reservation').
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
 * @param roomIds An array of Krossbooking room IDs to fetch reservations for.
 * @returns A promise that resolves to an array of KrossbookingReservation objects.
 */
export async function fetchKrossbookingReservations(roomIds: string[]): Promise<KrossbookingReservation[]> {
  let allReservations: KrossbookingReservation[] = [];
  for (const roomId of roomIds) {
    try {
      const data = await callKrossbookingProxy('get_reservations', { id_room: roomId });
      if (Array.isArray(data)) {
        const roomReservations = data.map((res: any) => {
          const roomLabel = res.rooms?.[0]?.label || res.rooms?.[0]?.id_room?.toString() || 'N/A';
          const krossbookingRoomId = res.rooms?.[0]?.id_room?.toString() || ''; // Capture the room ID
          return {
            id: res.id_reservation.toString(), 
            guest_name: res.label || 'N/A', 
            property_name: roomLabel,
            krossbooking_room_id: krossbookingRoomId, // Populate it
            check_in_date: res.arrival || '', 
            check_out_date: res.departure || '', 
            status: res.cod_reservation_status, 
            amount: res.charge_total_amount ? `${res.charge_total_amount}€` : '0€', 
            cod_channel: res.cod_channel,
            ota_id: res.ota_id,
            channel_identifier: res.cod_channel || 'UNKNOWN',
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
  return callKrossbookingProxy('save_reservation', payload);
}