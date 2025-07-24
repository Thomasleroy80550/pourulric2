import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PENNYLANE_API_BASE_URL = "https://app.pennylane.com/api/external/v2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  // La fonction attend désormais une requête POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed, please use POST' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    console.log("--- Pennylane Proxy Function Start ---");

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
    console.log(`Request from user ID: ${caller.id}.`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Vérifier si l'utilisateur est un admin
    const { data: isAdmin, error: isAdminError } = await supabaseAdmin.rpc('is_admin', { user_id: caller.id });
    if (isAdminError) {
      console.error(`Error checking admin status for user ${caller.id}:`, isAdminError.message);
      throw new Error("Erreur lors de la vérification des permissions de l'utilisateur.");
    }

    let pennylaneCustomerId: string | null = null;
    const body = await req.json().catch(() => ({})); // Gère les body vides ou invalides
    const requestedCustomerId = body.customer_id;

    if (isAdmin && requestedCustomerId) {
      console.log(`Admin user ${caller.id} is requesting invoices for specific customer: ${requestedCustomerId}`);
      pennylaneCustomerId = requestedCustomerId;
    } else {
      console.log(`Standard user or admin without specific request. Fetching own profile for user ${caller.id}.`);
      pennylaneCustomerId = await getPennylaneCustomerId(supabaseAdmin, caller.id);
    }

    if (!pennylaneCustomerId) {
      const errorMessage = `User ${caller.id} does not have a Pennylane customer ID configured, and no specific ID was requested.`;
      console.log(errorMessage);
      throw new Error("L'ID client Pennylane de l'utilisateur n'est pas configuré.");
    }
    
    console.log(`Using Pennylane Customer ID: '${pennylaneCustomerId}' for the API call.`);

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
    console.log(`Received ${data.items?.length || 0} invoices from Pennylane for customer ID ${pennylaneCustomerId}.`);

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