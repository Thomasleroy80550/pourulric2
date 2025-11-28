import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
// NEW: Supabase client for persistent fallback
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

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

// NEW: cache des signaux pour limiter les appels RTE
let cachedSignals: { text: string; status: number; expires_at: number } | null = null;
// NEW: garder le dernier payload OK pour servir en cas de 429
let lastOkSignals: { text: string; fetched_at: number } | null = null;

// NEW: persistent fallback via app_settings
const LAST_OK_KEY = 'ecowatt_last_ok_payload'
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const supabaseAdmin = (supabaseUrl && serviceRoleKey)
  ? createClient(supabaseUrl, serviceRoleKey, { global: { headers: { 'X-Client-Info': 'ecowatt-edge' } } })
  : null

async function saveLastOkToDB(jsonText: string, requestId?: string) {
  if (!supabaseAdmin) return
  try {
    const parsed = JSON.parse(jsonText)
    // Exists?
    const { data: existing, error: selErr } = await supabaseAdmin
      .from('app_settings')
      .select('key')
      .eq('key', LAST_OK_KEY)
      .maybeSingle()
    if (selErr) {
      console.warn(`[ecowatt][${requestId}] Warning reading last OK from DB:`, selErr.message)
    }
    if (existing) {
      const { error: updErr } = await supabaseAdmin
        .from('app_settings')
        .update({ value: { data: parsed, fetched_at: new Date().toISOString() } })
        .eq('key', LAST_OK_KEY)
      if (updErr) console.warn(`[ecowatt][${requestId}] Warning updating last OK in DB:`, updErr.message)
    } else {
      const { error: insErr } = await supabaseAdmin
        .from('app_settings')
        .insert([{ key: LAST_OK_KEY, value: { data: parsed, fetched_at: new Date().toISOString() } }])
      if (insErr) console.warn(`[ecowatt][${requestId}] Warning inserting last OK in DB:`, insErr.message)
    }
  } catch (e) {
    console.warn(`[ecowatt][${requestId}] Warning persisting last OK: ${(e as Error).message}`)
  }
}

async function loadLastOkFromDB(requestId?: string): Promise<string | null> {
  if (!supabaseAdmin) return null
  const { data, error } = await supabaseAdmin
    .from('app_settings')
    .select('value')
    .eq('key', LAST_OK_KEY)
    .maybeSingle()
  if (error) {
    console.warn(`[ecowatt][${requestId}] Warning loading last OK from DB:`, error.message)
    return null
  }
  const val = (data as any)?.value
  if (val?.data) {
    try {
      return JSON.stringify(val.data)
    } catch {
      return null
    }
  }
  return null
}

async function getOAuthToken(requestId?: string): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expires_at > now) {
    console.log(`[ecowatt][${requestId}] Using cached token`);
    return cachedToken.access_token;
  }

  const clientId = Deno.env.get("RTE_CLIENT_ID")?.trim();
  const clientSecret = Deno.env.get("RTE_CLIENT_SECRET")?.trim();

  if (!clientId || !clientSecret) {
    console.error(`[ecowatt][${requestId}] Missing RTE_CLIENT_ID or RTE_CLIENT_SECRET`);
    throw new Error("Missing RTE_CLIENT_ID or RTE_CLIENT_SECRET environment variables");
  }

  console.log(`[ecowatt][${requestId}] Requesting OAuth token from RTE with Basic auth…`);
  const basic = btoa(`${clientId}:${clientSecret}`);

  const body = new URLSearchParams({
    grant_type: "client_credentials",
  });

  const tokenRes = await fetch("https://digital.iservices.rte-france.com/token/oauth/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
      "Authorization": `Basic ${basic}`,
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
  const now = Date.now();
  if (cachedSignals && cachedSignals.expires_at > now) {
    console.log(`[ecowatt][${requestId}] Returning cached signals (cache HIT)`);
    return new Response(cachedSignals.text, {
      status: cachedSignals.status,
      headers: { ...corsHeaders, "X-Cache": "HIT" },
    });
  }

  console.log(`[ecowatt][${requestId}] Cache MISS -> fetching from RTE`);
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

  // TTL calculé selon le statut
  let ttlMs = 0;
  if (signalsRes.ok) {
    ttlMs = 5 * 60_000; // 5 min
  } else if (signalsRes.status === 429) {
    const retryAfter = signalsRes.headers.get("Retry-After");
    let seconds = parseInt(retryAfter ?? "", 10);
    if (Number.isNaN(seconds) || seconds <= 0) seconds = 60;
    seconds = Math.max(60, Math.min(seconds, 600)); // borne 60s..10min
    ttlMs = seconds * 1000;
  }

  // Mettre en cache la réponse brute (même 429) pour limiter la pression sur RTE
  if (ttlMs > 0) {
    cachedSignals = {
      text,
      status: signalsRes.status,
      expires_at: Date.now() + ttlMs,
    };
    console.log(`[ecowatt][${requestId}] Signals cached for ${Math.round(ttlMs / 1000)}s`);
  }

  // Si OK, mémoriser en mémoire + DB
  if (signalsRes.ok) {
    lastOkSignals = { text, fetched_at: Date.now() };
    // Persist last OK in DB (non bloquant)
    saveLastOkToDB(text, requestId);
    return new Response(text, {
      status: signalsRes.status,
      headers: { ...corsHeaders, "X-Cache": "MISS" },
    });
  }

  // En cas de 429, servir d'abord le dernier OK en mémoire si disponible (stale <= 6h)
  if (signalsRes.status === 429) {
    if (lastOkSignals && (Date.now() - lastOkSignals.fetched_at) < 6 * 60 * 60_000) {
      console.warn(`[ecowatt][${requestId}] Rate limited (429). Serving last OK payload as STALE`);
      return new Response(lastOkSignals.text, {
        status: 200,
        headers: { ...corsHeaders, "X-Cache": "STALE", "X-Original-Status": "429" },
      });
    }
    // Sinon, tenter le fallback persistant en base
    const dbText = await loadLastOkFromDB(requestId);
    if (dbText) {
      console.warn(`[ecowatt][${requestId}] Rate limited (429). Serving DB-stored last OK payload as STALE_DB`);
      return new Response(dbText, {
        status: 200,
        headers: { ...corsHeaders, "X-Cache": "STALE_DB", "X-Original-Status": "429" },
      });
    }
  }

  // Sinon, renvoyer tel quel (ex: 429 sans fallback, ou autres erreurs)
  return new Response(text, {
    status: signalsRes.status,
    headers: { ...corsHeaders, "X-Cache": "MISS" },
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