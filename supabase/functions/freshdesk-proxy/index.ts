import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ticket-id',
}

serve(async (req) => {
  console.log('Freshdesk proxy: Début du traitement de la requête', req.method, req.url);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header manquant' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Freshdesk proxy: Erreur auth:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const FRESHDESK_DOMAIN = Deno.env.get('FRESHDESK_DOMAIN');
    const FRESHDESK_API_KEY = Deno.env.get('FRESHDESK_API_KEY');
    if (!FRESHDESK_DOMAIN || !FRESHDESK_API_KEY) {
      return new Response(JSON.stringify({ error: 'Les identifiants Freshdesk ne sont pas configurés.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const userEmail = user.email;
    if (!userEmail) {
      return new Response(JSON.stringify({ error: 'Email utilisateur non trouvé.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const freshdeskAuthHeader = `Basic ${btoa(FRESHDESK_API_KEY + ':X')}`;
    const url = new URL(req.url);

    if (req.method === 'POST') {
      console.log('Freshdesk proxy: Traitement d\'une requête POST');
      
      let body;
      try {
        const rawBody = await req.text();
        console.log('Freshdesk proxy: Corps brut reçu:', rawBody);
        if (!rawBody.trim()) {
          return new Response(JSON.stringify({ error: 'Corps de requête vide' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        body = JSON.parse(rawBody);
        console.log('Freshdesk proxy: Corps parsé:', body);
      } catch (e) {
        console.error('Freshdesk proxy: Erreur de parsing JSON:', e);
        return new Response(JSON.stringify({ error: 'JSON invalide dans le corps de la requête.', details: e.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Reply to a ticket
      if (body.ticketId && body.body) {
        console.log(`Freshdesk proxy: Traitement d'une réponse au ticket ${body.ticketId}`);
        const { ticketId, body: replyBody } = body;

        // Pour les réponses, nous n'utilisons pas user_id pour éviter les problèmes de permissions
        // Freshdesk attribuera automatiquement la réponse à l'utilisateur approprié basé sur l'email
        const freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets/${ticketId}/reply`;
        const requestPayload = {
          body: replyBody,
          from_email: userEmail, // Utiliser from_email au lieu de user_id
        };

        console.log('Freshdesk proxy: Envoi réponse avec payload:', requestPayload);
        const freshdeskResponse = await fetch(freshdeskUrl, {
          method: 'POST',
          headers: { 'Authorization': freshdeskAuthHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
        });

        if (!freshdeskResponse.ok) {
          const errorData = await freshdeskResponse.json().catch(() => freshdeskResponse.text());
          console.error('Freshdesk proxy: Erreur API Freshdesk (reply):', freshdeskResponse.status, errorData);
          
          // Si l'erreur est liée aux permissions, essayer sans from_email
          if (freshdeskResponse.status === 403 && errorData.message && errorData.message.includes('authorized')) {
            console.log('Freshdesk proxy: Tentative de réponse anonyme due à une erreur de permission');
            const anonymousPayload = { body: replyBody };
            const anonymousResponse = await fetch(freshdeskUrl, {
              method: 'POST',
              headers: { 'Authorization': freshdeskAuthHeader, 'Content-Type': 'application/json' },
              body: JSON.stringify(anonymousPayload),
            });

            if (!anonymousResponse.ok) {
              const anonymousErrorData = await anonymousResponse.json().catch(() => anonymousResponse.text());
              console.error('Freshdesk proxy: Erreur API Freshdesk (reply anonyme):', anonymousResponse.status, anonymousErrorData);
              return new Response(JSON.stringify({ error: 'Impossible d\'envoyer la réponse.', details: anonymousErrorData }), { status: anonymousResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
            
            const responseData = await anonymousResponse.json();
            console.log('Freshdesk proxy: Réponse anonyme envoyée avec succès:', responseData);
            return new Response(JSON.stringify(responseData), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          
          return new Response(JSON.stringify({ error: 'Impossible d\'envoyer la réponse.', details: errorData }), { status: freshdeskResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        
        const responseData = await freshdeskResponse.json();
        console.log('Freshdesk proxy: Réponse envoyée avec succès:', responseData);
        return new Response(JSON.stringify(responseData), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Create a new ticket
      if (body.subject && body.description) {
        console.log('Freshdesk proxy: Traitement d\'une création de ticket');
        const { subject, description, priority } = body;
        const freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets`;
        const freshdeskResponse = await fetch(freshdeskUrl, {
          method: 'POST',
          headers: { 'Authorization': freshdeskAuthHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, subject, description, priority: priority || 1, status: 2, source: 2 }),
        });

        if (!freshdeskResponse.ok) {
          const errorData = await freshdeskResponse.json().catch(() => freshdeskResponse.text());
          return new Response(JSON.stringify({ error: 'Impossible de créer le ticket.', details: errorData }), { status: freshdeskResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const responseData = await freshdeskResponse.json();
        return new Response(JSON.stringify(responseData), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: 'Requête POST invalide: paramètres manquants (ticketId/body ou subject/description).' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Handle GET requests (List tickets or get details)
    if (req.method === 'GET') {
      const ticketId = req.headers.get('x-ticket-id');

      if (ticketId) {
        // Get ticket details
        console.log(`Freshdesk proxy: Récupération des détails du ticket ${ticketId}`);
        const freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets/${ticketId}?include=conversations`;
        const freshdeskResponse = await fetch(freshdeskUrl, {
          headers: { 'Authorization': freshdeskAuthHeader, 'Content-Type': 'application/json' },
        });
        
        if (!freshdeskResponse.ok) {
          const errorBody = await freshdeskResponse.text();
          console.error('Freshdesk proxy: Erreur récupération ticket:', freshdeskResponse.status, errorBody);
          return new Response(JSON.stringify({ error: 'Impossible de récupérer les détails du ticket.', details: errorBody }), { status: freshdeskResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        
        const ticketData = await freshdeskResponse.json();
        console.log('Freshdesk proxy: Ticket récupéré avec succès');
        return new Response(JSON.stringify(ticketData), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      } else {
        // List all tickets
        console.log('Freshdesk proxy: Récupération de la liste des tickets');
        const encodedEmail = encodeURIComponent(userEmail);
        const freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets?email=${encodedEmail}&order_by=updated_at&order_type=desc`;
        const freshdeskResponse = await fetch(freshdeskUrl, {
          headers: { 'Authorization': freshdeskAuthHeader, 'Content-Type': 'application/json' },
        });

        if (!freshdeskResponse.ok) {
          const errorBody = await freshdeskResponse.text();
          console.error('Freshdesk proxy: Erreur récupération tickets:', freshdeskResponse.status, errorBody);
          return new Response(JSON.stringify({ error: 'Impossible de récupérer les tickets.', details: errorBody }), { status: freshdeskResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const tickets = await freshdeskResponse.json();
        console.log(`Freshdesk proxy: ${tickets.length} tickets récupérés`);
        return new Response(JSON.stringify(tickets), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Freshdesk proxy: Erreur inattendue:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})