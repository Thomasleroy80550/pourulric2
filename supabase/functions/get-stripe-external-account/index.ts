import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.10.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// @ts-ignore
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: '2023-10-16',
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { account_id } = await req.json();
    if (!account_id) {
      throw new Error("L'ID du compte Stripe est manquant.");
    }

    const externalAccounts = await stripe.accounts.listExternalAccounts(account_id, {
      object: 'bank_account',
      limit: 1,
    });

    if (externalAccounts.data.length === 0) {
      return new Response(JSON.stringify({ error: "Aucun compte bancaire externe trouvé pour ce compte Stripe." }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const bankAccount = externalAccounts.data[0];

    return new Response(JSON.stringify(bankAccount), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Erreur dans la fonction Edge get-stripe-external-account:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});