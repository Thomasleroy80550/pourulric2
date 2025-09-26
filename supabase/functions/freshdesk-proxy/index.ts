import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, X-Ticket-Id',
}

serve(async (req) => {
  console.log('Freshdesk proxy: Début du traitement de la requête', req.method, req.url);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header manquant' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
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
    
    const userEmail = user.email;
    if (!userEmail) {
        return new Response(JSON.stringify({ error: 'Email utilisateur non trouvé.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Handle POST requests (Ticket Creation or Reply)
    if (req.method === 'POST') {
      let body;
      try {
        body = await req.json();
      } catch (e) {
        return new Response(JSON.stringify({ error: 'JSON invalide dans le corps de la requête' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if it's a reply or a new ticket
      if (body.ticketId && body.body) {
        // This is a reply
        console.log(`Freshdesk proxy: Traitement d'une requête POST (réponse au ticket ${body.ticketId})`);
        const { ticketId, body: replyBody } = body;

        const freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets/${ticketId}/reply`;
        const requestBody = JSON.stringify({ body: replyBody });

        const freshdeskResponse = await fetch(freshdeskUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(FRESHDESK_API_KEY + ':X')}`,
            'Content-Type': 'application/json',
          },
          body: requestBody,
        });

        const responseData = await freshdeskResponse.json();

        if (!freshdeskResponse.ok) {
          console.error(`Erreur API Freshdesk (réponse): ${freshdeskResponse.status}`, responseData);
          return new Response(JSON.stringify({ error: 'Impossible d\'envoyer la réponse.', details: responseData }), {
            status: freshdeskResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify(responseData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        });
      }

      // This is a new ticket creation
      console.log('Freshdesk proxy: Traitement d\'une requête POST (création ticket)');
      const { subject, description, priority } = body;

      if (!subject || !description) {
        return new Response(JSON.stringify({ error: 'Le sujet et la description sont requis.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets`;
      const requestBody = JSON.stringify({
        email: userEmail,
        subject,
        description,
        priority: priority || 1,
        status: 2, // Open
        source: 2, // Portal
      });

      const freshdeskResponse = await fetch(freshdeskUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(FRESHDESK_API_KEY + ':X')}`,
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });

      const responseData = await freshdeskResponse.json();

      if (!freshdeskResponse.ok) {
        console.error(`Erreur API Freshdesk (création): ${freshdeskResponse.status}`, responseData);
        return new Response(JSON.stringify({ error: 'Impossible de créer le ticket.', details: responseData }), {
          status: freshdeskResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      });
    }

    // Handle Get Tickets (GET)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const ticketId = url.searchParams.get('ticketId') || req.headers.get('X-Ticket-Id');

      if (ticketId) {
        // Fetch a single ticket and its conversations
        const ticketUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets/${ticketId}?include=conversations`;
        
        const authHeaders = {
          'Authorization': `Basic ${btoa(FRESHDESK_API_KEY + ':X')}`,
          'Content-Type': 'application/json',
        };

        const ticketResponse = await fetch(ticketUrl, { headers: authHeaders });

        if (!ticketResponse.ok) {
          const errorBody = await ticketResponse.text();
          return new Response(JSON.stringify({ error: 'Impossible de récupérer les détails du ticket.', details: errorBody }), {
            status: ticketResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const ticketData = await ticketResponse.json();

        return new Response(JSON.stringify(ticketData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // List all tickets for the user
      const encodedEmail = encodeURIComponent(userEmail);
      const freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets?email=${encodedEmail}&order_by=updated_at&order_type=desc`;

      const freshdeskResponse = await fetch(freshdeskUrl, {
        headers: {
          'Authorization': `Basic ${btoa(FRESHDESK_API_KEY + ':X')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!freshdeskResponse.ok) {
        const errorBody = await freshdeskResponse.text();
        return new Response(JSON.stringify({ error: 'Impossible de récupérer les tickets depuis Freshdesk.', details: errorBody }), {
          status: freshdeskResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tickets = await freshdeskResponse.json();
      return new Response(JSON.stringify(tickets), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Freshdesk proxy: Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})