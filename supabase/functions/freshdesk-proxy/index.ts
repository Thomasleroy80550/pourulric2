import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('Freshdesk proxy: Début du traitement de la requête', req.method, req.url);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    console.log('Freshdesk proxy: Auth header présent:', !!authHeader);
    
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

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    console.log('Freshdesk proxy: Utilisateur authentifié:', !!user);
    
    if (authError) {
      console.error('Freshdesk proxy: Erreur auth:', authError);
      return new Response(JSON.stringify({ error: 'Erreur d\'authentification', details: authError.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!user) {
      console.log('Freshdesk proxy: Utilisateur non authentifié');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const FRESHDESK_DOMAIN = Deno.env.get('FRESHDESK_DOMAIN')
    const FRESHDESK_API_KEY = Deno.env.get('FRESHDESK_API_KEY')

    console.log('Freshdesk proxy: Configuration Freshdesk:', {
      domainConfigured: !!FRESHDESK_DOMAIN,
      apiKeyConfigured: !!FRESHDESK_API_KEY
    });

    if (!FRESHDESK_DOMAIN || !FRESHDESK_API_KEY) {
      console.log('Freshdesk proxy: Configuration Freshdesk manquante');
      return new Response(JSON.stringify({ error: 'Les identifiants Freshdesk ne sont pas configurés.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    const userEmail = user.email;
    console.log('Freshdesk proxy: Email utilisateur:', userEmail);
    
    if (!userEmail) {
        console.log('Freshdesk proxy: Email utilisateur manquant');
        return new Response(JSON.stringify({ error: 'Email utilisateur non trouvé.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Handle POST requests (Ticket Creation or Reply)
    if (req.method === 'POST') {
      console.log('Freshdesk proxy: Traitement d\'une requête POST');
      
      let body;
      try {
        body = await req.json();
        console.log('Freshdesk proxy: Corps de la requête reçu:', JSON.stringify(body, null, 2));
      } catch (e) {
        console.error('Freshdesk proxy: Erreur lors du parsing du JSON:', e);
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

        console.log('Freshdesk proxy: Envoi de la réponse à Freshdesk:', {
          url: freshdeskUrl,
          ticketId: ticketId,
          replyBodyLength: replyBody.length
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

        console.log('Freshdesk proxy: Réponse de Freshdesk:', {
          status: freshdeskResponse.status,
          data: responseData
        });

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

      // Check if it's a ticket details request (has ticketId but no body)
      if (body.ticketId && !body.body) {
        console.log(`Freshdesk proxy: Traitement d'une requête POST (détails du ticket ${body.ticketId})`);
        const { ticketId } = body;

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

    // Handle Get Tickets (GET) - default behavior when no body is provided
    console.log('Freshdesk proxy: Traitement d\'une requête GET (liste des tickets)');
    
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

  } catch (error) {
    console.error('Freshdesk proxy: Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})