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
    console.log("--- Pennylane Proxy Function Start (Production Logic) ---");
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
    console.log(`Found Pennylane Customer ID: ${pennylaneCustomerId}`);

    const PENNYLANE_API_KEY = Deno.env.get('PENNYLANE_API_KEY');
    if (!PENNYLANE_API_KEY) {
      console.error("PENNYLANE_API_KEY environment variable is not set.");
      throw new Error("Erreur de configuration : Clé API Pennylane manquante sur le serveur.");
    }
    console.log(`PENNYLANE_API_KEY is set.`);

    const url = new URL(`${PENNYLANE_API_BASE_URL}/customer_invoices`);
    // On continue d'envoyer le customer_id, au cas où Pennylane le supporterait un jour.
    url.searchParams.append('customer_id', pennylaneCustomerId);
    url.searchParams.append('sort', '-date');
    url.searchParams.append('limit', '100');

    console.log(`Calling Pennylane API URL (GET): ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${PENNYLANE_API_KEY}`,
      },
    });

    const responseBodyText = await response.text();
    console.log(`Pennylane API Response Status: ${response.status}`);
    
    if (!response.ok) {
      const errorMessage = `Pennylane API error: ${response.status} ${response.statusText}. Response: ${responseBodyText}`;
      console.error(errorMessage);
      throw new Error("Une erreur est survenue lors de la récupération des factures depuis Pennylane.");
    }

    const data = JSON.parse(responseBodyText);
    console.log(`Received ${data.items?.length || 0} invoices from Pennylane before filtering.`);

    // **FILTRAGE MANUEL AJOUTÉ ICI**
    // L'ID du profil est un string, celui de Pennylane est un nombre. On convertit.
    const customerIdToMatch = parseInt(pennylaneCustomerId, 10);
    if (isNaN(customerIdToMatch)) {
        throw new Error("L'ID client Pennylane dans votre profil n'est pas un nombre valide.");
    }

    const filteredItems = (data.items || []).filter(invoice => 
        invoice.customer && invoice.customer.id === customerIdToMatch
    );

    console.log(`Found ${filteredItems.length} invoices after filtering for customer ID ${customerIdToMatch}.`);

    // On reconstruit la réponse avec seulement les factures filtrées.
    const filteredResponse = {
        ...data,
        items: filteredItems,
    };

    return new Response(JSON.stringify(filteredResponse), {
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