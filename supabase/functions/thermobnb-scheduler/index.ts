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
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized user" }), { status: 401, headers: corsHeaders });
  }
  const userId = userData.user.id;

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  const nowSec = Math.floor(Date.now() / 1000);
  const nowIso = new Date().toISOString();

  // Charger les programmations dues pour l’utilisateur
  const { data: schedules, error: selErr } = await supabaseAdmin
    .from("thermostat_schedules")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .lte("start_time", nowIso);

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

    if (type === "heat") {
      // Appliquer chauffe en mode manual avec endtime (jusqu'au départ)
      if (mode !== "manual" || typeof temp !== "number") {
        await supabaseAdmin
          .from("thermostat_schedules")
          .update({ status: "failed", error: "Invalid heat schedule: requires mode=manual and temp number" })
          .eq("id", sched.id);
        results.push({ id: sched.id, status: "failed", reason: "invalid heat schedule" });
        continue;
      }
      const endtime = sched.end_time ? Math.floor(new Date(sched.end_time).getTime() / 1000) : nowSec + 3600;
      payload = { endpoint: "setroomthermpoint", home_id, room_id, mode: "manual", temp, endtime };
    } else {
      // Arrêt au départ: mode home
      payload = { endpoint: "setroomthermpoint", home_id, room_id, mode: "home" };
    }

    const upstream = await fetch(`${supabaseUrl}/functions/v1/netatmo-proxy`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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
  }

  return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
    status: 200,
    headers: corsHeaders,
  });
});