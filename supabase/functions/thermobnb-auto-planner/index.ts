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
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";

type UserRoom = {
  id: string;
  user_id: string;
  room_id: string;
  room_name: string;
};

type NetatmoThermostatMap = {
  id: string;
  user_id: string;
  user_room_id: string;
  home_id: string;
  device_id: string;
  module_id: string;
  netatmo_room_id: string | null;
  netatmo_room_name: string | null;
};

type Reservation = {
  id: string;
  guest_name: string;
  property_name: string;
  krossbooking_room_id: string;
  check_in_date: string;
  check_out_date: string;
  cod_channel?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const isCron = !!CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;

  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let userId: string | null = null;
  if (!isCron) {
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized user" }), { status: 401, headers: corsHeaders });
    }
    userId = userData.user.id;
  }

  // Déterminer la fenêtre de réservation à traiter: aujourd'hui et les 7 prochains jours
  const now = new Date();
  const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endWindow = new Date(startDay.getTime() + 7 * 24 * 3600 * 1000);

  // Collecte des utilisateurs concernés (CRON: tous; user mode: seulement utilisateur courant)
  let userIds: string[] = [];

  if (isCron) {
    // Tous les utilisateurs qui ont des thermostats mappés
    const { data: maps } = await supabaseAdmin
      .from("netatmo_thermostats")
      .select("user_id")
      .not("user_id", "is", null);
    userIds = Array.from(new Set((maps || []).map((m: any) => m.user_id)));
  } else if (userId) {
    userIds = [userId];
  }

  const processedForUsers: Record<string, number> = {};
  const errorsForUsers: Record<string, string[]> = {};

  for (const uid of userIds) {
    try {
      // Charger le scénario global de l'utilisateur
      const { data: scenario } = await supabaseAdmin
        .from("thermostat_scenarios")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();

      const preheatMode: "relative" | "absolute" = (scenario?.arrival_preheat_mode as any) || "relative";
      const preheatMinutes: number = typeof scenario?.arrival_preheat_minutes === "number" ? scenario.arrival_preheat_minutes : 240;
      const heatStartTime: string | null = scenario?.heat_start_time || null; // ex: '14:00'
      const arrivalTemp: number = typeof scenario?.arrival_temp === "number" ? Number(scenario.arrival_temp) : 20;
      const stopTime: string = scenario?.stop_time || "11:00"; // ex: '11:00'

      // Récupérer les logements de l'utilisateur
      const { data: rooms } = await supabaseAdmin
        .from("user_rooms")
        .select("id, user_id, room_id, room_name")
        .eq("user_id", uid);
      const userRooms: UserRoom[] = (rooms || []) as any[];

      // Mappings Netatmo
      const { data: ntMaps } = await supabaseAdmin
        .from("netatmo_thermostats")
        .select("*")
        .eq("user_id", uid);
      const thermostats: NetatmoThermostatMap[] = (ntMaps || []) as any[];

      let countInserted = 0;

      for (const room of userRooms) {
        const mapping = thermostats.find((m) => m.user_room_id === room.id);
        if (!mapping || !mapping.netatmo_room_id) continue;

        // Récupérer les réservations (fenêtre 7 jours à partir d'aujourd'hui)
        const kbRes = await fetch(`${SUPABASE_URL}/functions/v1/krossbooking-proxy`, {
          method: "POST",
          headers: {
            "Authorization": isCron ? `Bearer ${CRON_SECRET}` : authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "get_reservations_for_room",
            id_room: room.room_id,
          }),
        });

        if (!kbRes.ok) {
          const text = await kbRes.text();
          (errorsForUsers[uid] ||= []).push(`KB error for room ${room.room_id}: ${text.slice(0, 200)}`);
          continue;
        }

        const kbJson = await kbRes.json();
        const reservations: Reservation[] = (kbJson?.data || []).map((res: any) => ({
          id: String(res.id_reservation),
          guest_name: res.label || "N/A",
          property_name: room.room_name,
          krossbooking_room_id: room.room_id,
          check_in_date: res.arrival || "",
          check_out_date: res.departure || "",
          cod_channel: res.cod_channel,
        }));

        const filtered = reservations.filter((r) => {
          const ci = new Date(r.check_in_date);
          return ci >= startDay && ci <= endWindow;
        });

        for (const r of filtered) {
          const arrivalDate = new Date(r.check_in_date);
          const departureDate = new Date(r.check_out_date);

          // Calcul heure de lancement (selon scénario)
          let startHeatDate: Date;
          if (preheatMode === "absolute" && heatStartTime) {
            const [hh, mm] = heatStartTime.split(":").map((n) => Number(n));
            startHeatDate = new Date(arrivalDate);
            startHeatDate.setHours(hh || 0, mm || 0, 0, 0);
          } else {
            startHeatDate = new Date(arrivalDate.getTime() - Math.max(5, preheatMinutes) * 60 * 1000);
          }
          const startHeatIso = startHeatDate.toISOString();

          // Heure d'arrêt à stopTime le jour du départ
          const [sh, sm] = (stopTime || "11:00").split(":").map((n) => Number(n));
          const stopDate = new Date(departureDate);
          stopDate.setHours(sh || 11, sm || 0, 0, 0);
          const stopIso = stopDate.toISOString();

          // Vérifier doublons
          const { data: existingHeat } = await supabaseAdmin
            .from("thermostat_schedules")
            .select("id")
            .eq("user_id", uid)
            .eq("netatmo_room_id", mapping.netatmo_room_id)
            .eq("type", "heat")
            .eq("start_time", startHeatIso)
            .limit(1);

          const { data: existingStop } = await supabaseAdmin
            .from("thermostat_schedules")
            .select("id")
            .eq("user_id", uid)
            .eq("netatmo_room_id", mapping.netatmo_room_id)
            .eq("type", "stop")
            .eq("start_time", stopIso)
            .limit(1);

          // Insérer programmations si absentes
          if (!existingHeat || existingHeat.length === 0) {
            const { error: insErr1 } = await supabaseAdmin
              .from("thermostat_schedules")
              .insert({
                user_id: uid,
                user_room_id: room.id,
                home_id: mapping.home_id,
                netatmo_room_id: mapping.netatmo_room_id,
                module_id: mapping.module_id,
                type: "heat",
                mode: "manual",
                temp: arrivalTemp,
                start_time: startHeatIso,
                end_time: stopIso,
                status: "pending",
              });
            if (!insErr1) countInserted++;
          }

          if (!existingStop || existingStop.length === 0) {
            const { error: insErr2 } = await supabaseAdmin
              .from("thermostat_schedules")
              .insert({
                user_id: uid,
                user_room_id: room.id,
                home_id: mapping.home_id,
                netatmo_room_id: mapping.netatmo_room_id,
                module_id: mapping.module_id,
                type: "stop",
                mode: "home",
                temp: null,
                start_time: stopIso,
                end_time: null,
                status: "pending",
              });
            if (!insErr2) countInserted++;
          }
        }
      }

      processedForUsers[uid] = countInserted;
    } catch (e) {
      (errorsForUsers[uid] ||= []).push(String(e));
      processedForUsers[uid] = processedForUsers[uid] || 0;
    }
  }

  return new Response(JSON.stringify({ ok: true, isCron, processedForUsers, errorsForUsers }), {
    status: 200,
    headers: corsHeaders,
  });
});