import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get('PROPRIO_TICKETS_API_TOKEN');

    if (!token) {
      console.error('[proprio-ticket-create] Missing PROPRIO_TICKETS_API_TOKEN secret');
      return new Response(JSON.stringify({ error: 'Configuration serveur manquante.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const body = await req.json();
    const {
      customer_email,
      customer_name,
      subject,
      message,
      reference,
      source_provider,
      priority,
      status,
    } = body ?? {};

    if (!customer_email || !message) {
      return new Response(JSON.stringify({ error: 'customer_email et message sont requis.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const externalResponse = await fetch('https://hnvaqfcfjqhjupellfhk.supabase.co/functions/v1/order-ticket-create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_email,
        customer_name,
        subject,
        message,
        reference,
        source_provider,
        priority,
        status,
      }),
    });

    const responseText = await externalResponse.text();
    let responsePayload: Record<string, unknown> = {};

    if (responseText) {
      try {
        responsePayload = JSON.parse(responseText);
      } catch {
        responsePayload = { raw: responseText };
      }
    }

    if (!externalResponse.ok) {
      console.error('[proprio-ticket-create] External ticket creation failed', {
        status: externalResponse.status,
        responsePayload,
      });

      return new Response(
        JSON.stringify({
          error:
            typeof responsePayload.error === 'string'
              ? responsePayload.error
              : 'Impossible de créer le ticket sur la plateforme support.',
        }),
        {
          status: externalResponse.status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }

    console.log('[proprio-ticket-create] Ticket created successfully', {
      ticket_id: responsePayload.ticket_id,
      conversation_id: responsePayload.conversation_id,
    });

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('[proprio-ticket-create] Unexpected error', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
