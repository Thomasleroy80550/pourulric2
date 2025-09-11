import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admins only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables.')
    }

    const url = new URL(req.url)
    const paymentIntentId = url.searchParams.get('id')
    const limit = url.searchParams.get('limit') || '20';

    let stripeApiUrl;
    if (paymentIntentId) {
      stripeApiUrl = `https://api.stripe.com/v1/payment_intents/${paymentIntentId}?expand[]=latest_charge.balance_transaction`
    } else {
      stripeApiUrl = `https://api.stripe.com/v1/payment_intents?limit=${limit}&expand[]=data.latest_charge.balance_transaction&expand[]=data.customer`
    }

    const stripeResponse = await fetch(stripeApiUrl, {
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
      },
    })

    if (!stripeResponse.ok) {
      const errorBody = await stripeResponse.json()
      throw new Error(`Stripe API error: ${errorBody.error.message}`)
    }

    const data = await stripeResponse.json()

    if (paymentIntentId && data.object === 'payment_intent') {
      return new Response(JSON.stringify({ object: 'list', data: [data], has_more: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})