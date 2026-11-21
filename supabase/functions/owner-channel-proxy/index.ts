import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { assignOnboardingBatch, defaultRoomIds, loadOnboardingContext } from "./onboarding.ts";
import { handleReservations, ReservationRequestError } from "./reservations.ts";
import { ChannelFeatureError, handleChannelFeatures } from "./features.ts";

const endpoint = "https://kbdjwnfpgwzbxskiaddg.supabase.co/functions/v1/owner-site-properties";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class RequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...(status === 429 ? { "Retry-After": "60" } : {}) },
  });
}

async function upstream(params: Record<string, string>) {
  const key = Deno.env.get("OWNER_SITE_PROPERTIES_API_KEY")?.trim();
  if (!key) throw new RequestError(503, "Configurez le secret OWNER_SITE_PROPERTIES_API_KEY dans Supabase.");
  const url = new URL(endpoint);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const response = await fetch(url, {
    method: "GET", headers: { "x-api-key": key, Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });
  console.info("[owner-channel-proxy] upstream response", { status: response.status, detail: Boolean(params.property_id) });
  if (response.status === 401) throw new RequestError(401, "La clé du nouveau channel est invalide ou expirée.");
  if (response.status === 404) throw new RequestError(404, "Logement absent ou supprimé.");
  if (response.status === 429) throw new RequestError(429, "Quota du channel atteint. Réessayez après 60 secondes.");
  if (!response.ok) throw new RequestError(502, "Le nouveau channel est indisponible.");
  const data = await response.json();
  if (!Array.isArray(data.properties) || typeof data.agency_id !== "string" || typeof data.environment !== "string" ||
      !(data.next_cursor == null || typeof data.next_cursor === "string") ||
      data.properties.some((p: Record<string, unknown>) => !p || typeof p.id !== "string" || !uuid.test(p.id))) {
    throw new RequestError(502, "Réponse du channel non conforme au contrat API.");
  }
  return { properties: data.properties, agency_id: data.agency_id, environment: data.environment, next_cursor: data.next_cursor ?? null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);
  try {
    const authorization = req.headers.get("Authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) return json({ error: "Authentification requise." }, 401);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: auth, error: authError } = await db.auth.getUser(authorization.slice(7));
    if (authError || !auth.user) return json({ error: "Session invalide." }, 401);
    const { data: profile, error: profileError } = await db.from("profiles").select("role,is_banned,is_contract_terminated").eq("id", auth.user.id).single();
    if (profileError || !profile || profile.is_banned || profile.is_contract_terminated) return json({ error: "Accès interdit." }, 403);
    const body = await req.json().catch(() => null);
    if (!body || typeof body.action !== "string") return json({ error: "Action requise." }, 400);
    const isAdmin = profile.role === "admin";
    const adminActions = ["catalog", "property_detail", "assignments", "assign", "unassign", "link_room", "onboarding_context", "assign_batch"];
    if (adminActions.includes(body.action) && !isAdmin) return json({ error: "Accès réservé aux administrateurs." }, 403);

    if (["reservation_sources", "reservation_cache", "reservation_sync_start", "reservation_sync_page"].includes(body.action)) {
      return json(await handleReservations(db, body, auth.user.id, isAdmin, upstream));
    }
    if (["calendar", "blocks", "block_create", "cleaning_list", "cleaning_detail", "reviews_cache", "reviews_sync_start", "reviews_sync_page"].includes(body.action)) {
      return json(await handleChannelFeatures(db, body, auth.user.id, isAdmin));
    }
    if (body.action === "onboarding_context") return json(await loadOnboardingContext(db));
    if (body.action === "assign_batch") {
      const result = await assignOnboardingBatch(db, body, upstream);
      return json(result.body, result.status);
    }
    if (body.action === "catalog") {
      if (body.cursor != null && (typeof body.cursor !== "string" || body.cursor.length > 4096)) return json({ error: "Curseur invalide." }, 400);
      return json(await upstream({ limit: "100", ...(body.cursor ? { cursor: body.cursor } : {}) }));
    }
    if (body.action === "property_detail") {
      if (typeof body.property_id !== "string" || !uuid.test(body.property_id)) return json({ error: "UUID de logement invalide." }, 400);
      const detail = await upstream({ property_id: body.property_id });
      const property = detail.properties.find((item: { id: string }) => item.id.toLowerCase() === body.property_id.toLowerCase());
      if (property) console.info("[owner-channel-proxy] property detail fields", { propertyId: body.property_id, fields: Object.keys(property) });
      return json(detail);
    }
    if (["assignments", "assign"].includes(body.action) && (typeof body.client_profile_id !== "string" || !uuid.test(body.client_profile_id))) {
      return json({ error: "Identifiant de profil invalide." }, 400);
    }
    if (body.action === "assignments") {
      const { data, error } = await db.from("channel_property_assignments").select("*").eq("client_profile_id", body.client_profile_id).order("created_at");
      if (error) throw error;
      return json({ assignments: data });
    }
    if (body.action === "assign") {
      if (typeof body.property_id !== "string" || !uuid.test(body.property_id)) return json({ error: "UUID de logement invalide." }, 400);
      const { data: client, error: clientError } = await db.from("profiles").select("id").eq("id", body.client_profile_id).maybeSingle();
      if (clientError) throw clientError;
      if (!client) return json({ error: "Profil introuvable." }, 404);
      const detail = await upstream({ property_id: body.property_id });
      if (!detail.properties.some((p: { id: string }) => p.id.toLowerCase() === body.property_id.toLowerCase())) return json({ error: "Logement introuvable." }, 404);
      const roomIds = await defaultRoomIds(db, [body.client_profile_id]);
      const { error } = await db.from("channel_property_assignments").upsert({
        client_profile_id: body.client_profile_id, property_id: body.property_id,
        agency_id: detail.agency_id, environment: detail.environment,
        user_room_id: roomIds.get(body.client_profile_id) ?? null,
      }, { onConflict: "client_profile_id,property_id,agency_id,environment", ignoreDuplicates: true });
      if (error) throw error;
      console.info("[owner-channel-proxy] property assigned", { profileId: body.client_profile_id, propertyId: body.property_id });
      return json({ success: true });
    }
    if (body.action === "link_room") {
      if (typeof body.assignment_id !== "string" || !uuid.test(body.assignment_id)) return json({ error: "Attribution invalide." }, 400);
      if (body.user_room_id !== null && (typeof body.user_room_id !== "string" || !uuid.test(body.user_room_id))) return json({ error: "Logement local invalide." }, 400);
      const { data: assignment, error: assignmentError } = await db.from("channel_property_assignments").select("id,client_profile_id").eq("id", body.assignment_id).maybeSingle();
      if (assignmentError) throw assignmentError;
      if (!assignment) return json({ error: "Attribution introuvable." }, 404);
      if (body.user_room_id) {
        const { data: room, error: roomError } = await db.from("user_rooms").select("id,user_id").eq("id", body.user_room_id).maybeSingle();
        if (roomError) throw roomError;
        if (!room || room.user_id !== assignment.client_profile_id) return json({ error: "Ce logement local n’appartient pas au profil attribué." }, 400);
      }
      const { error } = await db.from("channel_property_assignments").update({ user_room_id: body.user_room_id }).eq("id", body.assignment_id);
      if (error) throw error;
      return json({ success: true });
    }
    if (body.action === "unassign") {
      if (typeof body.assignment_id !== "string" || !uuid.test(body.assignment_id)) return json({ error: "Attribution invalide." }, 400);
      const { error } = await db.from("channel_property_assignments").delete().eq("id", body.assignment_id);
      if (error) throw error;
      return json({ success: true });
    }
    if (body.action === "mine") {
      if (body.cursor != null && (typeof body.cursor !== "string" || !uuid.test(body.cursor))) return json({ error: "Curseur invalide." }, 400);
      let query = db.from("channel_property_assignments").select("*").eq("client_profile_id", auth.user.id).order("id").limit(10);
      if (body.cursor) query = query.gt("id", body.cursor);
      const { data: links, error } = await query;
      if (error) throw error;
      const properties: Record<string, unknown>[] = [];
      // Never request the global catalog for an owner, even to filter it later.
      for (const link of links ?? []) {
        try {
          const detail = await upstream({ property_id: link.property_id });
          if (detail.agency_id === link.agency_id && detail.environment === link.environment) {
            const property = detail.properties.find((p: { id: string }) => p.id.toLowerCase() === link.property_id.toLowerCase());
            if (property) {
              console.info("[owner-channel-proxy] property detail fields", { propertyId: link.property_id, fields: Object.keys(property) });
              properties.push({
                ...property,
                agency_id: detail.agency_id,
                environment: detail.environment,
                assignment_id: link.id,
                user_room_id: link.user_room_id,
              });
            }
          }
        } catch (error) {
          if (error instanceof RequestError && error.status === 404) continue;
          throw error;
        }
      }
      return json({ properties, next_cursor: links?.length === 10 ? links[9].id : null });
    }
    return json({ error: "Action inconnue." }, 400);
  } catch (error) {
    if (error instanceof RequestError || error instanceof ReservationRequestError || error instanceof ChannelFeatureError) return json({ error: error.message }, error.status);
    console.error("[owner-channel-proxy] request failed", { message: error instanceof Error ? error.message : "Unknown error" });
    return json({ error: "Impossible de traiter la demande du channel." }, 500);
  }
});
