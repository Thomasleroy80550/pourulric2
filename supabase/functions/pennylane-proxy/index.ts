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
    console.log("--- Pennylane Proxy Function Start ---");
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
    console.log(`Authenticated user ID: ${user.id}`);

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
    console.log(`Retrieved Pennylane Customer ID from profile: ${pennylaneCustomerId}`);

    // 3. Get the Pennylane API key from secrets
    const PENNYLANE_API_KEY = Deno.env.get('PENNYLANE_API_KEY');
    if (!PENNYLANE_API_KEY) {
      console.error("PENNYLANE_API_KEY environment variable is not set.");
      throw new Error("Missing PENNYLANE_API_KEY in environment variables.");
    }
    console.log(`PENNYLANE_API_KEY is set: ${!!PENNYLANE_API_KEY}`);

    // 4. Call the Pennylane API using the general endpoint with a filter
    const url = new URL(`${PENNYLANE_API_BASE_URL}/customer_invoices`);
    const filterObject = [
      {
        "field": "customer_id",
        "operator": "eq",
        "value": pennylaneCustomerId
      }
    ];
    url.searchParams.set('filter', JSON.stringify(filterObject));
    url.searchParams.set('sort', '-date'); // Sort by most recent date
    url.searchParams.set('limit', '100'); // Fetch up to 100 invoices

    console.log(`Calling Pennylane API URL: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PENNYLANE_API_KEY}`,
      },
    });

    console.log(`Pennylane API Response Status: ${response.status}`);
    const rawResponseText = await response.clone().text(); // Clone response to read text without consuming body
    console.log("Pennylane API Raw Response Body:", rawResponseText);

    if (!response.ok) {
      let errorBodyParsed;
      try {
        errorBodyParsed = JSON.parse(rawResponseText);
      } catch (e) {
        errorBodyParsed = rawResponseText;
      }
      console.error(`Pennylane API returned non-OK status: ${response.status} ${response.statusText}`);
      console.error("Pennylane API Error Body (parsed if JSON):", errorBodyParsed);
      throw new Error(`Pennylane API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorBodyParsed)}`);
    }

    const data = JSON.parse(rawResponseText); // Parse the raw text
    console.log(`Pennylane API returned ${data.items?.length || 0} invoices for customer ID: ${pennylaneCustomerId}`);
    console.log("Pennylane API Parsed Data (first 5 items):", data.items ? data.items.slice(0, 5) : "No items");


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
  } finally {
    console.log("--- Pennylane Proxy Function End ---");
  }
});