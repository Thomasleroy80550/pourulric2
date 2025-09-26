import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { Resend } from "npm:resend";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
// IMPORTANT: Vous devrez ajouter cette variable d'environnement dans votre projet Supabase.
const FRESHDESK_SUPPORT_EMAIL = Deno.env.get('FRESHDESK_SUPPORT_EMAIL');

if (!RESEND_API_KEY) {
  throw new Error("La variable d'environnement RESEND_API_KEY n'est pas définie.");
}
if (!FRESHDESK_SUPPORT_EMAIL) {
  throw new Error("La variable d'environnement FRESHDESK_SUPPORT_EMAIL n'est pas définie.");
}

const resend = new Resend(RESEND_API_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Vérification de l'authentification
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 2. Récupération des données de la requête
    const { ticketId, subject, body } = await req.json();

    if (!ticketId || !subject || !body) {
      return new Response(JSON.stringify({ error: 'Paramètres manquants : ticketId, subject, et body sont requis.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 3. Construction et envoi de l'e-mail
    const emailSubject = `Re: ${subject} [#${ticketId}]`;
    const userEmail = user.email;
    const userName = user.user_metadata?.first_name || user.user_metadata?.last_name ? 
      `${user.user_metadata.first_name || ''} ${user.user_metadata.last_name || ''}`.trim() : 
      userEmail;

    const { data, error } = await resend.emails.send({
      from: 'Hello Keys <noreply@notifications.hellokeys.fr>',
      to: [FRESHDESK_SUPPORT_EMAIL],
      reply_to: userEmail,
      subject: emailSubject,
      html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
      text: body
    });

    if (error) {
      console.error('Erreur API Resend:', error);
      return new Response(JSON.stringify({ error: "Échec de l'envoi de l'e-mail de réponse." }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ message: 'E-mail de réponse envoyé avec succès', data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
})