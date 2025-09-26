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
    console.log('Freshdesk proxy: Auth header présent:', !!authHeader);
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header manquant' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    console.log('Freshdesk proxy: Utilisateur authentifié:', !!user);
    
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
    console.log('Freshdesk proxy: Email utilisateur:', userEmail);
    
    if (!userEmail) {
      return new Response(JSON.stringify({ error: 'Email utilisateur non trouvé.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const freshdeskAuthHeader = `Basic ${btoa(FRESHDESK_API_KEY + ':X')}`;

    // Handle POST requests (Create ticket or reply)
    if (req.method === 'POST') {
      console.log('Freshdesk proxy: Traitement d\'une requête POST');
      
      let body;
      try {
        body = await req.json();
        console.log('Freshdesk proxy: Corps de la requête reçu:', JSON.stringify(body, null, 2));
      } catch (e) {
        console.error('Freshdesk proxy: Erreur lors du parsing du JSON:', e);
        return new Response(JSON.stringify({ error: 'JSON invalide dans le corps de la requête', details: e.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Reply to a ticket
      if (body.ticketId && body.body) {
        console.log(`Freshdesk proxy: Traitement d'une réponse au ticket ${body.ticketId}`);
        const { ticketId, body: replyBody } = body;

        // Vérifier d'abord si le ticket existe et est ouvert
        const checkUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets/${ticketId}`;
        console.log('Freshdesk proxy: Vérification du ticket:', checkUrl);
        
        const checkResponse = await fetch(checkUrl, {
          headers: { 'Authorization': freshdeskAuthHeader, 'Content-Type': 'application/json' },
        });

        if (!checkResponse.ok) {
          const errorBody = await checkResponse.text();
          console.error('Freshdesk proxy: Erreur lors de la vérification du ticket:', checkResponse.status, errorBody);
          return new Response(JSON.stringify({ error: 'Ticket non trouvé ou inaccessible.', details: errorBody }), { status: checkResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const ticketData = await checkResponse.json();
        console.log('Freshdesk proxy: Ticket vérifié - Status:', ticketData.status);

        // Vérifier si on peut répondre à ce ticket (doit être ouvert ou en attente)
        if (ticketData.status !== 2 && ticketData.status !== 3) {
          console.log('Freshdesk proxy: Ticket fermé, réponse impossible');
          return new Response(JSON.stringify({ error: 'Impossible de répondre à ce ticket car il est fermé ou résolu.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets/${ticketId}/reply`;
        const requestBody = JSON.stringify({ body: replyBody });

        console.log('Freshdesk proxy: Envoi à Freshdesk:', {
          url: freshdeskUrl,
          ticketId: ticketId,
          replyBodyLength: replyBody.length,
          requestBody: requestBody
        });

        const freshdeskResponse = await fetch(freshdeskUrl, {
          method: 'POST',
          headers: { 'Authorization': freshdeskAuthHeader, 'Content-Type': 'application/json' },
          body: requestBody,
        });

        console.log('Freshdesk proxy: Status de la réponse Freshdesk:', freshdeskResponse.status);

        if (!freshdeskResponse.ok) {
          let errorData;
          try {
            errorData = await freshdeskResponse.json();
          } catch (e) {
            // Si la réponse n'est pas du JSON, récupérer le texte brut
            errorData = await freshdeskResponse.text();
          }
          console.error('Freshdesk proxy: Erreur API Freshdesk:', freshdeskResponse.status, errorData);
          return new Response(JSON.stringify({ error: 'Impossible d\'envoyer la réponse.', details: errorData }), { status: freshdeskResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        
        const responseData = await freshdeskResponse.json();
        console.log('Freshdesk proxy: Réponse réussie de Freshdesk:', responseData);
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
          let errorData;
          try {
            errorData = await freshdeskResponse.json();
          } catch (e) {
            errorData = await freshdeskResponse.text();
          }
          return new Response(JSON.stringify({ error: 'Impossible de créer le ticket.', details: errorData }), { status: freshdeskResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const responseData = await freshdeskResponse.json();
        return new Response(JSON.stringify(responseData), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: 'Requête POST invalide.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Handle GET requests (List tickets or get details)
    if (req.method === 'GET') {
      const ticketId = req.headers.get('x-ticket-id');

      if (ticketId) {
        // Get ticket details
        const freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets/${ticketId}?include=conversations`;
        const freshdeskResponse = await fetch(freshdeskUrl, {
          headers: { 'Authorization': freshdeskAuthHeader, 'Content-Type': 'application/json' },
        });
        
        if (!freshdeskResponse.ok) {
          const errorBody = await freshdeskResponse.text();
          return new Response(JSON.stringify({ error: 'Impossible de récupérer les détails du ticket.', details: errorBody }), { status: freshdeskResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        
        const ticketData = await freshdeskResponse.json();
        return new Response(JSON.stringify(ticketData), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      } else {
        // List all tickets
        const encodedEmail = encodeURIComponent(userEmail);
        const freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets?email=${encodedEmail}&order_by=updated_at&order_type=desc`;
        const freshdeskResponse = await fetch(freshdeskUrl, {
          headers: { 'Authorization': freshdeskAuthHeader, 'Content-Type': 'application/json' },
        });

        if (!freshdeskResponse.ok) {
          const errorBody = await freshdeskResponse.text();
          return new Response(JSON.stringify({ error: 'Impossible de récupérer les tickets.', details: errorBody }), { status: freshdeskResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const tickets = await freshdeskResponse.json();
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