import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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
    throw new Error("Impossible de récupérer le profil utilisateur.");
  }

  return data?.pennylane_customer_id || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("--- Pennylane Proxy Function Start ---");
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Authentication error:", authError?.message);
      return new Response(JSON.stringify({ error: "Non autorisé : Utilisateur non authentifié." }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    console.log(`Authenticated user ID: ${user.id}`);

    const pennylaneCustomerId = await getPennylaneCustomerId(supabaseClient, user.id);

    if (!pennylaneCustomerId) {
      console.log(`User ${user.id} does not have a Pennylane customer ID configured.`);
      throw new Error("Votre ID client Pennylane n'est pas configuré dans votre profil.");
    }
    console.log(`Found Pennylane Customer ID from profile: ${pennylaneCustomerId}`);

    const PENNYLANE_API_KEY = Deno.env.get('PENNYLANE_API_KEY');
    if (!PENNYLANE_API_KEY) {
      console.error("PENNYLANE_API_KEY environment variable is not set.");
      throw new Error("Erreur de configuration : Clé API Pennylane manquante sur le serveur.");
    }

    const url = new URL(`${PENNYLANE_API_BASE_URL}/customer_invoices`);
    // Utilisation directe du filtre `customer_id` de l'API
    url.searchParams.append('customer_id', pennylaneCustomerId);
    url.searchParams.append('sort', '-date');
    url.searchParams.append('limit', '100');

    console.log(`Calling Pennylane API with URL: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${PENNYLANE_API_KEY}` },
    });

    const responseBodyText = await response.text();
    if (!response.ok) {
      throw new Error(`Pennylane API error: ${response.status} ${response.statusText}. Response: ${responseBodyText}`);
    }

    const data = JSON.parse(responseBodyText);
    console.log(`Received ${data.items?.length || 0} invoices from Pennylane using the customer_id filter.`);

    // Plus de filtrage manuel. La réponse de l'API est directement renvoyée.
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