import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { Resend } from "npm:resend";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-resend-webhook-secret',
}

const resendApiKey = Deno.env.get('RESEND_API_KEY');
if (!resendApiKey) {
  throw new Error("RESEND_API_KEY is not configured.");
}
const resend = new Resend(resendApiKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const providedSecret = req.headers.get('x-resend-webhook-secret');
    const expectedSecret = Deno.env.get('RESEND_INBOUND_WEBHOOK_SECRET');
    if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized webhook' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const payload = await req.json();
    const subject: string = payload?.subject ?? '(sans sujet)';
    const fromEmail: string | undefined =
      payload?.from?.address ??
      payload?.from?.email ??
      (typeof payload?.from === 'string' ? payload.from : undefined);
    const toEmail: string | undefined =
      payload?.to?.[0]?.address ??
      payload?.to?.[0]?.email ??
      (Array.isArray(payload?.to) ? payload.to[0] : undefined);

    const textBody: string | undefined = payload?.text ?? undefined;
    const htmlBody: string | undefined = payload?.html ?? undefined;

    let contactEmail = 'contact@hellokeys.fr';
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { data: contactSetting } = await admin
      .from('app_settings')
      .select('value')
      .eq('key', 'contact_email')
      .maybeSingle();

    if (contactSetting?.value) {
      const maybe = typeof contactSetting.value === 'string' ? contactSetting.value : contactSetting.value?.email;
      if (maybe && typeof maybe === 'string') contactEmail = maybe;
    }

    const fwdSubject = `FWD: ${subject}`;
    const fwdHtml = `
      <div>
        <p><strong>Email entrant</strong></p>
        <p><strong>De:</strong> ${fromEmail ?? 'inconnu'}</p>
        <p><strong>À:</strong> ${toEmail ?? 'inconnu'}</p>
        <hr/>
        ${htmlBody ?? (textBody ? `<pre>${textBody}</pre>` : '<em>(corps vide)</em>')}
      </div>
    `;
    await resend.emails.send({
      from: 'Hello Keys Inbound <noreply@notifications.hellokeys.fr>',
      to: [contactEmail],
      subject: fwdSubject,
      html: fwdHtml,
    });

    if (fromEmail) {
      const { data: profile } = await admin
        .from('profiles')
        .select('id')
        .eq('email', fromEmail)
        .maybeSingle();

      if (profile?.id) {
        const { data: existingConv } = await admin
          .from('conversations')
          .select('id')
          .eq('user_id', profile.id)
          .eq('subject', subject)
          .limit(1)
          .maybeSingle();

        let conversationId = existingConv?.id;
        if (!conversationId) {
          const { data: newConv } = await admin
            .from('conversations')
            .insert({ user_id: profile.id, subject })
            .select('id')
            .single();
          conversationId = newConv?.id;
        }

        if (conversationId) {
          const content = (textBody ?? htmlBody?.replace(/<[^>]*>/g, ' ') ?? '').replace(/\s+/g, ' ').trim();
          await admin.from('messages').insert({
            conversation_id: conversationId,
            sender_id: profile.id,
            content: content || '(email reçu)',
          });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('Inbound email error:', error);
    return new Response(JSON.stringify({ error: (error as any)?.message ?? 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
})