import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const PENNYLANE_API_BASE_URL = "https://app.pennylane.com/api/external/v2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to get Pennylane Customer ID from a user's profile
async function getPennylaneCustomerId(supabaseClient: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('pennylane_customer_id')
    .eq('id', userId)
    .single();

  if (error) {
    console.error(`Error fetching profile for user ${userId}:`, error.message);
    throw new Error(`Impossible de récupérer le profil pour l'utilisateur ${userId}.`);
  }

  return data?.pennylane_customer_id || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("--- Pennylane Proxy Function Start ---");
    const { target_user_id } = (await req.json().catch(() => ({}))) || {};

    // Use the service role key to perform admin checks securely
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create a client with the user's auth context to get their ID
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !caller) {
      console.error("Authentication error:", authError?.message);
      return new Response(JSON.stringify({ error: "Non autorisé : Utilisateur non authentifié." }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    console.log(`Request from caller ID: ${caller.id}`);

    let userIdToFetchInvoicesFor: string;

    if (target_user_id) {
      console.log(`Admin request detected. Target User ID: ${target_user_id}`);
      // An admin is trying to fetch invoices for a specific user.
      // First, verify the caller is an admin.
      const { data: isAdmin, error: isAdminError } = await supabaseAdmin.rpc('is_admin', { user_id: caller.id });

      if (isAdminError || !isAdmin) {
        console.error(`Authorization error: Caller ${caller.id} is not an admin.`, isAdminError);
        return new Response(JSON.stringify({ error: "Action non autorisée." }), {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      console.log(`Caller ${caller.id} confirmed as admin.`);
      userIdToFetchInvoicesFor = target_user_id;
    } else {
      // Regular user fetching their own invoices.
      console.log(`Regular user request for own invoices.`);
      userIdToFetchInvoicesFor = caller.id;
    }

    const pennylaneCustomerId = await getPennylaneCustomerId(supabaseAdmin, userIdToFetchInvoicesFor);

    if (!pennylaneCustomerId) {
      console.log(`User ${userIdToFetchInvoicesFor} does not have a Pennylane customer ID configured.`);
      throw new Error("L'ID client Pennylane de l'utilisateur n'est pas configuré dans son profil.");
    }
    console.log(`Fetching invoices for Pennylane Customer ID: ${pennylaneCustomerId}`);

    const PENNYLANE_API_KEY = Deno.env.get('PENNYLANE_API_KEY');
    if (!PENNYLANE_API_KEY) {
      console.error("PENNYLANE_API_KEY environment variable is not set.");
      throw new Error("Erreur de configuration : Clé API Pennylane manquante sur le serveur.");
    }

    const url = new URL(`${PENNYLANE_API_BASE_URL}/customer_invoices`);
    url.searchParams.append('customer_id', pennylaneCustomerId);
    url.searchParams.append('sort', '-date');
    url.searchParams.append('limit', '100');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${PENNYLANE_API_KEY}` },
    });

    const responseBodyText = await response.text();
    if (!response.ok) {
      throw new Error(`Pennylane API error: ${response.status} ${response.statusText}. Response: ${responseBodyText}`);
    }

    const data = JSON.parse(responseBodyText);
    console.log(`Received ${data.items?.length || 0} invoices from Pennylane.`);

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