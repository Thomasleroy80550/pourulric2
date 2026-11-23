import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { storeBeyondLinked } from "./beyond.ts";

const reservationsEndpoint = "https://kbdjwnfpgwzbxskiaddg.supabase.co/functions/v1/owner-site-reservations";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class ReservationRequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function period(body: Record<string, unknown>) {
  if ((body.from && !validDate(body.from)) || (body.to && !validDate(body.to)) ||
      (body.from != null && typeof body.from !== "string") || (body.to != null && typeof body.to !== "string")) {
    throw new ReservationRequestError(400, "Les dates doivent être au format YYYY-MM-DD.");
  }
  const from = typeof body.from === "string" && body.from ? body.from : null;
  const to = typeof body.to === "string" && body.to ? body.to : null;
  if (from && to && from >= to) throw new ReservationRequestError(400, "La date de fin exclusive doit être après la date de début.");
  return { from, to, key: `${from || ""}:${to || ""}` };
}
async function source(db: SupabaseClient, assignmentId: unknown, userId: string, isAdmin: boolean) {
  if (typeof assignmentId !== "string" || !uuid.test(assignmentId)) throw new ReservationRequestError(400, "Attribution de logement invalide.");
  let query = db.from("channel_property_assignments").select("*").eq("id", assignmentId);
  if (!isAdmin) query = query.eq("client_profile_id", userId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) throw new ReservationRequestError(403, "Ce logement n’est pas attribué à votre profil.");
  return data;
}
function jobResponse(job: Record<string, unknown>) {
  return { job_id: job.id, status: job.status, pages: job.page_count, reservation_count: job.reservation_count };
}

async function fetchPage(job: Record<string, unknown>) {
  const key = Deno.env.get("OWNER_SITE_PROPERTIES_API_KEY")?.trim();
  if (!key) throw new ReservationRequestError(503, "La clé privée du channel n’est pas configurée sur le serveur.");
  const url = new URL(reservationsEndpoint);
  url.searchParams.set("property_id", String(job.property_id));
  url.searchParams.set("limit", "100");
  if (job.next_cursor) url.searchParams.set("cursor", String(job.next_cursor));
  if (job.sync_from) url.searchParams.set("from", String(job.sync_from));
  if (job.sync_to) url.searchParams.set("to", String(job.sync_to));
  const response = await fetch(url, {
    method: "GET", headers: { "x-api-key": key, Accept: "application/json" }, signal: AbortSignal.timeout(20000),
  });
  console.info("[owner-channel-proxy] reservations upstream response", { status: response.status, propertyId: job.property_id });
  if (response.status === 401) throw new ReservationRequestError(401, "Clé privée du channel invalide ou expirée.");
  if (response.status === 404) throw new ReservationRequestError(404, "Logement absent ou supprimé. Le dernier import est conservé.");
  if (response.status === 429) throw new ReservationRequestError(429, "Quota commun du channel atteint. Réessayez dans 60 secondes ; le dernier import reste disponible.");
  if (!response.ok) throw new ReservationRequestError(502, "API réservations indisponible. Aucune donnée importée n’a été supprimée.");
  const data = await response.json();
  if (typeof data.property_id !== "string" || data.property_id.toLowerCase() !== job.property_id ||
      data.agency_id !== job.agency_id || data.environment !== job.environment) {
    throw new ReservationRequestError(403, "Le logement, l’agence ou l’environnement ne correspond pas à l’attribution. Import refusé.");
  }
  if (!Array.isArray(data.reservations) || data.reservations.length > 100 ||
      !(data.next_cursor === null || (typeof data.next_cursor === "string" && data.next_cursor.length > 0 && data.next_cursor.length <= 4096)) ||
      typeof data.fetched_at !== "string" || Number.isNaN(Date.parse(data.fetched_at)) ||
      data.reservations.some((record: Record<string, unknown>) => !record || typeof record !== "object" || Array.isArray(record) ||
        typeof record.id !== "string" || !/^(np_|hist_|direct_).+/.test(record.id) || record.id.length > 512 ||
        (record.property_id != null && (typeof record.property_id !== "string" || record.property_id.toLowerCase() !== job.property_id)))) {
    throw new ReservationRequestError(502, "Réponse réservations non conforme au contrat API. Le dernier import est conservé.");
  }
  const unique = new Map<string, Record<string, unknown>>();
  data.reservations.forEach((record: Record<string, unknown>) => unique.set(String(record.id), record));
  // Only field names are logged, never guest values or the private key.
  console.info("[owner-channel-proxy] reservations page validated", {
    count: unique.size, hasNextPage: data.next_cursor !== null,
    fields: data.reservations[0] ? Object.keys(data.reservations[0]) : [],
  });
  return { reservations: Array.from(unique.values()), next_cursor: data.next_cursor, fetched_at: data.fetched_at };
}

