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

function getPennylaneApiKeys(): string[] {
  // Try in order; first valid key wins
  const candidates = ['PENNYLANE_API_KEY', 'PENNYLANE_API_KEYV1', 'PENNYLANE_API_KEYV1_BERCK'];
  const keys: string[] = [];
  for (const name of candidates) {
    const val = Deno.env.get(name);
    if (val && val.trim().length > 0) {
      keys.push(val.trim());
    }
  }
  return keys;
}

type ProxyAction = 'create_customer_invoice' | 'list_invoices';

async function fetchWithKeyFallback(url: string, baseOptions: RequestInit, keys: string[]) {
  if (keys.length === 0) {
    throw new Error("Erreur de configuration : aucune clé API Pennylane n'est définie sur le serveur.");
  }

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const options: RequestInit = {
      ...baseOptions,
      headers: {
        ...(baseOptions.headers || {}),
        'X-Api-Key': key,
      },
    };

    const response = await fetch(url, options);
    const responseData = await response.json().catch(() => ({}));

    if (response.ok) {
      return { data: responseData, keyUsed: key };
    }

    // If unauthorized due to invalid token, try next key
    const message =
      (Array.isArray(responseData?.errors) && responseData.errors[0]?.detail) ||
      responseData?.error ||
      responseData?.message ||
      `Pennylane API error (status ${response.status})`;

    console.error("Pennylane API Error:", responseData);

    const isInvalidToken =
      response.status === 401 ||
      String(message).toLowerCase().includes('access token is invalid');

    if (isInvalidToken && i < keys.length - 1) {
      console.warn("Invalid token for current key; trying next available Pennylane API key…");
      continue; // try next key
    }

    // Other errors or last key: stop and raise
    throw new Error(message);
  }

  // Should not reach here
  throw new Error("Aucune clé API Pennylane valide n'a fonctionné.");
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

    const body = await req.json().catch(() => ({}));
    const action: ProxyAction = body.action;

    let pennylaneCustomerId: number | null = null;
    if (action === 'list_invoices') {
      if (isAdmin && body.payload?.customer_id) {
        pennylaneCustomerId = parseInt(body.payload.customer_id);
        console.log(`Admin user ${caller.id} is requesting invoices for specific customer: ${pennylaneCustomerId}`);
      } else {
        pennylaneCustomerId = await getPennylaneCustomerId(supabaseAdmin, caller.id);
        console.log(`${isAdmin ? 'Admin' : 'Standard'} user ${caller.id} is requesting their own invoices.`);
      }

      if (!pennylaneCustomerId) {
        throw new Error("L'ID client Pennylane de l'utilisateur n'est pas configuré ou est vide.");
      }
      console.log(`Using Pennylane Customer ID: '${pennylaneCustomerId}' for the API call.`);
    }

    const keys = getPennylaneApiKeys();
    if (keys.length === 0) {
      console.error("No valid Pennylane API key found in environment.");
      throw new Error("Erreur de configuration : Clé API Pennylane manquante sur le serveur.");
    }

    let url: string;
    let baseOptions: RequestInit;

    switch (action) {
      case 'create_customer_invoice': {
        url = `${PENNYLANE_API_URL}/customer_invoices`;
        baseOptions = {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
          },
          body: JSON.stringify(body.payload),
        };
        break;
      }
      case 'list_invoices': {
        const params = new URLSearchParams();
        params.append('q[s]', `customer_id eq ${pennylaneCustomerId}`);
        if (body.payload?.limit) {
          params.append('limit', String(body.payload.limit));
        }
        url = `${PENNYLANE_API_URL}/customer_invoices?${params.toString()}`;
        baseOptions = {
          method: 'GET',
          headers: {
            'accept': 'application/json',
          },
        };
        break;
      }
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const { data, keyUsed } = await fetchWithKeyFallback(url, baseOptions, keys);
    console.log(`Pennylane request succeeded using a configured API key.`);

    const dataToReturn = action === 'list_invoices' ? { invoices: data.items } : data;

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