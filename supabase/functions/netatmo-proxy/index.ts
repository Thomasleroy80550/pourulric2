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

  const authHeader = req.headers.get("Authorization") ?? "";
  const cronSecretEnv = (Deno.env.get("CRON_SECRET") ?? "").trim();

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: corsHeaders });
  }

  const headerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  const hasHeaderCron = !!headerToken && !!cronSecretEnv && headerToken === cronSecretEnv;
  const hasBodyCron = !!cronSecretEnv && typeof payload?.cron_secret === "string" && payload.cron_secret.trim() === cronSecretEnv;
  const isCron = hasHeaderCron || hasBodyCron;

  const action: string = payload?.endpoint ?? "homesdata";
  const home_id: string | undefined = payload?.home_id;
  const device_id: string | undefined = payload?.device_id;
  const module_id: string | undefined = payload?.module_id;
  const room_id: string | undefined = payload?.room_id;
  const mode: string | undefined = payload?.mode;
  const temp: number | undefined = payload?.temp;
  const endtime: string | number | undefined = payload?.endtime;

  const scale: string | undefined = payload?.scale;
  const typeParam: string[] | string | undefined = payload?.type;
  const date_begin: number | undefined = payload?.date_begin;
  const date_end: number | undefined = payload?.date_end;
  const limit: number | undefined = payload?.limit;
  const optimize: boolean | undefined = payload?.optimize;
  const real_time: boolean | undefined = payload?.real_time;

  // NEW: createnewhomeschedule params
  const schedule_name: string | undefined = payload?.name;
  const hg_temp: number | undefined = payload?.hg_temp;
  const away_temp: number | undefined = payload?.away_temp;
  const zones: any[] | undefined = payload?.zones;
  const timetable: any[] | undefined = payload?.timetable;

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
  let userId: string | null = null;

  if (isCron) {
    userId = payload?.user_id ?? null;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing user_id for cron mode" }), { status: 400, headers: corsHeaders });
    }
  } else {
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized user" }), { status: 401, headers: corsHeaders });
    }
    userId = userData.user.id;
  }

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

  let usable = record;
  try {
    usable = await ensureFreshToken(record);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: "Refresh failed", details: msg }), { status: 502, headers: corsHeaders });
  }

  async function logEvent(params: Record<string, any>, responseStatus: number, bodyPreview: string, errorMsg?: string, countPoints?: number | null) {
    try {
      await supabaseAdmin.from("netatmo_logs").insert({
        user_id: userId,
        endpoint: action,
        params,
        response_status: responseStatus,
        body_preview: bodyPreview,
        error: errorMsg ?? null,
        count_points: typeof countPoints === "number" ? countPoints : null,
      });
    } catch (_e) {
      console.warn(`[netatmo-proxy][${requestId}] Log insert failed:`, String(_e));
    }
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
  } else if (action === "getmeasure") {
    // NEW: historique chaudière
    if (!device_id || !module_id || !scale || !typeParam) {
      return new Response(JSON.stringify({ error: "Missing required fields: device_id, module_id, scale, type" }), { status: 400, headers: corsHeaders });
    }
    const typeStr = Array.isArray(typeParam) ? typeParam.join(",") : String(typeParam);
    url = "https://api.netatmo.com/api/getmeasure";
    const qs = new URLSearchParams({
      device_id,
      module_id,
      scale,
      type: typeStr,
    });
    if (typeof date_begin === "number") qs.set("date_begin", String(date_begin));
    if (typeof date_end === "number") qs.set("date_end", String(date_end));
    if (typeof limit === "number") qs.set("limit", String(Math.min(Math.max(limit, 1), 1024)));
    if (typeof optimize === "boolean") qs.set("optimize", optimize ? "true" : "false");
    if (typeof real_time === "boolean") qs.set("real_time", real_time ? "true" : "false");
    url += `?${qs.toString()}`;
    upstream = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${usable.access_token}`,
        "Accept": "application/json",
      },
    });
  } else if (action === "getroommeasure") {
    // NEW: historique d'une pièce
    if (!home_id || !room_id || !scale || !typeParam) {
      return new Response(JSON.stringify({ error: "Missing required fields: home_id, room_id, scale, type" }), { status: 400, headers: corsHeaders });
    }
    const typeStr = Array.isArray(typeParam) ? typeParam.join(",") : String(typeParam);
    url = "https://api.netatmo.com/api/getroommeasure";
    const qs = new URLSearchParams({
      home_id,
      room_id,
      scale,
      type: typeStr,
    });
    if (typeof date_begin === "number") qs.set("date_begin", String(date_begin));
    if (typeof date_end === "number") qs.set("date_end", String(date_end));
    if (typeof limit === "number") qs.set("limit", String(Math.min(Math.max(limit, 1), 1024)));
    if (typeof optimize === "boolean") qs.set("optimize", optimize ? "true" : "false");
    if (typeof real_time === "boolean") qs.set("real_time", real_time ? "true" : "false");
    url += `?${qs.toString()}`;
    upstream = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${usable.access_token}`,
        "Accept": "application/json",
      },
    });
  } else if (action === "createnewhomeschedule") {
    // NEW: créer un planning hebdo
    if (!home_id || !Array.isArray(zones) || !Array.isArray(timetable) || typeof hg_temp !== "number" || typeof away_temp !== "number") {
      return new Response(JSON.stringify({ error: "Missing required fields: home_id, zones[], timetable[], hg_temp, away_temp" }), { status: 400, headers: corsHeaders });
    }
    const bodyPayload: Record<string, any> = {
      home_id,
      zones,
      timetable,
      hg_temp,
      away_temp,
    };
    if (typeof schedule_name === "string" && schedule_name.trim().length > 0) {
      bodyPayload.name = schedule_name.trim();
    }

    url = "https://api.netatmo.com/api/createnewhomeschedule";
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${usable.access_token}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyPayload),
    });
  } else if (action === "switchhomeschedule") {
    // NEW: activer un planning pour la maison
    const schedule_id: string | undefined = payload?.schedule_id;
    if (!home_id || !schedule_id) {
      return new Response(JSON.stringify({ error: "Missing required fields: home_id, schedule_id" }), { status: 400, headers: corsHeaders });
    }
    url = "https://api.netatmo.com/api/switchhomeschedule";
    const form = new URLSearchParams();
    form.set("home_id", home_id);
    form.set("schedule_id", schedule_id);
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${usable.access_token}`,
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
  } else if (action === "setthermmode") {
    // NEW: basculer le mode de la maison (schedule, away, hg)
    const therm_mode: string | undefined = payload?.mode;
    if (!home_id || !therm_mode) {
      return new Response(JSON.stringify({ error: "Missing required fields: home_id, mode" }), { status: 400, headers: corsHeaders });
    }
    url = "https://api.netatmo.com/api/setthermmode";
    const form = new URLSearchParams();
    form.set("home_id", home_id);
    form.set("mode", therm_mode);
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
    // rétrocompat météo
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

  // Calculer countPoints si possible
  let countPoints: number | null = null;
  try {
    const parsed = JSON.parse(text);
    if (action === "getroommeasure") {
      const values = parsed?.body?.home?.values ?? parsed?.body?.values;
      if (Array.isArray(values)) {
        countPoints = values.length;
      } else if (Array.isArray(parsed?.body)) {
        const first = parsed.body[0];
        const v = first?.value;
        if (Array.isArray(v)) {
          // format optimisé: tableau de tableaux
          countPoints = Array.isArray(v[0]) ? v[0].length : v.length;
        } else {
          countPoints = 1;
        }
      }
    } else if (action === "getmeasure") {
      const items = parsed?.body?.items;
      countPoints = Array.isArray(items) ? items.length : (items ? 1 : 0);
    } else if (action === "createnewhomeschedule") {
      // Le retour contient souvent status ok; pas de points à compter
      countPoints = null;
    }
  } catch {
    // ignore
  }

  // Enregistrer log
  const paramsLog = {
    home_id, room_id, device_id, module_id, scale, type: typeParam, date_begin, date_end, real_time, optimize,
    mode, temp, endtime, url,
    name: schedule_name, hg_temp, away_temp,
    zones_len: Array.isArray(zones) ? zones.length : null,
    timetable_len: Array.isArray(timetable) ? timetable.length : null,
  };
  const preview = text ? text.slice(0, 500) : "";

  if (!upstream.ok) {
    await logEvent(paramsLog, upstream.status, preview, preview, countPoints);
    return new Response(JSON.stringify({ error: "Netatmo upstream error", status: upstream.status, body: preview }), {
      status: upstream.status,
      headers: corsHeaders,
    });
  }

  await logEvent(paramsLog, upstream.status, preview, undefined, countPoints);

  return new Response(text, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": contentType },
  });
});