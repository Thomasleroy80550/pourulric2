import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const PENNYLANE_API_BASE_URL = "https://app.pennylane.com/api/external/v2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate the user with Supabase
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

    // 2. Fetch the user's Pennylane Customer ID from their profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('pennylane_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.pennylane_customer_id) {
      console.warn(`User ${user.id} does not have a Pennylane Customer ID configured.`);
      return new Response(JSON.stringify({ error: "Pennylane Customer ID not configured for this user." }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    const pennylaneCustomerId = profile.pennylane_customer_id;

    // 3. Get the Pennylane API key from secrets
    const PENNYLANE_API_KEY = Deno.env.get('PENNYLANE_API_KEY');
    if (!PENNYLANE_API_KEY) {
      throw new Error("Missing PENNYLANE_API_KEY in environment variables.");
    }

    // 4. Call the Pennylane API with the corrected filter format
    const url = new URL(`${PENNYLANE_API_BASE_URL}/customer_invoices`);
    const filterObject = {
      customer_id: {
        eq: pennylaneCustomerId
      }
    };
    url.searchParams.set('filter', JSON.stringify(filterObject));
    url.searchParams.set('sort', '-date'); // Sort by most recent date
    url.searchParams.set('limit', '100'); // Fetch up to 100 invoices

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PENNYLANE_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Pennylane API returned non-OK status: ${response.status} ${response.statusText}`);
      console.error("Pennylane API Error Body:", errorBody);
      throw new Error(`Pennylane API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();

    // 5. Return the data to the client
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in pennylane-proxy function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});