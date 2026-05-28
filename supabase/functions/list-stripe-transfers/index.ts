import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase environment is not configured.');
    }

    const userSupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') ?? '',
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await userSupabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error('Unauthorized: User not authenticated.');
    }

    const { data: profile, error: profileError } = await userSupabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!STRIPE_SECRET_KEY) {
      throw new Error('Stripe secret key is not configured.');
    }

    const bodyText = await req.text();
    const { account_id } = bodyText ? JSON.parse(bodyText) : {};

    const allTransfers: unknown[] = [];
    let hasMore = true;
    let startingAfter: string | null = null;

    while (hasMore) {
      const params = new URLSearchParams({ limit: '100' });

      if (account_id) {
        params.append('destination', account_id);
      }

      if (startingAfter) {
        params.append('starting_after', startingAfter);
      }

      const stripeResponse = await fetch(`https://api.stripe.com/v1/transfers?${params.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        },
      });

      if (!stripeResponse.ok) {
        const errorBody = await stripeResponse.json();
        throw new Error(`Stripe API error: ${errorBody.error?.message || 'Unknown error'}`);
      }

      const responseJson = await stripeResponse.json();
      allTransfers.push(...(responseJson.data ?? []));
      hasMore = Boolean(responseJson.has_more);
      startingAfter = hasMore && responseJson.data?.length
        ? responseJson.data[responseJson.data.length - 1].id
        : null;
    }

    return new Response(JSON.stringify(allTransfers), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    console.error('[list-stripe-transfers] request failed', { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
