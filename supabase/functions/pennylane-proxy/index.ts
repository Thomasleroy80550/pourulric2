import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PENNYLANE_API_URL = "https://app.pennylane.com/api/external/v2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getPennylaneCustomerId(supabaseClient: SupabaseClient, userId: string): Promise<number | null> {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('pennylane_customer_id')
    .eq('id', userId)
    .single();

  if (error) {
    console.error(`Error fetching profile for user ${userId}:`, error.message);
    throw new Error(`Impossible de récupérer le profil pour l'utilisateur ${userId}.`);
  }

  return data?.pennylane_customer_id ? parseInt(data.pennylane_customer_id) : null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    const { data: isAdmin, error: isAdminError } = await supabaseAdmin.rpc('is_admin', { user_id: caller.id });
    if (isAdminError) {
      console.error(`Error checking admin status for user ${caller.id}:`, isAdminError.message);
      throw new Error("Erreur lors de la vérification des permissions de l'utilisateur.");
    }

    let pennylaneCustomerId: number | null = null;
    const body = await req.json().catch(() => ({}));

    if (isAdmin) {
      const requestedCustomerId = body.customer_id;
      if (requestedCustomerId) {
        // Admin is requesting a specific customer's invoices
        pennylaneCustomerId = parseInt(requestedCustomerId);
        console.log(`Admin user ${caller.id} is requesting invoices for specific customer: ${pennylaneCustomerId}`);
      } else {
        // Admin is viewing their own finance page, so fetch their own ID
        pennylaneCustomerId = await getPennylaneCustomerId(supabaseAdmin, caller.id);
        console.log(`Admin user ${caller.id} is requesting their own invoices.`);
      }
    } else {
      // Standard user can only ever get their own invoices
      pennylaneCustomerId = await getPennylaneCustomerId(supabaseAdmin, caller.id);
      console.log(`Standard user ${caller.id} is requesting their own invoices.`);
    }

    if (!pennylaneCustomerId) {
      throw new Error("L'ID client Pennylane de l'utilisateur n'est pas configuré ou est vide.");
    }
    
    const PENNYLANE_API_KEY = Deno.env.get('PENNYLANE_API_KEY');
    if (!PENNYLANE_API_KEY) {
      console.error("PENNYLANE_API_KEY environment variable is not set.");
      throw new Error("Erreur de configuration : Clé API Pennylane manquante sur le serveur.");
    }

    const { action, ...payload } = body;

    let url: string;
    let options: RequestInit;

    switch (action) {
      case 'create_customer_invoice':
        url = `${PENNYLANE_API_URL}/customer_invoices`;
        options = {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'X-Api-Key': PENNYLANE_API_KEY,
          },
          body: JSON.stringify(payload.payload), // The actual payload is nested
        };
        break;
      case 'list_invoices':
        console.log(`Using Pennylane Customer ID: '${pennylaneCustomerId}' for the API call.`);
        
        const params = new URLSearchParams();
        params.append('q[s]', `customer_id eq ${pennylaneCustomerId}`);
        
        if (payload.limit) {
          params.append('limit', payload.limit.toString());
        }
        url = `${PENNYLANE_API_URL}/customer_invoices?${params.toString()}`;
        options = {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'X-Api-Key': PENNYLANE_API_KEY,
          },
        };
        break;
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const response = await fetch(url, options);
    const responseData = await response.json();

    if (!response.ok) {
      console.error("Pennylane API Error:", responseData);
      const errorMessage = responseData?.errors?.[0]?.detail || responseData?.message || "An unknown error occurred with Pennylane API.";
      throw new Error(errorMessage);
    }

    const dataToReturn = action === 'list_invoices' ? { invoices: responseData.items } : responseData;

    return new Response(JSON.stringify(dataToReturn), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
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