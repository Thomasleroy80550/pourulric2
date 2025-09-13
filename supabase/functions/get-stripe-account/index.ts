import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Admin check
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: authError } = await userSupabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized: User not authenticated.");
    }
    const { data: profile, error: profileError } = await userSupabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileError || profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required." }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!STRIPE_SECRET_KEY) {
        throw new Error("Stripe secret key is not configured.");
    }
    
    const { account_id } = await req.json();
    if (!account_id) {
        throw new Error("account_id is required.");
    }

    // Fetch account from Stripe
    const stripeResponse = await fetch(`https://api.stripe.com/v1/accounts/${account_id}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        }
    });

    if (!stripeResponse.ok) {
        const errorBody = await stripeResponse.json();
        throw new Error(`Stripe API error: ${errorBody.error.message}`);
    }

    const stripeAccount = await stripeResponse.json();

    return new Response(JSON.stringify(stripeAccount), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in get-stripe-account function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});