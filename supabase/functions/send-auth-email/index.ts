import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") || "https://beta.proprietaire.hellokeys.fr").trim().replace(/\/+$/, "");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const EMAIL_COOLDOWN_MINUTES = 10;
const IP_HOURLY_LIMIT = 20;

type AuthEmailAction = "magic_link" | "password_reset";

function isAuthEmailAction(value: unknown): value is AuthEmailAction {
  return value === "magic_link" || value === "password_reset";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getClientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function buildEmail(action: AuthEmailAction, email: string, actionLink: string) {
  const isReset = action === "password_reset";
  const subject = isReset
    ? "Réinitialisation de votre mot de passe Hello Keys"
    : "Votre lien de connexion Hello Keys";
  const title = isReset ? "Réinitialiser votre mot de passe" : "Connexion à Hello Keys";
  const buttonLabel = isReset ? "Réinitialiser mon mot de passe" : "Me connecter";
  const intro = isReset
    ? "Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour continuer."
    : "Cliquez sur le bouton ci-dessous pour vous connecter à votre espace Hello Keys.";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;background:#f8fafc;padding:24px">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:28px">
        <img src="https://dkjaejzwmmwwzhokpbgs.supabase.co/storage/v1/object/public/public-assets/logo.png" alt="Hello Keys" style="width:140px;margin-bottom:20px">
        <h1 style="font-size:22px;margin:0 0 12px;color:#111827">${title}</h1>
        <p style="margin:0 0 18px">Bonjour,</p>
        <p style="margin:0 0 22px">${intro}</p>
        <p style="margin:26px 0">
          <a href="${actionLink}" style="display:inline-block;background:#175e82;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">${buttonLabel}</a>
        </p>
        <p style="font-size:13px;color:#6b7280;margin:20px 0 0">Ce lien est personnel et temporaire. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.</p>
        <p style="font-size:12px;color:#9ca3af;margin:18px 0 0">Demande pour : ${email}</p>
      </div>
    </div>
  `;

  return { subject, html };
}

async function applyRateLimit(email: string, action: AuthEmailAction, ipAddress: string) {
  const cooldownSince = new Date(Date.now() - EMAIL_COOLDOWN_MINUTES * 60 * 1000).toISOString();
  const hourlySince = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: recentSameRequest, error: recentError } = await admin
    .from("auth_email_requests")
    .select("id")
    .eq("email", email)
    .eq("action", action)
    .gte("created_at", cooldownSince)
    .limit(1);

  if (recentError) {
    console.error("[send-auth-email] rate limit lookup failed", recentError);
    throw new Error("Impossible de vérifier la limite d'envoi.");
  }

  if (recentSameRequest && recentSameRequest.length > 0) {
    return { limited: true, status: 429, message: "Un e-mail a déjà été demandé récemment. Réessayez dans quelques minutes." };
  }

  if (ipAddress !== "unknown") {
    const { count, error: ipError } = await admin
      .from("auth_email_requests")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ipAddress)
      .gte("created_at", hourlySince);

    if (ipError) {
      console.error("[send-auth-email] ip rate limit lookup failed", ipError);
      throw new Error("Impossible de vérifier la limite d'envoi.");
    }

    if ((count || 0) >= IP_HOURLY_LIMIT) {
      return { limited: true, status: 429, message: "Trop de demandes depuis cette connexion. Réessayez plus tard." };
    }
  }

  const { error: insertError } = await admin
    .from("auth_email_requests")
    .insert({ email, action, ip_address: ipAddress });

  if (insertError) {
    console.error("[send-auth-email] rate limit insert failed", insertError);
    throw new Error("Impossible d'enregistrer la demande d'envoi.");
  }

  admin
    .from("auth_email_requests")
    .delete()
    .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .then(({ error }) => {
      if (error) console.warn("[send-auth-email] cleanup failed", error);
    });

  return { limited: false, status: 200, message: "OK" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    if (!resend) {
      console.error("[send-auth-email] missing RESEND_API_KEY");
      return new Response(JSON.stringify({ error: "RESEND_API_KEY is not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(String(body.email || ""));
    const action = body.action;

    if (!isValidEmail(email) || !isAuthEmailAction(action)) {
      return new Response(JSON.stringify({ error: "Paramètres invalides" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const ipAddress = getClientIp(req);
    const rateLimit = await applyRateLimit(email, action, ipAddress);
    if (rateLimit.limited) {
      return new Response(JSON.stringify({ error: rateLimit.message }), {
        status: rateLimit.status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const redirectTo = `${APP_BASE_URL}/login`;
    const linkType = action === "password_reset" ? "recovery" : "magiclink";

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: linkType,
      email,
      options: { redirectTo },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.warn("[send-auth-email] link generation skipped", {
        email,
        action,
        error: linkError?.message,
      });
      return new Response(JSON.stringify({ message: "Si ce compte existe, un e-mail va être envoyé." }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { subject, html } = buildEmail(action, email, linkData.properties.action_link);
    const { error: sendError } = await resend.emails.send({
      from: "Hello Keys <noreply@notifications.hellokeys.fr>",
      to: [email],
      subject,
      html,
    });

    if (sendError) {
      console.error("[send-auth-email] resend failed", sendError);
      return new Response(JSON.stringify({ error: sendError.message || "Impossible d'envoyer l'e-mail." }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("[send-auth-email] auth email sent", { action, email });
    return new Response(JSON.stringify({ message: "E-mail envoyé." }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[send-auth-email] error", { message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
