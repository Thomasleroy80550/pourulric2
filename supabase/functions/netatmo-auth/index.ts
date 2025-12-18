import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

type TokenExchangeResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const NETATMO_CLIENT_ID = Deno.env.get("NETATMO_CLIENT_ID");
const NETATMO_CLIENT_SECRET = Deno.env.get("NETATMO_CLIENT_SECRET");

serve(async (req) => {
  const requestId = crypto.randomUUID();
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: corsHeaders });
  }

  const code: string | undefined = body?.code;
  const redirect_uri: string | undefined = body?.redirect_uri;
  if (!code || !redirect_uri) {
    return new Response(JSON.stringify({ error: "Missing fields: code, redirect_uri" }), { status: 400, headers: corsHeaders });
  }

  if (!NETATMO_CLIENT_ID || !NETATMO_CLIENT_SECRET) {
    return new Response(JSON.stringify({ error: "Server not configured: NETATMO_CLIENT_ID/NETATMO_CLIENT_SECRET missing" }), { status: 500, headers: corsHeaders });
  }

  // Vérifier l'utilisateur via le JWT
  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized user" }), { status: 401, headers: corsHeaders });
  }
  const userId = userData.user.id;

  // Échanger le code contre les tokens
  const form = new URLSearchParams();
  form.set("grant_type", "authorization_code");
  form.set("client_id", NETATMO_CLIENT_ID);
  form.set("client_secret", NETATMO_CLIENT_SECRET);
  form.set("code", code);
  form.set("redirect_uri", redirect_uri);

  const tokenRes = await fetch("https://api.netatmo.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
    body: form.toString(),
  });

  const rawText = await tokenRes.text();
  if (!tokenRes.ok) {
    return new Response(JSON.stringify({ error: "Netatmo token exchange failed", upstream_status: tokenRes.status, body: rawText?.slice(0, 500) || "" }), {
      status: 502,
      headers: corsHeaders,
    });
  }

  let tokenJson: TokenExchangeResponse;
  try {
    tokenJson = JSON.parse(rawText) as TokenExchangeResponse;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON from Netatmo" }), { status: 502, headers: corsHeaders });
  }

  const expiresAt = new Date(Date.now() + (tokenJson.expires_in - 60) * 1000).toISOString();

  // Enregistrer/mettre à jour en base
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { error: upsertErr } = await supabaseAdmin
    .from("netatmo_tokens")
    .upsert({
      user_id: userId,
      access_token: tokenJson.access_token,
      refresh_token: tokenJson.refresh_token,
      scope: tokenJson.scope ?? "read_station",
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (upsertErr) {
    return new Response(JSON.stringify({ error: "Failed to persist tokens", details: upsertErr.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  return new Response(JSON.stringify({ ok: true, scope: tokenJson.scope ?? "read_station", expires_at: expiresAt }), {
    status: 200,
    headers: corsHeaders,
  });
});