import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// Utilisation de la nouvelle URL de base de l'API, qui semble plus correcte.
const PENNYLANE_API_BASE_URL = "https://api.pennylane.com/api/external/v2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fonction pour récupérer l'ID client Pennylane de l'utilisateur depuis son profil
async function getPennylaneCustomerId(supabaseClient: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('pennylane_customer_id')
    .eq('id', userId)
    .single();

  if (error) {
    console.error(`Error fetching profile for user ${userId}:`, error.message);
    // Ne pas exposer les erreurs de base de données au client
    throw new Error("Impossible de récupérer le profil utilisateur.");
  }

  return data?.pennylane_customer_id || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("--- Pennylane Proxy Function Start (Production Logic) ---");
    // 1. Authentifier l'utilisateur avec Supabase
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

    // 2. Récupérer l'ID client Pennylane de l'utilisateur
    const pennylaneCustomerId = await getPennylaneCustomerId(supabaseClient, user.id);

    if (!pennylaneCustomerId) {
      console.log(`User ${user.id} does not have a Pennylane customer ID configured.`);
      throw new Error("Votre ID client Pennylane n'est pas configuré dans votre profil.");
    }
    console.log(`Found Pennylane Customer ID: ${pennylaneCustomerId}`);

    // 3. Récupérer la clé API Pennylane depuis les secrets
    const PENNYLANE_API_KEY = Deno.env.get('PENNYLANE_API_KEY');
    if (!PENNYLANE_API_KEY) {
      console.error("PENNYLANE_API_KEY environment variable is not set.");
      throw new Error("Erreur de configuration : Clé API Pennylane manquante sur le serveur.");
    }
    console.log(`PENNYLANE_API_KEY is set.`);

    // 4. Appeler l'API Pennylane pour récupérer les factures du client
    const url = new URL(`${PENNYLANE_API_BASE_URL}/invoices`);
    url.searchParams.set('customer_id', pennylaneCustomerId);
    url.searchParams.set('sort', '-date');
    url.searchParams.set('limit', '100');

    console.log(`Calling Pennylane API URL: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PENNYLANE_API_KEY}`,
      },
    });

    const responseBodyText = await response.text();
    console.log(`Pennylane API Response Status: ${response.status}`);
    console.log("Pennylane API Raw Response Body:", responseBodyText);

    if (!response.ok) {
      const errorMessage = `Pennylane API error: ${response.status} ${response.statusText}. Response: ${responseBodyText}`;
      console.error(errorMessage);
      throw new Error("Une erreur est survenue lors de la récupération des factures depuis Pennylane.");
    }

    const data = JSON.parse(responseBodyText);
    console.log(`Pennylane API returned ${data.items?.length || 0} invoices for customer ${pennylaneCustomerId}.`);

    // 5. Renvoyer les données au client
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