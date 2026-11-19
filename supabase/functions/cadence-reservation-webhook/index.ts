import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cadence-timestamp, x-cadence-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const encoder = new TextEncoder();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const eventTypes = new Set(["reservation.created", "reservation.modified", "reservation.cancelled"]);
const maxBodyBytes = 65536;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function validText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength &&
    value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value);
}

async function readBody(req: Request): Promise<Uint8Array | null> {
  if (!req.body) return new Uint8Array();
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBodyBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return json({ error: "content_type_must_be_application_json" }, 415);
  }

  const secret = Deno.env.get("CADENCE_WEBHOOK_SIGNING_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || !supabaseUrl || !serviceKey) {
    console.error("[cadence-reservation-webhook] missing server configuration");
    return json({ error: "webhook_not_configured" }, 503);
  }

  const timestamp = req.headers.get("x-cadence-timestamp") ?? "";
  const signature = req.headers.get("x-cadence-signature") ?? "";
  if (!/^[0-9]{10}$/.test(timestamp) || !/^sha256=[0-9a-f]{64}$/.test(signature)) {
    return json({ error: "invalid_signature_headers" }, 401);
  }
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 300) {
    return json({ error: "timestamp_outside_tolerance" }, 401);
  }

  try {
    const bodyBytes = await readBody(req);
    if (bodyBytes === null) return json({ error: "payload_too_large" }, 413);
    const prefix = encoder.encode(`${timestamp}.`);
    const signedBytes = new Uint8Array(prefix.length + bodyBytes.length);
    signedBytes.set(prefix);
    signedBytes.set(bodyBytes, prefix.length);
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"],
    );
    const signatureBytes = Uint8Array.from(
      signature.slice(7).match(/.{2}/g)!, (pair) => parseInt(pair, 16),
    );
    // Web Crypto verifies the MAC; never compare secret-dependent strings ourselves.
    if (!await crypto.subtle.verify("HMAC", key, signatureBytes, signedBytes)) {
      return json({ error: "invalid_signature" }, 401);
    }
    // Recheck after reading the body to prevent a slow request extending the replay window.
    if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 300) {
      return json({ error: "timestamp_outside_tolerance" }, 401);
    }

    let body: Record<string, unknown>;
    try {
      const parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bodyBytes));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return json({ error: "invalid_payload" }, 400);
      }
      body = parsed;
    } catch {
      return json({ error: "invalid_json" }, 400);
    }
    if (typeof body.event_id !== "string" || !uuid.test(body.event_id) ||
      typeof body.property_id !== "string" || !uuid.test(body.property_id) ||
      typeof body.event_type !== "string" || !eventTypes.has(body.event_type) ||
      !validText(body.agency_id, 200) || !validText(body.environment, 100) ||
      !validText(body.reservation_id, 200)) {
      return json({ error: "invalid_payload" }, 400);
    }

    const digest = await crypto.subtle.digest("SHA-256", bodyBytes);
    const payloadHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.rpc("record_cadence_reservation_event", {
      p_event_id: body.event_id,
      p_event_type: body.event_type,
      p_property_id: body.property_id,
      p_agency_id: body.agency_id,
      p_environment: body.environment,
      p_reservation_id: body.reservation_id,
      p_payload_sha256: payloadHash,
    });
    if (error) {
      console.error("[cadence-reservation-webhook] durable transaction failed", { code: error.code });
      return json({ error: "persistence_failed" }, 503);
    }
    if (data?.status === "conflict") return json({ error: "event_id_payload_conflict", event_id: body.event_id }, 409);
    if (!data || !["recorded", "duplicate"].includes(data.status)) {
      console.error("[cadence-reservation-webhook] unexpected transaction response");
      return json({ error: "persistence_failed" }, 503);
    }
    console.info("[cadence-reservation-webhook] event committed", {
      eventId: data.event_id, status: data.status, notifications: data.notification_count,
    });
    return json({ success: true, ...data });
  } catch {
    console.error("[cadence-reservation-webhook] request failed");
    return json({ error: "request_failed" }, 503);
  }
});
