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
    console.log('Freshdesk proxy: Starting request');
    
    const authHeader = req.headers.get('Authorization');
    console.log('Freshdesk proxy: Auth header present:', !!authHeader);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    )

    console.log('Freshdesk proxy: Getting user...');
    const { data: { user } } = await supabaseClient.auth.getUser()
    console.log('Freshdesk proxy: User found:', !!user);

    if (!user) {
      console.log('Freshdesk proxy: No user found');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const FRESHDESK_DOMAIN = Deno.env.get('FRESHDESK_DOMAIN')
    const FRESHDESK_API_KEY = Deno.env.get('FRESHDESK_API_KEY')

    console.log('Freshdesk proxy: Domain configured:', !!FRESHDESK_DOMAIN);
    console.log('Freshdesk proxy: API key configured:', !!FRESHDESK_API_KEY);

    if (!FRESHDESK_DOMAIN || !FRESHDESK_API_KEY) {
      console.log('Freshdesk proxy: Missing credentials');
      return new Response(JSON.stringify({ error: 'Les identifiants Freshdesk ne sont pas configurés.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userEmail = user.email;
    console.log('Freshdesk proxy: User email:', userEmail);
    
    if (!userEmail) {
      console.log('Freshdesk proxy: No user email');
      return new Response(JSON.stringify({ error: 'Email utilisateur non trouvé.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const encodedEmail = encodeURIComponent(userEmail);
    const freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets?email=${encodedEmail}&include=description&order_by=updated_at&order_type=desc`;

    console.log('Freshdesk proxy: Calling Freshdesk URL:', freshdeskUrl);

    const freshdeskResponse = await fetch(freshdeskUrl, {
      headers: {
        'Authorization': `Basic ${btoa(FRESHDESK_API_KEY + ':X')}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Freshdesk proxy: Freshdesk response status:', freshdeskResponse.status);

    if (!freshdeskResponse.ok) {
      const errorBody = await freshdeskResponse.text();
      console.error(`Freshdesk proxy: Erreur API Freshdesk: ${freshdeskResponse.status} ${errorBody}`);
      return new Response(JSON.stringify({ error: 'Impossible de récupérer les tickets depuis Freshdesk.', details: errorBody }), {
        status: freshdeskResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tickets = await freshdeskResponse.json();
    console.log('Freshdesk proxy: Successfully retrieved', tickets.length, 'tickets');

    return new Response(JSON.stringify(tickets), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Freshdesk proxy: Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})