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

async function getOAuthToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expires_at > now) {
    return cachedToken.access_token;
  }

  const clientId = Deno.env.get("RTE_CLIENT_ID");
  const clientSecret = Deno.env.get("RTE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Missing RTE_CLIENT_ID or RTE_CLIENT_SECRET environment variables");
  }

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

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Failed to obtain token: ${tokenRes.status} ${tokenRes.statusText} - ${errText}`);
  }

  const tokenJson = (await tokenRes.json()) as TokenResponse;
  const expiresInSec = tokenJson.expires_in ?? 3600;
  // Petite marge pour éviter l'expiration côté RTE
  const expiresAt = Date.now() + (expiresInSec - 60) * 1000;

  cachedToken = {
    access_token: tokenJson.access_token,
    expires_at: expiresAt,
  };

  return tokenJson.access_token;
}

async function getSignals(): Promise<Response> {
  const token = await getOAuthToken();

  const signalsRes = await fetch("https://digital.iservices.rte-france.com/open_api/ecowatt/v5/signals", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const text = await signalsRes.text();
  // On renvoie tel quel le JSON ou texte, avec le statut original, pour respecter la consigne "renvoie le JSON complet".
  return new Response(text, {
    status: signalsRes.status,
    headers: corsHeaders,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Accepte GET et POST (invoke envoie POST par défaut)
    if (req.method !== "GET" && req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: corsHeaders,
      });
    }

    const res = await getSignals();
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});