import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { Resend } from "npm:resend";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type EventTemplate = {
  key?: string;
  subject?: string;
  body?: string;
  sendEmail?: boolean;
  sendNotification?: boolean;
};

function replaceVars(tpl: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce((acc, [k, v]) => {
    return acc.replaceAll(`{{${k}}}`, v);
  }, tpl);
}

function textToHtml(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .join("<br>");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set in environment variables.");
    }
    const resend = new Resend(RESEND_API_KEY);

    // Verify session + check admin role
    const userScoped = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userScoped.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: callerProfile, error: callerProfileError } = await userScoped
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (callerProfileError) {
      console.error("[send-transfer-completed-email] failed to read caller profile", { callerProfileError });
      return new Response(JSON.stringify({ error: "Failed to authorize." }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload = await req.json().catch(() => ({}));
    const userId = payload?.userId as string | undefined;
    const testTo = payload?.testTo as string | undefined;

    if (!testTo && !userId) {
      return new Response(JSON.stringify({ error: 'Missing parameters: userId (or testTo) is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const appUrl = Deno.env.get('APP_BASE_URL') ?? 'https://beta.proprietaire.hellokeys.fr';
    const logoUrl = "https://dkjaejzwmmwwzhokpbgs.supabase.co/storage/v1/object/public/public-assets/logo.png";

    let recipientEmail = testTo ?? '';
    let recipientName = 'Client';

    if (!testTo) {
      const { data: authUser, error: getUserError } = await admin.auth.admin.getUserById(userId!);
      if (getUserError) {
        console.error("[send-transfer-completed-email] failed to load recipient user", { getUserError, userId });
        return new Response(JSON.stringify({ error: "Recipient not found." }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      recipientEmail = authUser.user?.email ?? '';
      if (!recipientEmail) {
        return new Response(JSON.stringify({ error: "Recipient email not found." }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: recipientProfile } = await admin
        .from('profiles')
        .select('first_name,last_name')
        .eq('id', userId!)
        .maybeSingle();

      const fn = recipientProfile?.first_name ?? '';
      const ln = recipientProfile?.last_name ?? '';
      recipientName = `${fn} ${ln}`.trim() || 'Client';
    }

    const defaultSubject = "DING DONG ! Tous vos virements sont faits";
    const defaultBody = `Bonjour {{userName}},\n\nBonne nouvelle : l'ensemble de vos virements vient d'être effectué.\n\nRetrouvez le détail dans votre espace Finances : {{appUrl}}/finances\n\nMerci pour votre confiance,\nL'équipe Hello Keys`;

    const { data: notifTemplatesSetting } = await admin
      .from('app_settings')
      .select('value')
      .eq('key', 'notification_templates')
      .maybeSingle();

    const events = (notifTemplatesSetting?.value?.events ?? []) as EventTemplate[];
    const evt = Array.isArray(events)
      ? events.find((e) => e?.key === 'transfers_completed')
      : null;

    const subjectTpl = evt?.subject || defaultSubject;
    const bodyTpl = evt?.body || defaultBody;
    const shouldNotify = evt ? (evt.sendNotification ?? true) : true;

    const vars = {
      userName: recipientName,
      appUrl,
    };

    const subject = replaceVars(subjectTpl, vars);
    const body = replaceVars(bodyTpl, vars);

    // Charte bleu + logo (alignée avec les autres emails)
    const brandBlue = "#2563eb"; // blue-600

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a; background: #f5faff; padding: 24px;">
        <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #dbeafe; border-radius: 12px; background: #ffffff;">
          <div style="text-align:center; padding-bottom: 14px; border-bottom: 1px solid #e5e7eb;">
            <img src="${logoUrl}" alt="Hello Keys Logo" style="width: 150px; height: auto; margin: 6px auto 0; display:block;" />
          </div>

          <h1 style="margin: 18px 0 6px; font-size: 26px; color: ${brandBlue};">DING DONG !</h1>
          <p style="margin: 0 0 14px; font-size: 16px; color: #0f172a;"><strong>Tous vos virements sont faits.</strong></p>

          <div style="background-color: #eff6ff; padding: 14px 14px; border-radius: 10px; border: 1px solid #bfdbfe; margin: 16px 0;">
            <p style="margin: 0;">${textToHtml(body)}</p>
          </div>

          <a href="${appUrl}/finances" style="background-color: ${brandBlue}; color: white; padding: 12px 18px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Voir mes virements
          </a>

          <p style="margin-top: 22px; font-size: 0.9em; color: #64748b;">
            Une question ? Répondez simplement à cet e‑mail ou écrivez‑nous à <a href="mailto:contact@hellokeys.fr" style="color:${brandBlue}; text-decoration:underline;">contact@hellokeys.fr</a>.
          </p>

          <p style="margin-top: 10px; font-size: 0.9em; color: #64748b;">À bientôt,<br>L'équipe Hello Keys</p>
        </div>
      </div>
    `;

    const { error: sendErr, data: sendData } = await resend.emails.send({
      from: 'Hello Keys <noreply@notifications.hellokeys.fr>',
      to: [recipientEmail],
      subject,
      html,
    });

    if (sendErr) {
      console.error("[send-transfer-completed-email] resend error", { sendErr });
      return new Response(JSON.stringify({ error: 'Failed to send email.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!testTo && shouldNotify) {
      const { error: notifError } = await admin.from('notifications').insert({
        user_id: userId!,
        message: 'DING DONG ! Tous vos virements ont été effectués.',
        link: '/finances',
      });

      if (notifError) {
        console.error("[send-transfer-completed-email] failed to create notification", { notifError });
      }
    }

    return new Response(JSON.stringify({ message: 'ok', data: sendData }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error("[send-transfer-completed-email] server error", { error });
    return new Response(JSON.stringify({ error: (error as any)?.message ?? 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})