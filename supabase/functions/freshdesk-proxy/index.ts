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

    const FRESHDESK_DOMAIN = Deno.env.get('FRESHDESK_DOMAIN')
    const FRESHDESK_API_KEY = Deno.env.get('FRESHDESK_API_KEY')

    if (!FRESHDESK_DOMAIN || !FRESHDESK_API_KEY) {
      return new Response(JSON.stringify({ error: 'Les identifiants Freshdesk ne sont pas configurés.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    const authHeader = `Basic ${btoa(FRESHDESK_API_KEY + ':X')}`;
    const url = new URL(req.url);

    if (req.method === 'GET') {
      const ticketId = url.searchParams.get('ticketId');
      let freshdeskUrl;

      if (ticketId) {
        // Fetch a single ticket with conversations
        freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets/${ticketId}?include=conversations,requester`;
      } else {
        // List all tickets for the user
        const userEmail = user.email;
        if (!userEmail) throw new Error('Email utilisateur non trouvé.');
        const encodedEmail = encodeURIComponent(userEmail);
        freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets?email=${encodedEmail}&include=description&order_by=updated_at&order_type=desc`;
      }
      
      const freshdeskResponse = await fetch(freshdeskUrl, { headers: { 'Authorization': authHeader } });
      if (!freshdeskResponse.ok) throw new Error(await freshdeskResponse.text());
      const data = await freshdeskResponse.json();
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (req.method === 'POST') {
      const { action, ...payload } = await req.json();
      let freshdeskUrl;
      let options;

      if (action === 'create') {
        const { subject, description } = payload;
        if (!subject || !description) throw new Error('Sujet et description requis.');
        freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets`;
        options = {
          method: 'POST',
          headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject, description, email: user.email, priority: 1, status: 2 }),
        };
      } else if (action === 'reply') {
        const { ticketId, body } = payload;
        if (!ticketId || !body) throw new Error('ID de ticket et corps de réponse requis.');
        freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets/${ticketId}/reply`;
        options = {
          method: 'POST',
          headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ body }),
        };
      } else {
        throw new Error('Action non valide.');
      }

      const freshdeskResponse = await fetch(freshdeskUrl, options);
      if (!freshdeskResponse.ok) throw new Error(await freshdeskResponse.text());
      const data = await freshdeskResponse.json();
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: freshdeskResponse.status });
    }

    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), { status: 405, headers: corsHeaders });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})