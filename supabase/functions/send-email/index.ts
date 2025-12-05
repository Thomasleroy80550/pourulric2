import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { Resend } from "npm:resend";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
if (!RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not set in environment variables.");
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
    // Auth check
    const userScoped = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: authError } = await userScoped.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: User not authenticated." }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { to, subject, html } = await req.json();

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: 'Missing parameters: to, subject, and html are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Read contact email setting if exists, else default
    let contactEmail = 'contact@hellokeys.fr';
    const { data: contactSetting } = await userScoped
      .from('app_settings')
      .select('value')
      .eq('key', 'contact_email')
      .maybeSingle();

    if (contactSetting?.value) {
      const maybe = typeof contactSetting.value === 'string' ? contactSetting.value : contactSetting.value?.email;
      if (maybe && typeof maybe === 'string') contactEmail = maybe;
    }

    // Send via Resend with BCC to contact
    const { data: sendData, error: sendErr } = await resend.emails.send({
      from: 'Hello Keys <noreply@notifications.hellokeys.fr>',
      to: [to],
      bcc: [contactEmail],
      subject,
      html,
    });

    if (sendErr) {
      console.error('Resend API Error:', sendErr);
      return new Response(JSON.stringify({ error: 'Failed to send email.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Log to conversations/messages
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: recipientProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', to)
      .maybeSingle();

    if (recipientProfile?.id) {
      // Find or create conversation by user + subject
      const { data: existingConv } = await admin
        .from('conversations')
        .select('id')
        .eq('user_id', recipientProfile.id)
        .eq('subject', subject)
        .limit(1)
        .maybeSingle();

      let conversationId = existingConv?.id;
      if (!conversationId) {
        const { data: newConv } = await admin
          .from('conversations')
          .insert({ user_id: recipientProfile.id, subject })
          .select('id')
          .single();
        conversationId = newConv?.id;
      }

      if (conversationId) {
        const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        await admin.from('messages').insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: text || `(email envoyé)`,
        });
      }
    }

    return new Response(JSON.stringify({ message: 'Email sent successfully', data: sendData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('Server Error:', error);
    return new Response(JSON.stringify({ error: (error as any)?.message ?? 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
})