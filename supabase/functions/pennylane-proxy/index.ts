import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const PENNYLANE_API_BASE_URL = "https://api.pennylane.com/api/external/v2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("--- Pennylane Proxy Function Start (Diagnostic Mode v2) ---");
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

    // 2. Get the Pennylane API key from secrets
    const PENNYLANE_API_KEY = Deno.env.get('PENNYLANE_API_KEY');
    if (!PENNYLANE_API_KEY) {
      console.error("PENNYLANE_API_KEY environment variable is not set.");
      throw new Error("Missing PENNYLANE_API_KEY in environment variables.");
    }
    console.log(`PENNYLANE_API_KEY is set: ${!!PENNYLANE_API_KEY}`);

    // 3. [DIAGNOSTIC] Call the Pennylane API using the generic invoices endpoint WITHOUT customer filter
    const url = new URL(`${PENNYLANE_API_BASE_URL}/invoices`);
    url.searchParams.set('sort', '-date'); // Sort by most recent date
    url.searchParams.set('limit', '5');   // Fetch only 5 for this test

    console.log(`[DIAGNOSTIC] Calling Pennylane API URL: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PENNYLANE_API_KEY}`,
      },
    });

    console.log(`[DIAGNOSTIC] Pennylane API Response Status: ${response.status}`);
    const rawResponseText = await response.clone().text();
    console.log("[DIAGNOSTIC] Pennylane API Raw Response Body:", rawResponseText);

    if (!response.ok) {
      let errorBodyParsed;
      try {
        errorBodyParsed = JSON.parse(rawResponseText);
      } catch (e) {
        errorBodyParsed = rawResponseText;
      }
      console.error(`[DIAGNOSTIC] Pennylane API returned non-OK status: ${response.status} ${response.statusText}`);
      console.error("[DIAGNOSTIC] Pennylane API Error Body (parsed if JSON):", errorBodyParsed);
      // For this diagnostic, we will return the error but also the fact that it's a test
      const errorMessage = `Diagnostic failed: Pennylane API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorBodyParsed)}`;
      throw new Error(errorMessage);
    }

    const data = JSON.parse(rawResponseText);
    console.log(`[DIAGNOSTIC] Pennylane API returned ${data.items?.length || 0} invoices without customer filter.`);
    
    // NOTE: This diagnostic call will likely return invoices for ALL customers.
    // We are not filtering them for the user here, as the goal is just to see if the API responds.
    // In a real scenario, we would need to filter these results.
    // For now, we return them as is to confirm the connection works.

    // 4. Return the data to the client
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