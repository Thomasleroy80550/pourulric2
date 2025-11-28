import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

type TokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
};

let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getOAuthToken(requestId?: string): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expires_at > now) {
    console.log(`[ecowatt][${requestId}] Using cached token`);
    return cachedToken.access_token;
  }

  const clientId = Deno.env.get("RTE_CLIENT_ID");
  const clientSecret = Deno.env.get("RTE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    console.error(`[ecowatt][${requestId}] Missing RTE_CLIENT_ID or RTE_CLIENT_SECRET`);
    throw new Error("Missing RTE_CLIENT_ID or RTE_CLIENT_SECRET environment variables");
  }

  console.log(`[ecowatt][${requestId}] Requesting OAuth token from RTE…`);
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const tokenRes = await fetch("https://digital.iservices.rte-france.com/token/oauth/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  console.log(`[ecowatt][${requestId}] Token response status: ${tokenRes.status}`);
  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error(`[ecowatt][${requestId}] Failed to obtain token: ${tokenRes.status} ${tokenRes.statusText} - ${errText}`);
    throw new Error(`Failed to obtain token: ${tokenRes.status} ${tokenRes.statusText}`);
  }

  const tokenJson = (await tokenRes.json()) as TokenResponse;
  const expiresInSec = tokenJson.expires_in ?? 3600;
  const expiresAt = Date.now() + (expiresInSec - 60) * 1000;

  cachedToken = {
    access_token: tokenJson.access_token,
    expires_at: expiresAt,
  };

  console.log(`[ecowatt][${requestId}] Token obtained successfully. Expires in ~${expiresInSec}s`);
  return tokenJson.access_token;
}

async function getSignals(requestId?: string): Promise<Response> {
  const token = await getOAuthToken(requestId);

  console.log(`[ecowatt][${requestId}] Fetching Ecowatt signals from RTE…`);
  const signalsRes = await fetch("https://digital.iservices.rte-france.com/open_api/ecowatt/v5/signals", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  console.log(`[ecowatt][${requestId}] Signals response status: ${signalsRes.status}`);
  const text = await signalsRes.text();

  // Renvoie tel quel le JSON/texte, avec le statut original.
  return new Response(text, {
    status: signalsRes.status,
    headers: corsHeaders,
  });
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[ecowatt][${requestId}] Incoming request: ${req.method}`);

  if (req.method === "OPTIONS") {
    console.log(`[ecowatt][${requestId}] Preflight OK`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "GET" && req.method !== "POST") {
      console.warn(`[ecowatt][${requestId}] Method not allowed: ${req.method}`);
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: corsHeaders,
      });
    }

    const res = await getSignals(requestId);
    console.log(`[ecowatt][${requestId}] Completed with status ${res.status}`);
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`[ecowatt][${requestId}] Error: ${message}`);
    return new Response(JSON.stringify({ error: message, requestId }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});