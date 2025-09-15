import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const KROSSBOOKING_API_BASE_URL = "https://api.krossbooking.com/v5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAuthToken(): Promise<string> {
  const KROSSBOOKING_API_KEY = Deno.env.get('KROSSBOOKING_API_KEY');
  const KROSSBOOKING_HOTEL_ID = Deno.env.get('KROSSBOOKING_HOTEL_ID');
  const KROSSBOOKING_USERNAME = Deno.env.get('KROSSBOOKING_USERNAME');
  const KROSSBOOKING_PASSWORD = Deno.env.get('KROSSBOOKING_PASSWORD');

  if (!KROSSBOOKING_API_KEY || !KROSSBOOKING_HOTEL_ID || !KROSSBOOKING_USERNAME || !KROSSBOOKING_PASSWORD) {
    throw new Error("Missing Krossbooking API credentials in environment variables.");
  }

  const authPayload = {
    api_key: KROSSBOOKING_API_KEY,
    hotel_id: KROSSBOOKING_HOTEL_ID,
    username: KROSSBOOKING_USERNAME,
    password: KROSSBOOKING_PASSWORD,
  };

  const response = await fetch(`${KROSSBOOKING_API_BASE_URL}/auth/get-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(authPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get Krossbooking token: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  if (data && data.auth_token) {
    return data.auth_token;
  } else {
    throw new Error("Krossbooking token not found in response.");
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication Check ---
    const authHeader = req.headers.get('Authorization');
    const isCron = authHeader === `Bearer ${Deno.env.get('CRON_SECRET')}`;
    let supabaseClient;

    if (!isCron) {
      // If it's not the cron job, it must be an authenticated user.
      supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader! } } }
      );
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized: User not authenticated." }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }
    // --- End Authentication Check ---

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: `Unsupported HTTP method: ${req.method}` }), {
            status: 405,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }

    const requestBody = await req.json();
    const { action } = requestBody;

    if (!action) {
        return new Response(JSON.stringify({ error: "Missing 'action' in request body." }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }

    const authToken = await getAuthToken();

    let krossbookingUrl = '';
    let krossbookingMethod = 'POST';
    let krossbookingBody: string | undefined;
    let returnFullData = false;

    switch (action) {
      case 'get_reservations_for_room':
        if (!requestBody.id_room) {
          throw new Error("Missing id_room for get_reservations_for_room.");
        }
        krossbookingUrl = `${KROSSBOOKING_API_BASE_URL}/reservations/get-list`;
        krossbookingBody = JSON.stringify({
          with_rooms: true,
          id_room: Number(requestBody.id_room),
          id_property: requestBody.id_property ? Number(requestBody.id_property) : undefined, // Use property ID if provided
        });
        break;

      case 'get_housekeeping_tasks':
        const { date_from, date_to, id_property } = requestBody;
        if (!date_from || !date_to) {
          throw new Error("Missing date_from/date_to for get_housekeeping_tasks.");
        }
        krossbookingUrl = `${KROSSBOOKING_API_BASE_URL}/housekeeping/get-tasks`;
        krossbookingBody = JSON.stringify({
          date_from,
          date_to,
          id_property: id_property ? Number(id_property) : undefined,
        });
        break;

      case 'save_reservation':
        const { id_reservation, label, arrival, departure, cod_reservation_status, id_room, id_room_type, property_id } = requestBody;
        if (!label || !arrival || !departure || !cod_reservation_status || !id_room || !id_room_type || property_id === undefined) {
          throw new Error("Missing required parameters for save_reservation (label, arrival, departure, cod_reservation_status, id_room, id_room_type, property_id).");
        }
        const savePayload: any = {
          label,
          arrival,
          departure,
          email: requestBody.email || '',
          phone: requestBody.phone || '',
          cod_reservation_status,
          id_property: Number(property_id), // Dynamic property_id from client
          rooms: [{ id_room: Number(id_room), id_room_type: Number(id_room_type), guests: 1 }]
        };
        if (id_reservation) {
          savePayload.id_reservation = Number(id_reservation);
        }
        krossbookingUrl = `${KROSSBOOKING_API_BASE_URL}/reservations/save`;
        krossbookingBody = JSON.stringify(savePayload);
        break;

      case 'get_messages':
        if (!requestBody.id_reservation) {
          throw new Error("Missing id_reservation for get_messages.");
        }
        krossbookingUrl = `${KROSSBOOKING_API_BASE_URL}/messaging/get-threads`;
        krossbookingBody = JSON.stringify({ id_reservation: Number(requestBody.id_reservation) });
        break;

      case 'get_single_message_thread':
        if (!requestBody.id_thread) {
          throw new Error("Missing id_thread for get_single_message_thread.");
        }
        krossbookingUrl = `${KROSSBOOKING_API_BASE_URL}/messaging/get-thread`;
        krossbookingBody = JSON.stringify({ id_thread: Number(requestBody.id_thread) });
        returnFullData = true;
        break;

      case 'save_channel_manager':
        const { cm } = requestBody;
        if (!cm || typeof cm !== 'object') {
          throw new Error("Invalid 'cm' payload for save_channel_manager.");
        }
        krossbookingUrl = `${KROSSBOOKING_API_BASE_URL}/channel/save-cm`;
        krossbookingBody = JSON.stringify({ cm });
        break;

      case 'get_room_types':
        krossbookingUrl = `${KROSSBOOKING_API_BASE_URL}/rooms/get-rooms`;
        krossbookingMethod = 'POST';
        krossbookingBody = JSON.stringify({
          id_property: requestBody.id_property ? Number(requestBody.id_property) : undefined // Use property ID if provided
        });
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    const krossbookingResponse = await fetch(krossbookingUrl, {
      method: krossbookingMethod,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: krossbookingBody,
    });

    if (!krossbookingResponse.ok) {
      const errorText = await krossbookingResponse.text();
      throw new Error(`Krossbooking API error: ${krossbookingResponse.status} - ${errorText}`);
    }

    const data = await krossbookingResponse.json();

    let responsePayload;
    if (returnFullData) {
        responsePayload = { data: data };
    } else {
        responsePayload = { 
            data: data.data || [], 
            total_count: data.total_count, 
            count: data.count, 
            limit: data.limit, 
            offset: data.offset 
        };
    }
    
    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});