export async function handleReservations(
  db: SupabaseClient,
  body: Record<string, unknown>,
  userId: string,
  isAdmin: boolean,
  propertyDetail: (params: Record<string, string>) => Promise<{ agency_id: string; environment: string; properties: { id: string }[] }>,
) {
  if (body.action === "reservation_sources") {
    if (body.cursor != null && (typeof body.cursor !== "string" || !uuid.test(body.cursor))) throw new ReservationRequestError(400, "Curseur invalide.");
    let query = db.from("channel_property_assignments").select("*, profiles(first_name,last_name), user_rooms(id,room_id,room_name)").order("id").limit(100);
    if (!isAdmin) query = query.eq("client_profile_id", userId);
    if (body.cursor) query = query.gt("id", body.cursor);
    const { data, error } = await query;
    if (error) throw error;
    return { sources: data, next_cursor: data.length === 100 ? data[99].id : null };
  }
  if (body.action === "reservation_sync_page") {
    if (typeof body.job_id !== "string" || !uuid.test(body.job_id)) throw new ReservationRequestError(400, "Identifiant d’import invalide.");
    const { data: job, error } = await db.from("channel_reservation_sync_jobs").select("*").eq("id", body.job_id).eq("requested_by", userId).maybeSingle();
    if (error) throw error;
    if (!job) throw new ReservationRequestError(404, "Import introuvable.");
    const link = await source(db, job.assignment_id, userId, isAdmin);
    if (link.property_id !== job.property_id || link.agency_id !== job.agency_id || link.environment !== job.environment) {
      throw new ReservationRequestError(403, "L’attribution a changé. Import refusé.");
    }
    if (job.status === "completed") return jobResponse(job);
    const page = await fetchPage(job);
    const { data: progress, error: stageError } = await db.rpc("stage_channel_reservation_page", {
      p_job_id: job.id, p_user_id: userId, p_expected_cursor: job.next_cursor,
      p_next_cursor: page.next_cursor, p_reservations: page.reservations, p_fetched_at: page.fetched_at,
    });
    if (stageError) {
      console.error("[owner-channel-proxy] reservation staging failed", { jobId: job.id, message: stageError.message });
      throw new ReservationRequestError(409, "L’import n’a pas été publié (conflit ou réponse incohérente). Le dernier import est conservé ; recommencez la synchronisation.");
    }
    return progress;
  }
  const link = await source(db, body.assignment_id, userId, isAdmin);
  const dates = period(body);
  if (body.action === "reservation_cache") {
    if (body.cursor != null && (typeof body.cursor !== "string" || body.cursor.length > 512)) throw new ReservationRequestError(400, "Curseur invalide.");
    const { data: scope, error: scopeError } = await db.from("channel_reservation_scopes").select("*")
      .eq("property_id", link.property_id).eq("agency_id", link.agency_id).eq("environment", link.environment).eq("scope_key", dates.key).maybeSingle();
    if (scopeError) throw scopeError;
    if (!scope) return { reservations: [], next_cursor: null, import: null };
    let query = db.from("channel_reservation_scope_entries").select("reservation_id,is_active,updated_at,channel_reservations(payload,source_fetched_at,imported_at)")
      .eq("scope_id", scope.id).order("reservation_id").limit(100);
    if (body.include_inactive !== true) query = query.eq("is_active", true);
    if (body.cursor) query = query.gt("reservation_id", body.cursor);
    const { data, error } = await query;
    if (error) throw error;
    return { reservations: data, next_cursor: data.length === 100 ? data[99].reservation_id : null, import: scope };
  }
  if (body.action === "reservation_sync_start") {
    if (body.automatic === true) {
      const { data: recent, error } = await db.from("channel_reservation_scopes").select("imported_at")
        .eq("property_id", link.property_id).eq("agency_id", link.agency_id).eq("environment", link.environment)
        .eq("scope_key", dates.key).maybeSingle();
      if (error) throw error;
      if (recent && Date.now() - Date.parse(recent.imported_at) < 5 * 60 * 1000) {
        return { job_id: "", status: "completed", pages: 0, reservation_count: 0 };
      }
    }
    const detail = await propertyDetail({ property_id: link.property_id });
    if (detail.agency_id !== link.agency_id || detail.environment !== link.environment ||
        !detail.properties.some(property => property.id.toLowerCase() === link.property_id)) {
      throw new ReservationRequestError(403, "Le logement ou le périmètre de la clé ne correspond plus à l’attribution.");
    }
    const property = detail.properties.find(property => property.id.toLowerCase() === link.property_id) as Record<string, unknown>;
    const propertyName = [property.name, property.title, property.property_name].find(value => typeof value === "string" && value.trim());
    if (propertyName && propertyName !== link.property_name) {
      const { error } = await db.from("channel_property_assignments").update({ property_name: propertyName }).eq("id", link.id);
      if (error) throw error;
    }
    if (typeof property.beyond_linked === "boolean" && property.beyond_linked !== link.beyond_linked) {
      await storeBeyondLinked(db, link, [{ id: link.property_id, beyond_linked: property.beyond_linked }]);
    }
    if (body.restart === true) {
      const { error } = await db.from("channel_reservation_sync_jobs").delete().eq("assignment_id", link.id)
        .eq("requested_by", userId).eq("scope_key", dates.key).eq("status", "syncing");
      if (error) throw error;
    } else {
      const { data: pending, error } = await db.from("channel_reservation_sync_jobs").select("*")
        .eq("assignment_id", link.id).eq("requested_by", userId).eq("scope_key", dates.key).eq("status", "syncing")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      if (pending) return jobResponse(pending);
    }
    const { data: job, error } = await db.from("channel_reservation_sync_jobs").insert({
      assignment_id: link.id, requested_by: userId, property_id: link.property_id, agency_id: link.agency_id,
      environment: link.environment, scope_key: dates.key, sync_from: dates.from, sync_to: dates.to,
    }).select("*").single();
    if (error) throw error;
    return jobResponse(job);
  }
  throw new ReservationRequestError(400, "Action réservations inconnue.");
}
