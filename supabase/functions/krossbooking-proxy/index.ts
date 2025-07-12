import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const KROSSBOOKING_API_BASE_URL = "https://api.krossbooking.com/v5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to get the authentication token from Krossbooking
async function getAuthToken(): Promise<string> {
  const KROSSBOOKING_API_KEY = Deno.env.get('KROSSBOOKING_API_KEY');
  const KROSSBOOKING_HOTEL_ID_STR = Deno.env.get('KROSSBOOKING_HOTEL_ID'); // Get as string
  const KROSSBOOKING_USERNAME = Deno.env.get('KROSSBOOKING_USERNAME');
  const KROSSBOOKING_PASSWORD = Deno.env.get('KROSSBOOKING_PASSWORD');

  console.log("--- Krossbooking Auth Attempt ---");
  console.log(`DEBUG: KROSSBOOKING_API_KEY (set?): ${!!KROSSBOOKING_API_KEY}`);
  console.log(`DEBUG: KROSSBOOKING_HOTEL_ID_STR (value): '${KROSSBOOKING_HOTEL_ID_STR}'`);
  console.log(`DEBUG: KROSSBOOKING_USERNAME (set?): ${!!KROSSBOOKING_USERNAME}`);
  console.log(`DEBUG: KROSSBOOKING_PASSWORD (set?): ${!!KROSSBOOKING_PASSWORD}`);

  if (!KROSSBOOKING_API_KEY || !KROSSBOOKING_HOTEL_ID_STR || !KROSSBOOKING_USERNAME || !KROSSBOOKING_PASSWORD) {
    throw new Error("Missing Krossbooking API credentials in environment variables.");
  }

  // IMPORTANT: Based on Krossbooking documentation, hotel_id is a string.
  // We will pass it as a string directly.
  const KROSSBOOKING_HOTEL_ID = KROSSBOOKING_HOTEL_ID_STR;

  const authPayload = {
    api_key: KROSSBOOKING_API_KEY,
    hotel_id: KROSSBOOKING_HOTEL_ID, // Now explicitly a string
    username: KROSSBOOKING_USERNAME,
    password: KROSSBOOKING_PASSWORD,
  };

  console.log("Auth Payload sent:", JSON.stringify(authPayload));

  const response = await fetch(`${KROSSBOOKING_API_BASE_URL}/auth/get-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
    body: JSON.stringify(authPayload),
  });

  console.log(`Krossbooking Auth Response Status: ${response.status}`);
  console.log(`Krossbooking Auth Response Status Text: ${response.statusText}`);

  const clonedResponse = response.clone();
  const rawResponseText = await clonedResponse.text();
  console.log("Krossbooking Raw Auth Response Body:", rawResponseText);

  if (!response.ok) {
    let errorData;
    try {
      errorData = JSON.parse(rawResponseText);
    } catch (e) {
      errorData = rawResponseText;
    }
    console.error("Failed to get Krossbooking token. Error data:", errorData);
    throw new Error(`Failed to get Krossbooking token: ${response.statusText} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  console.log("Krossbooking token response data (parsed JSON):", data);
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
    // Authenticate with Supabase to get the user's session
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Authentication error:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized: User not authenticated." }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const authToken = await getAuthToken();
    console.log("Successfully obtained Krossbooking auth token.");

    let action: string | undefined;
    let requestBody: any = {}; // Initialize requestBody

    const contentLength = req.headers.get('content-length');
    console.log(`Received Content-Length: ${contentLength}`);

    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type');
      console.log(`Received Content-Type for POST: ${contentType}`);
      if (contentType && contentType.includes('application/json')) {
        try {
          requestBody = await req.json();
          action = requestBody.action;
        } catch (jsonParseError) {
          console.error("Error parsing request body as JSON:", jsonParseError);
          return new Response(JSON.stringify({ error: "Invalid JSON in request body." }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          });
        }
      } else {
        console.error(`Received POST request with unexpected Content-Type: ${contentType}`);
        return new Response(JSON.stringify({ error: "Expected 'application/json' for POST requests." }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      }
    } else {
      console.warn(`Received unsupported HTTP method: ${req.method}`);
      return new Response(JSON.stringify({ error: `Unsupported HTTP method: ${req.method}` }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    console.log(`Received action: ${action}, requestBody:`, requestBody); 

    let krossbookingUrl = '';
    let krossbookingMethod = 'POST'; 
    let krossbookingBody: string | undefined;

    switch (action) {
      case 'get_reservations':
        const getReservationsPayload: any = {
          with_rooms: true, 
        };
        if (requestBody.id_room) { 
          getReservationsPayload.id_room = Number(requestBody.id_room); // Ensure it's a number
        }
        krossbookingUrl = `${KROSSBOOKING_API_BASE_URL}/reservations/get-list`;
        krossbookingBody = JSON.stringify(getReservationsPayload);
        break;

      case 'get_housekeeping_tasks':
        const { date_from, date_to } = requestBody; 
        if (!date_from || !date_to) {
          throw new Error("Missing required parameters: date_from and date_to for get_housekeeping_tasks.");
        }
        const getTasksPayload: any = {
          date_from,
          date_to,
        };
        if (requestBody.id_property) { // Use requestBody.id_property directly
          getTasksPayload.id_property = Number(requestBody.id_property); // Ensure it's a number
        }
        if (requestBody.id_room) { 
          getTasksPayload.id_room = Number(requestBody.id_room); // Ensure it's a number
        }
        krossbookingUrl = `${KROSSBOOKING_API_BASE_URL}/housekeeping/get-tasks`;
        krossbookingBody = JSON.stringify(getTasksPayload);
        break;

      case 'save_reservation':
        const { id_reservation, label, arrival, departure, email, phone, cod_reservation_status, id_room } = requestBody; 
        if (!label || !arrival || !departure || !cod_reservation_status || !id_room) { 
          throw new Error("Missing required parameters for save_reservation.");
        }
        const saveReservationPayload: any = { // Use any to allow id_reservation
          label,
          arrival,
          departure,
          email: email || '',
          phone: phone || '',
          cod_reservation_status,
          id_property: 1, // Hardcoded to 1 as per clarification
          rooms: [ // Room details now in an array
            {
              id_room_type: Number(id_room), // Use id_room from requestBody as id_room_type
              guests: 1 // Default guests to 1 for owner reservations
            }
          ]
        };

        if (id_reservation) {
          saveReservationPayload.id_reservation = Number(id_reservation); // Add id_reservation for updates
        }

        console.log("DEBUG (Edge Function): Payload sent to Krossbooking reservations/save:", JSON.stringify(saveReservationPayload));

        krossbookingUrl = `${KROSSBOOKING_API_BASE_URL}/reservations/save`;
        krossbookingMethod = 'POST';
        krossbookingBody = JSON.stringify(saveReservationPayload);
        break;

      case 'get_messages':
        const { id_reservation: msgReservationId } = requestBody;
        if (!msgReservationId) {
          throw new Error("Missing required parameter: id_reservation for get_messages.");
        }
        const messagesPayload = {
          id_reservation: Number(msgReservationId), // Ensure it's a number
          // Add other optional parameters if needed, e.g., to_read, search, last_update, cod_channel
          // to_read: requestBody.to_read,
          // search: requestBody.search,
          // last_update: requestBody.last_update,
          // cod_channel: requestBody.cod_channel,
        };
        krossbookingUrl = `${KROSSBOOKING_API_BASE_URL}/messaging/get-threads`;
        krossbookingBody = JSON.stringify(messagesPayload);
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    console.log(`Calling Krossbooking API with URL: ${krossbookingUrl}, Method: ${krossbookingMethod}, Body: ${krossbookingBody || 'N/A'}`);

    const response = await fetch(krossbookingUrl, {
      method: krossbookingMethod,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        ...corsHeaders,
      },
      body: krossbookingBody,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Krossbooking API returned non-OK status: ${response.status} ${response.statusText}`);
      console.error("Krossbooking API Error Body:", errorBody);
      throw new Error(`Krossbooking API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    console.log("Krossbooking API response (full data, now filtered by Edge Function):", data); 

    // Return all data received from Krossbooking API
    return new Response(JSON.stringify({ data: data.data || [], total_count: data.total_count, count: data.count, limit: data.limit, offset: data.offset }), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in krossbooking-proxy function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
});