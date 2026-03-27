import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") ?? "").trim();
const SUPABASE_ANON_KEY = (Deno.env.get("SUPABASE_ANON_KEY") ?? "").trim();
const SMSFACTOR_API_TOKEN = (Deno.env.get("SMSFACTOR_API_TOKEN") ?? "").trim();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function normalizePhoneForSmsFactor(value: string | null | undefined): string | null {
  if (!value) return null;

  let phone = value.trim().replace(/[\s\-().]/g, "");
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  if (phone.startsWith("33") && !phone.startsWith("+")) phone = `+${phone}`;
  if (!phone.startsWith("+") && phone.length === 10 && phone.startsWith("0")) phone = `+33${phone.slice(1)}`;
  if (phone.startsWith("+33") && phone[3] === "0") phone = `+33${phone.slice(4)}`;

  const digits = phone.replace(/\D/g, "");
  return digits.length >= 11 ? digits : null;
}

function sanitizeSmsText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function truncateSmsText(value: string, maxLength = 160): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SMSFACTOR_API_TOKEN) {
    console.error("[send-test-smsfactor-sms] missing configuration");
    return new Response(JSON.stringify({ error: "Configuration SMS incomplète" }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    console.warn("[send-test-smsfactor-sms] missing authorization header");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await userSupabase.auth.getUser();

  if (authError || !user) {
    console.error("[send-test-smsfactor-sms] auth error", authError?.message ?? "unknown");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const { data: profile, error: profileError } = await userSupabase
    .from("profiles")
    .select("id, phone_number")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("[send-test-smsfactor-sms] profile fetch error", profileError.message);
    return new Response(JSON.stringify({ error: "Impossible de charger le profil" }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  const destination = normalizePhoneForSmsFactor(profile?.phone_number ?? null);
  if (!destination) {
    console.warn("[send-test-smsfactor-sms] invalid or missing phone number", { userId: user.id });
    return new Response(JSON.stringify({ error: "Aucun numero de telephone valide sur votre profil" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const rawMessage = "Hello Keys test SMS OK. Si vous recevez ce message, les notifications SMS de reservation sont actives sur votre compte.";
  const message = truncateSmsText(sanitizeSmsText(rawMessage));

  const params = new URLSearchParams({
    token: SMSFACTOR_API_TOKEN,
    text: message,
    to: destination,
    pushtype: "alert",
    gsmsmsid: `test-${user.id}`,
  });

  const response = await fetch(`https://api.smsfactor.com/send?${params.toString()}`, {
    method: "GET",
  });

  const responseText = await response.text();
  if (!response.ok) {
    console.error("[send-test-smsfactor-sms] smsfactor error", response.status, responseText);
    return new Response(JSON.stringify({ error: `SMSFactor error ${response.status}` }), {
      status: 502,
      headers: corsHeaders,
    });
  }

  console.log("[send-test-smsfactor-sms] test sms sent", { userId: user.id, destination });

  return new Response(JSON.stringify({
    success: true,
    to: destination,
    message,
    providerResponse: responseText,
  }), {
    status: 200,
    headers: corsHeaders,
  });
});
