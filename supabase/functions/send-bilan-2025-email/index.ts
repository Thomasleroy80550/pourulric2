import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userSupabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('[send-bilan-2025-email] Unauthorized user', { authError });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: callerProfile, error: callerProfileError } = await userSupabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerProfileError || callerProfile?.role !== 'admin') {
      console.error('[send-bilan-2025-email] Forbidden access', { callerProfileError, callerId: user.id });
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { userId, year, pdfPath } = await req.json();
    if (!userId || !year || !pdfPath) {
      return new Response(JSON.stringify({ error: 'userId, year and pdfPath are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', userId)
      .single();

    if (targetProfileError || !targetProfile?.email) {
      console.error('[send-bilan-2025-email] Target profile not found', { targetProfileError, userId });
      return new Response(JSON.stringify({ error: 'Client email not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('statements')
      .createSignedUrl(pdfPath, 60 * 60 * 24 * 7);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('[send-bilan-2025-email] Signed URL generation failed', { signedUrlError, pdfPath });
      return new Response(JSON.stringify({ error: 'Unable to generate signed URL' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('[send-bilan-2025-email] Missing RESEND_API_KEY');
      return new Response(JSON.stringify({ error: 'Email provider not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clientName = [targetProfile.first_name, targetProfile.last_name].filter(Boolean).join(' ') || 'Client';
    const appUrl = Deno.env.get('APP_BASE_URL') ?? 'https://beta.proprietaire.hellokeys.fr';
    const subject = `Votre bilan Hello Keys ${year} est disponible`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 640px; margin: 0 auto; padding: 24px;">
        <img src="https://dkjaejzwmmwwzhokpbgs.supabase.co/storage/v1/object/public/public-assets/logo.png" alt="Hello Keys" style="width: 140px; margin-bottom: 24px;" />
        <h1 style="font-size: 24px; margin-bottom: 12px;">Bonjour ${clientName},</h1>
        <p style="margin-bottom: 16px;">Votre bilan annuel ${year} est prêt.</p>
        <p style="margin-bottom: 24px;">Vous pouvez le consulter dès maintenant via le bouton ci-dessous.</p>
        <p style="margin-bottom: 24px;">
          <a href="${signedUrlData.signedUrl}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 600;">Voir mon bilan ${year}</a>
        </p>
        <p style="margin-bottom: 16px;">Vous pouvez également retrouver vos documents dans votre espace propriétaire.</p>
        <p style="margin-bottom: 0;">À bientôt,<br />L'équipe Hello Keys</p>
        <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">Accès à votre espace : <a href="${appUrl}" style="color: #2563eb;">${appUrl}</a></p>
      </div>
    `;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Hello Keys <noreply@notifications.hellokeys.fr>',
        to: [targetProfile.email],
        subject,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errorBody = await emailResponse.text();
      console.error('[send-bilan-2025-email] Email send failed', { errorBody });
      return new Response(JSON.stringify({ error: 'Email send failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: notificationError } = await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      message: `Votre bilan annuel ${year} vous a été envoyé par email.`,
      link: '/dashboard',
    });

    if (notificationError) {
      console.error('[send-bilan-2025-email] Notification insert failed', { notificationError, userId });
    }

    console.info('[send-bilan-2025-email] Bilan email sent', { userId, year, callerId: user.id });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[send-bilan-2025-email] Unexpected error', { error });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
