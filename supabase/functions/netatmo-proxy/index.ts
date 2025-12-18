import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

type StoredToken = {
  user_id: string;
  access_token: string;
  refresh_token: string;
  scope?: string;
  expires_at: string;
};

type RefreshResponse = {
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

async function ensureFreshToken(record: StoredToken): Promise<StoredToken> {
  const expiresMs = new Date(record.expires_at).getTime();
  if (expiresMs > Date.now() + 5000) return record;

  if (!NETATMO_CLIENT_ID || !NETATMO_CLIENT_SECRET) {
    throw new Error("Server not configured for Netatmo refresh");
  }

  const form = new URLSearchParams();
  form.set("grant_type", "refresh_token");
  form.set("client_id", NETATMO_CLIENT_ID);
  form.set("client_secret", NETATMO_CLIENT_SECRET);
  form.set("refresh_token", record.refresh_token);

  const res = await fetch("https://api.netatmo.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
    body: form.toString(),
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Netatmo refresh failed: ${res.status} ${raw.slice(0, 500)}`);
  }
  const json = JSON.parse(raw) as RefreshResponse;
  const updated: StoredToken = {
    user_id: record.user_id,
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    scope: json.scope ?? record.scope,
    expires_at: new Date(Date.now() + (json.expires_in - 60) * 1000).toISOString(),
  };

  // Persister
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { error: updErr } = await supabaseAdmin
    .from("netatmo_tokens")
    .update({
      access_token: updated.access_token,
      refresh_token: updated.refresh_token,
      scope: updated.scope,
      expires_at: updated.expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", record.user_id);

  if (updErr) {
    throw new Error(`Failed to persist refreshed token: ${updErr.message}`);
  }

  return updated;
}

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

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: corsHeaders });
  }

  // CHANGED: utiliser Energy API par défaut
  const action: string = payload?.endpoint ?? "homesdata";
  const home_id: string | undefined = payload?.home_id;
  const device_id: string | undefined = payload?.device_id; // rétrocompat éventuelle
  const room_id: string | undefined = payload?.room_id;
  const mode: string | undefined = payload?.mode;
  const temp: number | undefined = payload?.temp;
  const endtime: string | number | undefined = payload?.endtime;

  // Vérifier l'utilisateur via JWT
  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized user" }), { status: 401, headers: corsHeaders });
  }
  const userId = userData.user.id;

  // Charger le token de l'utilisateur
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data: rows, error: selErr } = await supabaseAdmin
    .from("netatmo_tokens")
    .select("*")
    .eq("user_id", userId)
    .limit(1);

  if (selErr) {
    return new Response(JSON.stringify({ error: "Failed to read tokens", details: selErr.message }), { status: 500, headers: corsHeaders });
  }
  const record = (rows?.[0] ?? null) as StoredToken | null;
  if (!record) {
    return new Response(JSON.stringify({ error: "Not connected to Netatmo" }), { status: 404, headers: corsHeaders });
  }

  // Rafraîchir si nécessaire
  let usable = record;
  try {
    usable = await ensureFreshToken(record);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: "Refresh failed", details: msg }), { status: 502, headers: corsHeaders });
  }

  // Proxifier l'appel Netatmo
  let url = "";
  let upstream: Response;

  if (action === "homesdata") {
    url = "https://api.netatmo.com/api/homesdata";
    if (home_id) {
      const p = new URLSearchParams({ home_id });
      url += `?${p.toString()}`;
    }
    upstream = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${usable.access_token}`,
        "Accept": "application/json",
      },
    });
  } else if (action === "homestatus") {
    if (!home_id) {
      return new Response(JSON.stringify({ error: "Missing home_id for homestatus" }), { status: 400, headers: corsHeaders });
    }
    url = `https://api.netatmo.com/api/homestatus?home_id=${encodeURIComponent(home_id)}`;
    upstream = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${usable.access_token}`,
        "Accept": "application/json",
      },
    });
  } else if (action === "setroomthermpoint") {
    // NEW: contrôle du chauffage d'une pièce
    if (!home_id || !room_id || !mode) {
      return new Response(JSON.stringify({ error: "Missing required fields: home_id, room_id, mode" }), { status: 400, headers: corsHeaders });
    }
    if (mode === "manual" && (typeof temp !== "number" || isNaN(temp))) {
      return new Response(JSON.stringify({ error: "Temp is required and must be a number for manual mode" }), { status: 400, headers: corsHeaders });
    }

    url = "https://api.netatmo.com/api/setroomthermpoint";
    const form = new URLSearchParams();
    form.set("home_id", home_id);
    form.set("room_id", room_id);
    form.set("mode", mode);
    if (mode === "manual") {
      form.set("temp", String(temp));
    }
    if (endtime !== undefined && endtime !== null && String(endtime).trim() !== "") {
      form.set("endtime", String(endtime));
    }

    upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${usable.access_token}`,
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
  } else if (action === "getstationsdata") {
    // rétrocompat: météo (stations)
    url = "https://api.netatmo.com/api/getstationsdata";
    if (device_id) {
      const p = new URLSearchParams({ device_id });
      url += `?${p.toString()}`;
    }
    upstream = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${usable.access_token}`,
        "Accept": "application/json",
      },
    });
  } else {
    return new Response(JSON.stringify({ error: "Unsupported endpoint", endpoint: action }), { status: 400, headers: corsHeaders });
  }

  const text = await upstream.text();
  const contentType = upstream.headers.get("content-type") || "application/json";
  if (!upstream.ok) {
    return new Response(JSON.stringify({ error: "Netatmo upstream error", status: upstream.status, body: text.slice(0, 500) }), {
      status: upstream.status,
      headers: corsHeaders,
    });
  }

  return new Response(text, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": contentType },
  });
});