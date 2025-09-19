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

    // Handle Ticket Creation (POST)
    if (req.method === 'POST') {
      console.log('Freshdesk proxy: Traitement d\'une requête POST (création ticket)');
      
      let body;
      try {
        body = await req.json();
      } catch (e) {
        console.error('Freshdesk proxy: Erreur lors du parsing du JSON:', e);
        return new Response(JSON.stringify({ error: 'JSON invalide dans le corps de la requête' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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
      console.log('Freshdesk proxy: Traitement d\'une requête GET (liste tickets)');
      
      // Récupération du ticketId depuis les query params
      const url = new URL(req.url);
      const ticketId = url.searchParams.get('ticketId') || req.headers.get('X-Ticket-Id');

      if (ticketId) {
        // Fetch a single ticket and its conversations
        console.log(`Freshdesk proxy: Récupération du ticket ${ticketId}`);
        const ticketUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets/${ticketId}?include=description`;
        const conversationsUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets/${ticketId}/conversations`;

        const authHeaders = {
          'Authorization': `Basic ${btoa(FRESHDESK_API_KEY + ':X')}`,
          'Content-Type': 'application/json',
        };

        console.log('Freshdesk proxy: URLs appelées:', { ticketUrl, conversationsUrl });

        const [ticketResponse, conversationsResponse] = await Promise.all([
          fetch(ticketUrl, { headers: authHeaders }),
          fetch(conversationsUrl, { headers: authHeaders }),
        ]);

        console.log('Freshdesk proxy: Réponses reçues:', {
          ticketStatus: ticketResponse.status,
          conversationsStatus: conversationsResponse.status
        });

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
          // Ne pas échouer si les conversations ne peuvent pas être récupérées
          console.log('Freshdesk proxy: Les conversations ne peuvent pas être récupérées, retour du ticket seul');
        }

        const ticketData = await ticketResponse.json();
        let conversationsData = [];
        
        if (conversationsResponse.ok) {
          conversationsData = await conversationsResponse.json();
        } else {
          console.log('Freshdesk proxy: Utilisation d\'un tableau vide pour les conversations');
        }

        // Log the ticket data to debug description field
        console.log('Freshdesk proxy: Ticket data received:', {
          id: ticketData.id,
          subject: ticketData.subject,
          description: ticketData.description,
          description_text: ticketData.description_text,
          has_description: !!ticketData.description,
          has_description_text: !!ticketData.description_text,
          description_length: ticketData.description?.length,
          description_text_length: ticketData.description_text?.length
        });

        const responseData = {
          ...ticketData,
          conversations: conversationsData,
        };

        console.log('Freshdesk proxy: Ticket récupéré avec', conversationsData.length, 'conversations');

        return new Response(JSON.stringify(responseData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // List all tickets for the user with proper filters and includes
      console.log('Freshdesk proxy: Récupération de la liste des tickets');
      const encodedEmail = encodeURIComponent(userEmail);
      const freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets?email=${encodedEmail}&include=description&order_by=updated_at&order_type=desc`;

      console.log('Freshdesk proxy: URL liste tickets:', freshdeskUrl);

      const freshdeskResponse = await fetch(freshdeskUrl, {
        headers: {
          'Authorization': `Basic ${btoa(FRESHDESK_API_KEY + ':X')}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Freshdesk proxy: Status réponse liste tickets:', freshdeskResponse.status);

      if (!freshdeskResponse.ok) {
        const errorBody = await freshdeskResponse.text();
        console.error(`Freshdesk proxy: Erreur API Freshdesk: ${freshdeskResponse.status} ${errorBody}`);
        return new Response(JSON.stringify({ error: 'Impossible de récupérer les tickets depuis Freshdesk.', details: errorBody }), {
          status: freshdeskResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tickets = await freshdeskResponse.json();
      console.log('Freshdesk proxy: Tickets récupérés:', tickets.length);
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