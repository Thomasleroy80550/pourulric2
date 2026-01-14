import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = (Deno.env.get("CRON_SECRET") || "").trim();

type ThermAssign = {
  id: string;
  user_id: string;
  user_room_id: string;
  home_id: string;
  netatmo_room_id: string | null;
};

type ThresholdRow = {
  user_room_id: string;
  threshold: number;
};

type UserRoom = {
  id: string;
  room_name: string;
};

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

  // Vérifier que l'appelant est admin
  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: userData } = await supabaseUser.auth.getUser();
  const uid = userData?.user?.id || null;
  if (!uid) {
    return new Response(JSON.stringify({ error: "Unauthorized user" }), { status: 401, headers: corsHeaders });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Charger toutes les assignations thermostat
  const { data: therms, error: thermErr } = await supabaseAdmin
    .from("netatmo_thermostats")
    .select("id, user_id, user_room_id, home_id, netatmo_room_id")
    .limit(5000);
  if (thermErr) {
    return new Response(JSON.stringify({ error: "Failed to load assignments", details: thermErr.message }), { status: 500, headers: corsHeaders });
  }
  const assignments = (therms || []) as ThermAssign[];

  // Charger les seuils
  const { data: thresholdsData } = await supabaseAdmin
    .from("temperature_alert_settings")
    .select("user_room_id, threshold")
    .limit(5000);
  const thresholds = (thresholdsData || []) as ThresholdRow[];

  // Charger les noms des logements
  const { data: roomsData } = await supabaseAdmin
    .from("user_rooms")
    .select("id, room_name")
    .limit(5000);
  const rooms = (roomsData || []) as UserRoom[];
  const roomNameMap = new Map<string, string>();
  rooms.forEach((r) => roomNameMap.set(String(r.id), r.room_name));

  // Index seuils
  const thresholdMap = new Map<string, number>();
  thresholds.forEach((t) => thresholdMap.set(String(t.user_room_id), Number(t.threshold) || 14));

  // Regrouper par utilisateur et home_id
  const byUserHome = new Map<string, ThermAssign[]>();
  assignments.forEach((a) => {
    if (!a.home_id || !a.netatmo_room_id) return;
    const key = `${a.user_id}__${a.home_id}`;
    const arr = byUserHome.get(key) || [];
    arr.push(a);
    byUserHome.set(key, arr);
  });

  const alerts: Array<{ user_id: string; user_room_id: string; room_name: string; home_id: string; netatmo_room_id: string; measured: number; threshold: number }> = [];

  // Parcourir chaque (user, home) et interroger netatmo-proxy en mode cron
  for (const [key, list] of byUserHome.entries()) {
    const [userId, homeId] = key.split("__");
    if (!CRON_SECRET) {
      // Si pas de CRON_SECRET, on ne peut pas faire d'appel cross-user. Retourne vide avec info.
      continue;
    }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/netatmo-proxy`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CRON_SECRET}`, // header cron accepté par netatmo-proxy
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ endpoint: "homestatus", home_id: homeId, user_id: userId, cron_secret: CRON_SECRET }),
    });

    if (!res.ok) {
      // ignore cette maison si indisponible
      continue;
    }
    const data = await res.json();
    const roomsStatus = data?.body?.home?.rooms || data?.body?.rooms || [];

    // Index status par id
    const statusById = new Map<string, any>();
    roomsStatus.forEach((r: any) => statusById.set(String(r.id), r));

    // Évaluer chaque assignation
    for (const a of list) {
      const r = statusById.get(String(a.netatmo_room_id));
      const measured = typeof r?.therm_measured_temperature === "number" ? Number(r.therm_measured_temperature) : NaN;
      if (!Number.isFinite(measured)) continue;
      const thr = thresholdMap.get(String(a.user_room_id)) || 14;
      if (measured < thr) {
        alerts.push({
          user_id: userId,
          user_room_id: String(a.user_room_id),
          room_name: roomNameMap.get(String(a.user_room_id)) || String(a.user_room_id),
          home_id: homeId,
          netatmo_room_id: String(a.netatmo_room_id),
          measured,
          threshold: thr,
        });
      }
    }
  }

  return new Response(JSON.stringify({ count: alerts.length, alerts }), { status: 200, headers: corsHeaders });
});