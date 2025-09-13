import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@16.2.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { account_id } = await req.json();

    if (!account_id) {
      return new Response(JSON.stringify({ error: "Account ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
      apiVersion: "2024-06-20",
      typescript: true,
    });

    const externalAccounts = await stripe.accounts.listExternalAccounts(
      account_id,
      { object: "bank_account", limit: 100 }
    );

    // Stripe does not return the full IBAN for security reasons.
    // We will return the available information (last4, bank_name, country).
    const simplifiedAccounts = externalAccounts.data.map(account => ({
      id: account.id,
      object: account.object,
      account_holder_name: account.account_holder_name,
      bank_name: account.bank_name,
      country: account.country,
      currency: account.currency,
      last4: account.last4,
      routing_number: account.routing_number,
      status: account.status,
      // IBAN is not included here as it's not returned by Stripe API
    }));

    return new Response(JSON.stringify(simplifiedAccounts), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Stripe external accounts error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});