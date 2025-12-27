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
const CRON_SECRET = (Deno.env.get("CRON_SECRET") ?? "").trim();

// Fonction Netatmo proxy (URL complète requise)
const NETATMO_PROXY_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/netatmo-proxy";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });

  // Vérifier utilisateur et admin
  const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }
  const uid = userData.user.id;

  // Vérifier rôle admin via RPC is_admin (SECURITY DEFINER)
  try {
    const { data: isAdmin, error: adminErr } = await supabaseUser.rpc("is_admin", { user_id: uid });
    if (adminErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), { status: 403, headers: corsHeaders });
    }
  } catch (_e) {
    return new Response(JSON.stringify({ error: "Admin check failed" }), { status: 500, headers: corsHeaders });
  }

  // Charger thermostats et rooms avec service role
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: therms, error: tErr } = await supabaseAdmin
    .from("netatmo_thermostats")
    .select("id, user_id, user_room_id, home_id, device_id, module_id, netatmo_room_id, netatmo_room_name, label")
    .order("updated_at", { ascending: false });

  if (tErr) {
    return new Response(JSON.stringify({ error: "Failed to read thermostats", details: tErr.message }), { status: 500, headers: corsHeaders });
  }

  // Mapper user_room_id -> room_name
  const userRoomIds = Array.from(
    new Set((therms || []).map((t) => t.user_room_id).filter((v): v is string => !!v))
  );
  const { data: userRooms, error: urErr } = await supabaseAdmin
    .from("user_rooms")
    .select("id, room_name, room_id, user_id")
    .in("id", userRoomIds.length ? userRoomIds : ["00000000-0000-0000-0000-000000000000"]);

  if (urErr) {
    return new Response(JSON.stringify({ error: "Failed to read user rooms", details: urErr.message }), { status: 500, headers: corsHeaders });
  }
  const userRoomMap = new Map<string, { room_name: string; room_id: string; user_id: string }>();
  (userRooms || []).forEach((r) => userRoomMap.set(r.id as string, { room_name: r.room_name as string, room_id: r.room_id as string, user_id: r.user_id as string }));

  // Regrouper par utilisateur & maison
  const groups = new Map<string, { user_id: string; home_id: string; rooms: any[] }>();
  (therms || []).forEach((t) => {
    const key = `${t.user_id}:${t.home_id}`;
    const arr = groups.get(key);
    const entry = { ...t };
    if (arr) {
      arr.rooms.push(entry);
    } else {
      groups.set(key, { user_id: t.user_id as string, home_id: t.home_id as string, rooms: [entry] });
    }
  });

  const items: any[] = [];

  // Appeler homestatus pour chaque groupe via netatmo-proxy (cron mode)
  for (const { user_id, home_id, rooms } of groups.values()) {
    try {
      const resp = await fetch(NETATMO_PROXY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ endpoint: "homestatus", home_id, user_id, cron_secret: CRON_SECRET }),
      });
      if (!resp.ok) {
        const body = await resp.text();
        // Marquer toutes les pièces comme erreur pour ce groupe
        rooms.forEach((t) => {
          const ur = t.user_room_id ? userRoomMap.get(t.user_room_id) : null;
          items.push({
            user_id,
            home_id,
            user_room_id: t.user_room_id ?? null,
            room_name: ur?.room_name ?? t.netatmo_room_name ?? null,
            external_room_id: ur?.room_id ?? null,
            netatmo_room_id: t.netatmo_room_id ?? null,
            label: t.label ?? null,
            error: body || `HTTP ${resp.status}`,
          });
        });
        continue;
      }
      const data = await resp.json();
      const roomsBlock = data?.body?.home?.rooms || data?.body?.rooms || [];
      // Indexer status par room id
      const byId = new Map<string, any>();
      roomsBlock.forEach((r: any) => {
        byId.set(String(r.id), {
          therm_measured_temperature: r.therm_measured_temperature,
          therm_setpoint_temperature: r.therm_setpoint_temperature,
          therm_setpoint_mode: r.therm_setpoint_mode ?? null,
          heating_power_request: typeof r.heating_power_request === "number" ? r.heating_power_request : null,
        });
      });

      // Fusionner avec nos thermostats mappés
      rooms.forEach((t) => {
        const status = t.netatmo_room_id ? byId.get(String(t.netatmo_room_id)) : null;
        const ur = t.user_room_id ? userRoomMap.get(t.user_room_id) : null;
        items.push({
          user_id,
          home_id,
          user_room_id: t.user_room_id ?? null,
          room_name: ur?.room_name ?? t.netatmo_room_name ?? null,
          external_room_id: ur?.room_id ?? null,
          netatmo_room_id: t.netatmo_room_id ?? null,
          label: t.label ?? null,
          ...(status || {}),
        });
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      rooms.forEach((t) => {
        const ur = t.user_room_id ? userRoomMap.get(t.user_room_id) : null;
        items.push({
          user_id,
          home_id,
          user_room_id: t.user_room_id ?? null,
          room_name: ur?.room_name ?? t.netatmo_room_name ?? null,
          external_room_id: ur?.room_id ?? null,
          netatmo_room_id: t.netatmo_room_id ?? null,
          label: t.label ?? null,
          error: msg,
        });
      });
    }
  }

  return new Response(JSON.stringify({ items }), { status: 200, headers: corsHeaders });
});