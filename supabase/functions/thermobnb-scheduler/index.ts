import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");

  // Lire le body pour fallback d'auth cron si nécessaire
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const hasHeaderCron = !!authHeader && cronSecret && authHeader === `Bearer ${cronSecret}`;
  const hasBodyCron = !!cronSecret && body?.cron_secret === cronSecret;
  const isCron = hasHeaderCron || hasBodyCron;

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader ?? "" } } });

  let userId: string | null = null;
  if (!isCron) {
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized user" }), { status: 401, headers: corsHeaders });
    }
    userId = userData.user.id;
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  const nowIso = new Date().toISOString();

  let selQuery = supabaseAdmin
    .from("thermostat_schedules")
    .select("*")
    .eq("status", "pending")
    .lte("start_time", nowIso);

  if (!isCron && userId) {
    selQuery = selQuery.eq("user_id", userId);
  }

  const { data: schedules, error: selErr } = await selQuery;

  if (selErr) {
    return new Response(JSON.stringify({ error: "Failed to read schedules", details: selErr.message }), { status: 500, headers: corsHeaders });
  }

  const results: any[] = [];

  for (const sched of (schedules || [])) {
    const home_id: string = sched.home_id;
    const room_id: string = sched.netatmo_room_id;
    const type: "heat" | "stop" = sched.type;
    const mode: string = sched.mode;
    const temp: number | null = sched.temp !== null && sched.temp !== undefined ? Number(sched.temp) : null;

    let payload: any;

    try {
      if (type === "heat") {
        if (mode !== "manual" || typeof temp !== "number") {
          await supabaseAdmin
            .from("thermostat_schedules")
            .update({ status: "failed", error: "Invalid heat schedule: requires mode=manual and temp number" })
            .eq("id", sched.id);
          results.push({ id: sched.id, status: "failed", reason: "invalid heat schedule" });
          continue;
        }
        const endSec = sched.end_time ? Math.floor(new Date(sched.end_time).getTime() / 1000) : Math.floor(Date.now() / 1000) + 3600;
        payload = { endpoint: "setroomthermpoint", home_id, room_id, mode: "manual", temp, endtime: endSec };
      } else {
        payload = { endpoint: "setroomthermpoint", home_id, room_id, mode: "home" };
      }

      // Auth vers le proxy:
      // - Cron: utiliser CRON_SECRET et transmettre user_id
      // - Utilisateur: relayer le JWT reçu en Authorization
      const proxyAuth = isCron ? `Bearer ${cronSecret}` : (authHeader ?? "");
      const proxyBody = isCron ? { ...payload, user_id: sched.user_id, cron_secret: cronSecret } : payload;

      const upstream = await fetch(`${supabaseUrl}/functions/v1/netatmo-proxy`, {
        method: "POST",
        headers: {
          "Authorization": proxyAuth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(proxyBody),
      });

      const text = await upstream.text();
      if (!upstream.ok) {
        await supabaseAdmin
          .from("thermostat_schedules")
          .update({ status: "failed", error: `Upstream ${upstream.status}: ${text.slice(0, 300)}` })
          .eq("id", sched.id);
        results.push({ id: sched.id, status: "failed", upstream_status: upstream.status });
        continue;
      }

      await supabaseAdmin
        .from("thermostat_schedules")
        .update({ status: "applied", updated_at: nowIso })
        .eq("id", sched.id);

      results.push({ id: sched.id, status: "applied" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabaseAdmin
        .from("thermostat_schedules")
        .update({ status: "failed", error: msg })
        .eq("id", sched.id);
      results.push({ id: sched.id, status: "failed", error: msg });
    }
  }

  return new Response(JSON.stringify({ ok: true, mode: isCron ? "cron" : "user", processed: results.length, results }), {
    status: 200,
    headers: corsHeaders,
  });
});