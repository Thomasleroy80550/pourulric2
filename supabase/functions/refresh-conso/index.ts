import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function toISODate(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDaysUTC(d: Date, delta: number) {
  const nd = new Date(d);
  nd.setUTCDate(nd.getUTCDate() + delta);
  return nd;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth simple par token de cron (supporte rotation: CRON_SECRET ou CRON_SECRET_V2)
  const cronSecret = Deno.env.get("CRON_SECRET");
  const cronSecretV2 = Deno.env.get("CRON_SECRET_V2");
  const authHeader = req.headers.get("Authorization") || "";
  const headerToken = authHeader.replace(/^Bearer\s+/i, "");
  const xCron = req.headers.get("x-cron-secret") || "";
  const candidates = [cronSecret, cronSecretV2].filter(Boolean) as string[];
  const okAuth = candidates.includes(headerToken) || candidates.includes(xCron);

  if (!okAuth) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // Période: derniers 5 jours, fin exclusive = aujourd'hui (UTC)
  const todayUtc = new Date(); // now UTC
  const endISO = toISODate(todayUtc);               // fin exclue = aujourd'hui (UTC)
  const startISO = toISODate(addDaysUTC(todayUtc, -4)); // 5 jours: J-4 .. J-1

  // Récupérer les profils ayant PRM + token
  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id, conso_prm, conso_token")
    .not("conso_prm", "is", null)
    .not("conso_token", "is", null)
    .limit(10000);

  if (profErr) {
    console.error("[refresh-conso] profiles error:", profErr.message);
    return new Response(JSON.stringify({ error: profErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  const errors: Array<{ user_id: string; message: string }> = [];

  for (const p of profiles || []) {
    processed++;
    const userId = p.id as string;
    const prm = String(p.conso_prm || "");
    const token = String(p.conso_token || "");

    if (!/^\d{14}$/.test(prm) || !token) {
      failed++;
      errors.push({ user_id: userId, message: "invalid prm/token" });
      continue;
    }

    const url = `https://conso.boris.sh/api/daily_consumption?prm=${encodeURIComponent(prm)}&start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`;

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "hellokeys-app v1",
          From: "contact@hellokeys.fr",
          Accept: "application/json",
        },
      });

      const text = await res.text();
      if (!res.ok) {
        failed++;
        errors.push({
          user_id: userId,
          message: `upstream ${res.status} ${text?.slice(0, 180) || ""}`,
        });
        continue;
      }

      let payload: unknown = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        payload = text || null;
      }

      const { error: upsertErr } = await supabase
        .from("conso_caches")
        .upsert(
          {
            user_id: userId,
            prm,
            type: "daily_consumption",
            start_date: startISO,
            end_date: endISO,
            data: payload,
          },
          { onConflict: "user_id,prm,type,start_date,end_date" }
        );

      if (upsertErr) {
        failed++;
        errors.push({ user_id: userId, message: `upsert error: ${upsertErr.message}` });
        continue;
      }

      succeeded++;
    } catch (e) {
      failed++;
      errors.push({ user_id: userId, message: String(e) });
    }
  }

  const summary = { processed, succeeded, failed, start: startISO, end: endISO, errors };
  console.log("[refresh-conso] summary:", summary);

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});