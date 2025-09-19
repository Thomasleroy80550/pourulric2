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
    const authHeader = req.headers.get('Authorization');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
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

    // Handle Ticket Creation
    if (req.method === 'POST') {
      const { subject, description, priority } = await req.json();

      if (!subject || !description) {
        return new Response(JSON.stringify({ error: 'Le sujet et la description sont requis.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets`;
      const body = JSON.stringify({
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
        body,
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

    // Handle Get Tickets
    if (req.method === 'GET') {
      const ticketId = req.headers.get('X-Ticket-Id');

      if (ticketId) {
        // Fetch a single ticket and its conversations
        const ticketUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets/${ticketId}?include=description`;
        const conversationsUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets/${ticketId}/conversations`;

        const authHeaders = {
          'Authorization': `Basic ${btoa(FRESHDESK_API_KEY + ':X')}`,
          'Content-Type': 'application/json',
        };

        const [ticketResponse, conversationsResponse] = await Promise.all([
          fetch(ticketUrl, { headers: authHeaders }),
          fetch(conversationsUrl, { headers: authHeaders }),
        ]);

        if (!ticketResponse.ok) {
          const errorBody = await ticketResponse.text();
          console.error(`Freshdesk proxy: Error fetching ticket: ${ticketResponse.status}`, errorBody);
          return new Response(JSON.stringify({ error: 'Impossible de récupérer les détails du ticket.', details: errorBody }), {
            status: ticketResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!conversationsResponse.ok) {
          const errorBody = await conversationsResponse.text();
          console.error(`Freshdesk proxy: Error fetching conversations: ${conversationsResponse.status}`, errorBody);
          return new Response(JSON.stringify({ error: 'Impossible de récupérer les conversations du ticket.', details: errorBody }), {
            status: conversationsResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const ticketData = await ticketResponse.json();
        const conversationsData = await conversationsResponse.json();

        const responseData = {
          ...ticketData,
          conversations: conversationsData,
        };

        return new Response(JSON.stringify(responseData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // List all tickets for the user with proper filters and includes
      const encodedEmail = encodeURIComponent(userEmail);
      const freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets?email=${encodedEmail}&include=description&order_by=updated_at&order_type=desc`;

      const freshdeskResponse = await fetch(freshdeskUrl, {
        headers: {
          'Authorization': `Basic ${btoa(FRESHDESK_API_KEY + ':X')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!freshdeskResponse.ok) {
        const errorBody = await freshdeskResponse.text();
        console.error(`Freshdesk proxy: Erreur API Freshdesk: ${freshdeskResponse.status} ${errorBody}`);
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