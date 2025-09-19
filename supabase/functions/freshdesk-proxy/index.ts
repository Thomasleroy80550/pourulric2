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
    const ticketId = url.searchParams.get('ticketId');

    if (req.method === 'GET') {
      let freshdeskUrl;

      if (ticketId) {
        // Fetch a single ticket with conversations
        freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets/${ticketId}?include=conversations,requester`;
      } else {
        // List all tickets for the user
        const userEmail = user.email;
        if (!userEmail) {
          return new Response(JSON.stringify({ error: 'Email utilisateur non trouvé.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const encodedEmail = encodeURIComponent(userEmail);
        freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets?email=${encodedEmail}&include=description&order_by=updated_at&order_type=desc`;
      }
      
      const freshdeskResponse = await fetch(freshdeskUrl, { headers: { 'Authorization': authHeader } });
      
      if (!freshdeskResponse.ok) {
        const errorText = await freshdeskResponse.text();
        console.error(`Freshdesk API error: ${freshdeskResponse.status} - ${errorText}`);
        
        // Return a proper error response instead of throwing
        return new Response(JSON.stringify({ 
          error: `Freshdesk API error: ${freshdeskResponse.status}`,
          details: errorText 
        }), {
          status: freshdeskResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Handle empty response body
      const responseText = await freshdeskResponse.text();
      if (!responseText) {
        console.warn('Freshdesk API returned empty response');
        return new Response(JSON.stringify([]), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 200 
        });
      }
      
      try {
        const data = JSON.parse(responseText);
        return new Response(JSON.stringify(data), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 200 
        });
      } catch (parseError) {
        console.error('Error parsing Freshdesk response:', parseError);
        console.error('Response text:', responseText);
        return new Response(JSON.stringify({ 
          error: 'Invalid JSON response from Freshdesk',
          details: responseText 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

    } else if (req.method === 'POST') {
      const { action, ...payload } = await req.json();
      let freshdeskUrl;
      let options;

      if (action === 'create') {
        const { subject, description } = payload;
        if (!subject || !description) {
          return new Response(JSON.stringify({ error: 'Sujet et description requis.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets`;
        options = {
          method: 'POST',
          headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject, description, email: user.email, priority: 1, status: 2 }),
        };
      } else if (action === 'reply') {
        const { ticketId, body } = payload;
        if (!ticketId || !body) {
          return new Response(JSON.stringify({ error: 'ID de ticket et corps de réponse requis.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        freshdeskUrl = `https://${FRESHDESK_DOMAIN}/api/v2/tickets/${ticketId}/reply`;
        options = {
          method: 'POST',
          headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ body }),
        };
      } else {
        return new Response(JSON.stringify({ error: 'Action non valide.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const freshdeskResponse = await fetch(freshdeskUrl, options);
      
      if (!freshdeskResponse.ok) {
        const errorText = await freshdeskResponse.text();
        console.error(`Freshdesk API error: ${freshdeskResponse.status} - ${errorText}`);
        
        return new Response(JSON.stringify({ 
          error: `Freshdesk API error: ${freshdeskResponse.status}`,
          details: errorText 
        }), {
          status: freshdeskResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Handle empty response body for POST requests too
      const responseText = await freshdeskResponse.text();
      if (!responseText) {
        console.warn('Freshdesk API returned empty response for POST request');
        return new Response(JSON.stringify({ success: true }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: freshdeskResponse.status 
        });
      }
      
      try {
        const data = JSON.parse(responseText);
        return new Response(JSON.stringify(data), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: freshdeskResponse.status 
        });
      } catch (parseError) {
        console.error('Error parsing Freshdesk response:', parseError);
        console.error('Response text:', responseText);
        return new Response(JSON.stringify({ 
          error: 'Invalid JSON response from Freshdesk',
          details: responseText 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), { 
      status: 405, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Freshdesk proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})