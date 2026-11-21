import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const baseUrl = "https://kbdjwnfpgwzbxskiaddg.supabase.co/functions/v1/";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const signaturePattern = /^[0-9a-f]{64}$/;
const availabilityValues = new Set(["booked", "blocked", "available", "unknown"]);
const blockStatuses = new Set(["active", "owner_pending"]);
const cleaningStatuses = new Set(["todo", "in_progress", "done"]);
const photoPhases = new Set(["before", "after"]);
const pricingSources = new Set(["owner", "cadence", "beyond", "default"]);

export class ChannelFeatureError extends Error {
  constructor(public status: number, message: string, public retryAfter = 0) {
    super(message);
  }
}

interface Assignment {
  id: string;
  client_profile_id: string;
  property_id: string;
  agency_id: string;
  environment: string;
}

function validUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function dayCount(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

function addDays(date: string, days: number) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function optionalDate(body: Record<string, unknown>, name: string) {
  const value = body[name];
  if (value == null || value === "") return null;
  if (!validDate(value)) throw new ChannelFeatureError(400, `${name} doit être une date YYYY-MM-DD valide.`);
  return value;
}

function optionalLimit(body: Record<string, unknown>, fallback = 100) {
  const value = body.limit;
  if (value == null) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 100) {
    throw new ChannelFeatureError(400, "limit : 1 à 100");
  }
  return value;
}

function optionalUuid(body: Record<string, unknown>, name: string) {
  const value = body[name];
  if (value == null || value === "") return null;
  if (!validUuid(value)) throw new ChannelFeatureError(400, `${name} UUID invalide.`);
  return value.toLowerCase();
}

async function assignmentForRead(
  db: SupabaseClient,
  assignmentId: unknown,
  userId: string,
  isAdmin: boolean,
): Promise<Assignment> {
  if (!validUuid(assignmentId)) throw new ChannelFeatureError(400, "Attribution de logement invalide.");
  let query = db.from("channel_property_assignments").select("id,client_profile_id,property_id,agency_id,environment").eq("id", assignmentId);
  if (!isAdmin) query = query.eq("client_profile_id", userId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) throw new ChannelFeatureError(403, "Ce logement n’est pas attribué à votre profil.");
  return data as Assignment;
}

async function assignmentForOwnerWrite(db: SupabaseClient, assignmentId: unknown, userId: string): Promise<Assignment> {
  if (!validUuid(assignmentId)) throw new ChannelFeatureError(400, "Attribution de logement invalide.");
  const { data, error } = await db
    .from("channel_property_assignments")
    .select("id,client_profile_id,property_id,agency_id,environment")
    .eq("id", assignmentId)
    .eq("client_profile_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ChannelFeatureError(403, "Seul le profil actuellement attribué peut effectuer cette modification.");
  return data as Assignment;
}

function sameIdentity(data: Record<string, unknown>, assignment: Assignment, requireAgency: boolean) {
  const propertyId = typeof data.property_id === "string" ? data.property_id.toLowerCase() : "";
  if (propertyId !== assignment.property_id.toLowerCase()) return false;
  if (!requireAgency) return true;
  return data.agency_id === assignment.agency_id && data.environment === assignment.environment;
}

async function callCadence(
  functionName: string,
  options: { method?: "GET" | "POST"; params?: Record<string, string | number>; body?: Record<string, unknown>; idempotencyKey?: string },
) {
  const key = Deno.env.get("OWNER_SITE_PROPERTIES_API_KEY")?.trim();
  if (!key) throw new ChannelFeatureError(503, "La clé privée du channel n’est pas configurée sur le serveur.");
  const url = new URL(functionName, baseUrl);
  for (const [name, value] of Object.entries(options.params ?? {})) url.searchParams.set(name, String(value));
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        "x-api-key": key,
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new ChannelFeatureError(502, "Opération indisponible, réessayez ultérieurement");
  }
  console.info("[owner-channel-proxy] cadence feature response", { functionName, status: response.status });
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) {
    const message = payload && typeof payload.error === "string" && payload.error.length <= 500
      ? payload.error
      : "Opération indisponible, réessayez ultérieurement";
    const retryHeader = response.headers.get("Retry-After");
    const retryAfter = response.status === 429 ? Math.max(1, Number.parseInt(retryHeader ?? "60", 10) || 60) : 0;
    throw new ChannelFeatureError(response.status, message, retryAfter);
  }
  if (!payload || Array.isArray(payload)) throw new ChannelFeatureError(502, "Réponse Cadence non conforme au contrat API.");
  return payload;
}

function validateImageList(value: unknown): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) {
    throw new ChannelFeatureError(400, "images : liste ordonnée complète des URL des photos actuelles (1 à 100, sans doublon)");
  }
  const images = value.map(item => {
    if (typeof item !== "string" || !/^https?:\/\//i.test(item) || item.length > 4096) {
      throw new ChannelFeatureError(400, "images : liste ordonnée complète des URL des photos actuelles (1 à 100, sans doublon)");
    }
    return item;
  });
  if (new Set(images).size !== images.length) {
    throw new ChannelFeatureError(400, "images : liste ordonnée complète des URL des photos actuelles (1 à 100, sans doublon)");
  }
  return images;
}

async function currentPropertyImages(assignment: Assignment): Promise<string[]> {
  const payload = await callCadence("owner-site-properties", { params: { property_id: assignment.property_id } });
  if (payload.agency_id !== assignment.agency_id || payload.environment !== assignment.environment || !Array.isArray(payload.properties)) {
    throw new ChannelFeatureError(409, "L’environnement ou l’agence du logement ne correspond plus à l’attribution.");
  }
  const property = payload.properties.find((item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const id = (item as Record<string, unknown>).id;
    return typeof id === "string" && id.toLowerCase() === assignment.property_id.toLowerCase();
  }) as Record<string, unknown> | undefined;
  if (!property) throw new ChannelFeatureError(404, "Logement absent ou supprimé.");
  try {
    return validateImageList(property.images);
  } catch {
    throw new ChannelFeatureError(409, "Ce logement n’a aucune photo à réorganiser");
  }
}

function samePhotoSet(current: string[], requested: string[]) {
  return current.length === requested.length && new Set(current).size === current.length && current.every(url => requested.includes(url));
}

function parisToday() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function parisDatePlusYears(years: number) {
  const [year, month, day] = parisToday().split("-").map(Number);
  const date = new Date(Date.UTC(year + years, month - 1, day));
  return date.toISOString().slice(0, 10);
}

function pricingError(index: number, message: string): never {
  throw new ChannelFeatureError(400, `periods[${index}] : ${message}`);
}

function validatePricingPeriods(value: unknown) {
  if (!Array.isArray(value) || value.length > 500) {
    throw new ChannelFeatureError(400, "periods : liste complète des périodes tarifaires du propriétaire attendue");
  }
  const today = parisToday();
  const maxStart = parisDatePlusYears(3);
  const periods = value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) pricingError(index, "objet de période invalide");
    const period = item as Record<string, unknown>;
    if (!validDate(period.start_date) || !validDate(period.end_date)) pricingError(index, "dates YYYY-MM-DD valides requises");
    if (period.start_date > period.end_date) pricingError(index, "start_date doit être avant ou égale à end_date");
    if (period.end_date < today || period.start_date > maxStart) pricingError(index, "Périodes à venir uniquement, avec début dans les 3 ans");
    if (typeof period.price !== "number" || !Number.isFinite(period.price) || period.price < 0 || period.price > 100000) pricingError(index, "price doit être un prix par nuit entre 0 et 100 000");
    const minStay = period.min_stay == null ? 1 : period.min_stay;
    if (typeof minStay !== "number" || !Number.isInteger(minStay) || minStay < 1 || minStay > 365) pricingError(index, "min_stay doit être un entier entre 1 et 365");
    if (period.max_stay != null && (typeof period.max_stay !== "number" || !Number.isSafeInteger(period.max_stay) || period.max_stay < minStay)) pricingError(index, "max_stay doit être un entier supérieur ou égal à min_stay");
    if (period.label != null && (typeof period.label !== "string" || period.label.trim().length > 60)) pricingError(index, "label : 60 caractères maximum");
    return {
      start_date: period.start_date,
      end_date: period.end_date,
      price: period.price,
      min_stay: minStay,
      ...(period.max_stay != null ? { max_stay: period.max_stay } : {}),
      ...(typeof period.label === "string" && period.label.trim() ? { label: period.label.trim() } : {}),
    };
  }).sort((a, b) => a.start_date.localeCompare(b.start_date) || a.end_date.localeCompare(b.end_date));
  for (let index = 1; index < periods.length; index += 1) {
    if (periods[index].start_date <= periods[index - 1].end_date) {
      throw new ChannelFeatureError(400, "Deux périodes se chevauchent. Corrigez la liste complète avant envoi.");
    }
  }
  return periods;
}

function validatePricingRead(payload: Record<string, unknown>, assignment: Assignment) {
  if (typeof payload.property_id !== "string" || payload.property_id.toLowerCase() !== assignment.property_id.toLowerCase() ||
      typeof payload.currency !== "string" || !payload.currency.trim() || payload.currency.length > 10 ||
      typeof payload.base_price !== "number" || !Number.isFinite(payload.base_price) ||
      typeof payload.beyond_linked !== "boolean" || !Array.isArray(payload.periods) ||
      typeof payload.periods_updated_at !== "string" || Number.isNaN(Date.parse(payload.periods_updated_at))) {
    throw new ChannelFeatureError(502, "Réponse de lecture des prix non conforme au contrat API.");
  }
  const periods = payload.periods.map((item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new ChannelFeatureError(502, "Réponse de lecture des prix non conforme au contrat API.");
    const period = item as Record<string, unknown>;
    const nullableInteger = (value: unknown) => value === null || (typeof value === "number" && Number.isInteger(value) && value >= 0);
    if (typeof period.id !== "string" || !period.id.trim() || period.id.length > 200 ||
        typeof period.source !== "string" || !pricingSources.has(period.source) ||
        (period.label != null && (typeof period.label !== "string" || period.label.length > 500)) ||
        !validDate(period.start_date) || !validDate(period.end_date) || period.start_date > period.end_date ||
        typeof period.price !== "number" || !Number.isFinite(period.price) || period.price < 0 ||
        !nullableInteger(period.min_stay) || !nullableInteger(period.max_stay)) {
      throw new ChannelFeatureError(502, "Réponse de lecture des prix non conforme au contrat API.");
    }
    return {
      id: period.id,
      source: period.source,
      label: period.label ?? null,
      start_date: period.start_date,
      end_date: period.end_date,
      price: period.price,
      min_stay: period.min_stay,
      max_stay: period.max_stay,
    };
  });
  return {
    property_id: assignment.property_id,
    currency: payload.currency,
    base_price: payload.base_price,
    beyond_linked: payload.beyond_linked,
    periods,
    periods_updated_at: payload.periods_updated_at,
  };
}

function validatePricingResponse(payload: Record<string, unknown>, assignment: Assignment) {
  if (typeof payload.property_id !== "string" || payload.property_id.toLowerCase() !== assignment.property_id.toLowerCase() ||
      typeof payload.periods_applied !== "number" || !Number.isInteger(payload.periods_applied) || payload.periods_applied < 0 ||
      typeof payload.pushed_to_nextpax !== "boolean" || !Array.isArray(payload.periods)) {
    throw new ChannelFeatureError(502, "Réponse prix non conforme au contrat API.");
  }
  const periods = payload.periods.map((item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new ChannelFeatureError(502, "Réponse prix non conforme au contrat API.");
    const period = item as Record<string, unknown>;
    if (typeof period.id !== "string" || !period.id.trim() || !validDate(period.start_date) || !validDate(period.end_date) ||
        period.start_date > period.end_date || typeof period.price !== "number" || !Number.isFinite(period.price) ||
        typeof period.min_stay !== "number" || !Number.isInteger(period.min_stay) ||
        (period.max_stay != null && (typeof period.max_stay !== "number" || !Number.isInteger(period.max_stay))) ||
        (period.label != null && typeof period.label !== "string")) {
      throw new ChannelFeatureError(502, "Réponse prix non conforme au contrat API.");
    }
    return period;
  });
  return { property_id: assignment.property_id, periods_applied: payload.periods_applied, periods, pushed_to_nextpax: payload.pushed_to_nextpax };
}

function validateCalendar(payload: Record<string, unknown>, assignment: Assignment) {
  if (payload.version !== "1" || !sameIdentity(payload, assignment, true) ||
      !validDate(payload.from) || !validDate(payload.to) || payload.from >= payload.to ||
      dayCount(payload.from, payload.to) > 366 ||
      !Array.isArray(payload.days) || payload.days.length !== dayCount(payload.from, payload.to) ||
      typeof payload.currency !== "string" || payload.currency.length > 10 ||
      typeof payload.fetched_at !== "string" || Number.isNaN(Date.parse(payload.fetched_at))) {
    throw new ChannelFeatureError(502, "Réponse calendrier non conforme au contrat API.");
  }
  const days = payload.days.map((day, index) => {
    if (!day || typeof day !== "object" || Array.isArray(day)) throw new ChannelFeatureError(502, "Réponse calendrier non conforme au contrat API.");
    const item = day as Record<string, unknown>;
    const expectedDate = addDays(payload.from as string, index);
    const validNullableInteger = (value: unknown) => value === null || (typeof value === "number" && Number.isInteger(value) && value >= 0);
    const validNullableBoolean = (value: unknown) => value === null || typeof value === "boolean";
    if (item.date !== expectedDate ||
        !(item.price === null || (typeof item.price === "number" && Number.isFinite(item.price) && item.price >= 0)) ||
        typeof item.availability !== "string" || !availabilityValues.has(item.availability) ||
        !validNullableInteger(item.quantity) || !validNullableInteger(item.min_stay) || !validNullableInteger(item.max_stay) ||
        !validNullableBoolean(item.arrivals_allowed) || !validNullableBoolean(item.departures_allowed)) {
      throw new ChannelFeatureError(502, "Réponse calendrier non conforme au contrat API.");
    }
    return {
      date: item.date,
      price: item.price,
      availability: item.availability,
      quantity: item.quantity,
      min_stay: item.min_stay,
      max_stay: item.max_stay,
      arrivals_allowed: item.arrivals_allowed,
      departures_allowed: item.departures_allowed,
    };
  });
  return {
    version: "1",
    property_id: assignment.property_id,
    agency_id: assignment.agency_id,
    environment: assignment.environment,
    currency: payload.currency,
    from: payload.from,
    to: payload.to,
    days,
    prices_source: typeof payload.prices_source === "string" ? payload.prices_source : null,
    prices_updated_at: typeof payload.prices_updated_at === "string" ? payload.prices_updated_at : null,
    availability_source: typeof payload.availability_source === "string" ? payload.availability_source : null,
    fetched_at: payload.fetched_at,
  };
}

function validateBlock(value: unknown, assignment: Assignment) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ChannelFeatureError(502, "Réponse blocage non conforme au contrat API.");
  const block = value as Record<string, unknown>;
  if (!validUuid(block.id) || !validDate(block.check_in) || !validDate(block.check_out) ||
      block.check_in >= block.check_out || typeof block.status !== "string" || !blockStatuses.has(block.status) ||
      typeof block.cleaning_requested !== "boolean") {
    throw new ChannelFeatureError(502, "Réponse blocage non conforme au contrat API.");
  }
  if (block.property_id != null && (typeof block.property_id !== "string" || block.property_id.toLowerCase() !== assignment.property_id.toLowerCase())) {
    throw new ChannelFeatureError(502, "Réponse blocage non conforme au contrat API.");
  }
  return {
    id: block.id.toLowerCase(),
    check_in: block.check_in,
    check_out: block.check_out,
    status: block.status,
    cleaning_requested: block.cleaning_requested,
  };
}

function validateIntervention(value: unknown, assignment: Assignment) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ChannelFeatureError(502, "Réponse ménage non conforme au contrat API.");
  const item = value as Record<string, unknown>;
  const validNullableTimestamp = (timestamp: unknown) => timestamp === null || (typeof timestamp === "string" && !Number.isNaN(Date.parse(timestamp)));
  if (!validUuid(item.id) || typeof item.property_id !== "string" || item.property_id.toLowerCase() !== assignment.property_id.toLowerCase() ||
      !validDate(item.scheduled_date) || !Array.isArray(item.rooms) || item.rooms.length < 1 || item.rooms.length > 30 ||
      item.rooms.some(room => typeof room !== "string" || !room.trim() || room.length > 100) ||
      typeof item.status !== "string" || !cleaningStatuses.has(item.status) ||
      !validNullableTimestamp(item.started_at) || !validNullableTimestamp(item.completed_at) ||
      typeof item.created_at !== "string" || Number.isNaN(Date.parse(item.created_at)) || !validNullableTimestamp(item.reopened_at)) {
    throw new ChannelFeatureError(502, "Réponse ménage non conforme au contrat API.");
  }
  return {
    id: item.id.toLowerCase(),
    property_id: assignment.property_id,
    scheduled_date: item.scheduled_date,
    rooms: item.rooms,
    status: item.status,
    started_at: item.started_at,
    completed_at: item.completed_at,
    created_at: item.created_at,
    reopened_at: item.reopened_at,
  };
}

function validatePhoto(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ChannelFeatureError(502, "Réponse photos non conforme au contrat API.");
  const photo = value as Record<string, unknown>;
  if (!validUuid(photo.id) || typeof photo.room !== "string" || !photo.room.trim() || photo.room.length > 100 ||
      typeof photo.phase !== "string" || !photoPhases.has(photo.phase) ||
      typeof photo.created_at !== "string" || Number.isNaN(Date.parse(photo.created_at)) ||
      typeof photo.url !== "string" || !photo.url.startsWith("https://") || photo.url.length > 4096) {
    throw new ChannelFeatureError(502, "Réponse photos non conforme au contrat API.");
  }
  return { id: photo.id.toLowerCase(), room: photo.room, phase: photo.phase, created_at: photo.created_at, url: photo.url };
}

function reviewJobResponse(job: Record<string, unknown>) {
  return {
    job_id: job.id,
    status: job.status,
    next_offset: job.next_offset,
    pages: job.page_count,
    review_count: job.review_count,
    last_error: job.last_error ?? null,
    fetched_at: job.fetched_at ?? null,
    completed_at: job.completed_at ?? null,
  };
}

function validateReviewsPage(payload: Record<string, unknown>, assignment: Assignment, expectedOffset: number, expectedPrevious: string | null) {
  if (payload.version !== "1" || typeof payload.property_id !== "string" ||
      payload.property_id.toLowerCase() !== assignment.property_id.toLowerCase() ||
      payload.offset !== expectedOffset ||
      !(payload.next_offset === null || (typeof payload.next_offset === "number" && Number.isInteger(payload.next_offset) && payload.next_offset > expectedOffset)) ||
      typeof payload.page_signature !== "string" || !signaturePattern.test(payload.page_signature) ||
      payload.pagination_scope !== "property_manager" || typeof payload.complete !== "boolean" ||
      (payload.complete === true && payload.next_offset !== null) ||
      (payload.complete === false && payload.next_offset === null) ||
      !Array.isArray(payload.reviews) || payload.reviews.length > 100) {
    throw new ChannelFeatureError(502, "Réponse avis non conforme au contrat API.");
  }
  if (expectedPrevious && payload.previous_page_signature !== undefined && payload.previous_page_signature !== expectedPrevious) {
    throw new ChannelFeatureError(502, "La chaîne de pagination des avis est incohérente.");
  }
  const reviews = payload.reviews.map((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new ChannelFeatureError(502, "Réponse avis non conforme au contrat API.");
    const review = value as Record<string, unknown>;
    if (typeof review.reviewId !== "string" || !review.reviewId.trim() || review.reviewId.length > 300 ||
        typeof review.property_id !== "string" || review.property_id.toLowerCase() !== assignment.property_id.toLowerCase()) {
      throw new ChannelFeatureError(502, "Réponse avis non conforme au contrat API.");
    }
    return review;
  });
  return {
    reviews,
    offset: expectedOffset,
    next_offset: payload.next_offset,
    page_signature: payload.page_signature,
    complete: payload.complete,
  };
}

async function markReviewJobError(db: SupabaseClient, jobId: string, message: string, failed: boolean) {
  const { error } = await db.from("channel_review_import_jobs").update({
    last_error: message.slice(0, 500),
    ...(failed ? { status: "failed", completed_at: new Date().toISOString() } : {}),
  }).eq("id", jobId);
  if (error) console.error("[owner-channel-proxy] review job error update failed", { jobId, message: error.message });
}

export async function handleChannelFeatures(
  db: SupabaseClient,
  body: Record<string, unknown>,
  userId: string,
  isAdmin: boolean,
) {
  if (body.action === "photo_reorder") {
    if (!isAdmin) throw new ChannelFeatureError(403, "La réorganisation des photos est réservée aux administrateurs.");
    const assignment = await assignmentForRead(db, body.assignment_id, userId, isAdmin);
    const requestedImages = validateImageList(body.images);
    const currentImages = await currentPropertyImages(assignment);
    if (!samePhotoSet(currentImages, requestedImages)) {
      throw new ChannelFeatureError(409, "La liste ne reprend pas exactement les photos actuelles du logement : relisez les logements avant de réordonner");
    }
    const payload = await callCadence("owner-site-photos", {
      method: "POST",
      body: { property_id: assignment.property_id, images: requestedImages },
    });
    const returnedImages = validateImageList(payload.images);
    if (payload.property_id !== assignment.property_id ||
        typeof payload.photos_updated !== "number" || !Number.isInteger(payload.photos_updated) || payload.photos_updated < 0 ||
        returnedImages.some((url, index) => url !== requestedImages[index])) {
      throw new ChannelFeatureError(502, "Réponse de réorganisation des photos non conforme au contrat API.");
    }
    console.info("[owner-channel-proxy] photos reordered", { propertyId: assignment.property_id, count: payload.photos_updated });
    return { property_id: assignment.property_id, images: returnedImages, photos_updated: payload.photos_updated };
  }

  if (body.action === "pricing_read") {
    const assignment = await assignmentForRead(db, body.assignment_id, userId, isAdmin);
    const payload = await callCadence("owner-site-pricing", { params: { property_id: assignment.property_id } });
    return validatePricingRead(payload, assignment);
  }

  if (body.action === "pricing_replace") {
    if (isAdmin) throw new ChannelFeatureError(403, "Les périodes tarifaires propriétaire doivent être modifiées depuis le profil attribué.");
    const assignment = await assignmentForOwnerWrite(db, body.assignment_id, userId);
    const existing = validatePricingRead(await callCadence("owner-site-pricing", { params: { property_id: assignment.property_id } }), assignment);
    if (existing.beyond_linked) throw new ChannelFeatureError(409, "Ce logement est lié à Beyond : ses prix et restrictions viennent de Beyond");
    const periods = validatePricingPeriods(body.periods);
    console.info("[owner-channel-proxy] owner pricing submit", { propertyId: assignment.property_id, count: periods.length });
    const payload = await callCadence("owner-site-pricing", {
      method: "POST",
      body: { property_id: assignment.property_id, periods },
    });
    const result = validatePricingResponse(payload, assignment);
    console.info("[owner-channel-proxy] owner pricing replaced", { propertyId: assignment.property_id, count: result.periods_applied });
    return result;
  }

  if (body.action === "calendar") {
    const assignment = await assignmentForRead(db, body.assignment_id, userId, isAdmin);
    const from = optionalDate(body, "from");
    const to = optionalDate(body, "to");
    if (from && to && (from >= to || dayCount(from, to) > 366)) {
      throw new ChannelFeatureError(400, "Période [from,to) valide, de 1 à 366 jours");
    }
    const payload = await callCadence("owner-site-calendar", {
      params: { property_id: assignment.property_id, ...(from ? { from } : {}), ...(to ? { to } : {}) },
    });
    return validateCalendar(payload, assignment);
  }

  if (body.action === "blocks") {
    const assignment = await assignmentForRead(db, body.assignment_id, userId, isAdmin);
    const payload = await callCadence("owner-site-blocks", { params: { property_id: assignment.property_id } });
    if (!sameIdentity(payload, assignment, false) || !Array.isArray(payload.blocks)) {
      throw new ChannelFeatureError(502, "Réponse blocages non conforme au contrat API.");
    }
    const blocks = payload.blocks.map(block => validateBlock(block, assignment));
    const blockIds = blocks.map(block => block.id);
    const { data: requests, error } = blockIds.length
      ? await db.from("channel_owner_block_requests").select("block_id").eq("assignment_id", assignment.id).in("block_id", blockIds)
      : { data: [], error: null };
    if (error) throw error;
    const createdHere = new Set((requests ?? []).map(request => String(request.block_id).toLowerCase()));
    const { data: pending, error: pendingError } = await db
      .from("channel_owner_block_requests")
      .select("request_id,check_in,check_out,cleaning_requested,status,last_error,created_at")
      .eq("assignment_id", assignment.id)
      .in("status", ["pending", "failed"])
      .order("created_at", { ascending: false })
      .limit(20);
    if (pendingError) throw pendingError;
    return {
      property_id: assignment.property_id,
      blocks: blocks.map(block => ({ ...block, created_here: createdHere.has(block.id) })),
      local_requests: pending ?? [],
    };
  }

  if (body.action === "block_create") {
    if (isAdmin) throw new ChannelFeatureError(403, "La création doit être faite depuis le profil propriétaire attribué.");
    const assignment = await assignmentForOwnerWrite(db, body.assignment_id, userId);
    if (!validUuid(body.request_id)) throw new ChannelFeatureError(400, "Idempotency-Key UUID requis (identique lors d’une reprise)");
    const requestId = body.request_id.toLowerCase();
    const checkIn = optionalDate(body, "check_in");
    const checkOut = optionalDate(body, "check_out");
    if (!checkIn || !checkOut || typeof body.cleaning_requested !== "boolean") {
      throw new ChannelFeatureError(400, "Dates futures [check_in,check_out), maximum 366 nuits, et cleaning_requested booléen requis");
    }
    if (body.confirmed !== true) {
      throw new ChannelFeatureError(400, "Confirmez explicitement la création de ce séjour propriétaire.");
    }
    const { data: prepared, error: prepareError } = await db.rpc("prepare_channel_owner_block_request", {
      p_request_id: requestId,
      p_assignment_id: assignment.id,
      p_user_id: userId,
      p_check_in: checkIn,
      p_check_out: checkOut,
      p_cleaning_requested: body.cleaning_requested,
    });
    if (prepareError) throw prepareError;
    if (prepared?.status === "unauthorized") throw new ChannelFeatureError(403, "Seul le profil actuellement attribué peut créer ce séjour.");
    if (prepared?.status === "conflict") throw new ChannelFeatureError(409, "Cet identifiant a déjà été utilisé pour une autre demande.");
    if (prepared?.status === "invalid" || prepared?.status === "invalid_dates") {
      throw new ChannelFeatureError(400, "Dates futures [check_in,check_out), maximum 366 nuits, et cleaning_requested booléen requis");
    }
    const request = prepared?.request as Record<string, unknown> | undefined;
    if (!request) throw new ChannelFeatureError(503, "Préparation du blocage indisponible.");
    if (request.status === "created" || request.status === "replayed") {
      return { request_id: requestId, block_id: request.block_id, status: request.status, replayed: request.status === "replayed" };
    }
    try {
      const payload = await callCadence("owner-site-blocks", {
        method: "POST",
        idempotencyKey: requestId,
        body: {
          property_id: assignment.property_id,
          check_in: checkIn,
          check_out: checkOut,
          cleaning_requested: body.cleaning_requested,
        },
      });
      const block = validateBlock(payload.block, assignment);
      const replayed = payload.replayed === true;
      const { error: updateError } = await db.from("channel_owner_block_requests").update({
        block_id: block.id,
        status: replayed ? "replayed" : "created",
        last_error: null,
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      }).eq("request_id", requestId).eq("client_profile_id", userId);
      if (updateError) throw updateError;
      return { request_id: requestId, block, replayed, cleaning_job_created: payload.cleaning_job_created === true };
    } catch (error) {
      const featureError = error instanceof ChannelFeatureError
        ? error
        : new ChannelFeatureError(503, "Enregistrement local du blocage indisponible. Réessayez avec le même identifiant.");
      const retryable = [429, 500, 502, 503].includes(featureError.status) || featureError.message.includes("opération est déjà en cours");
      const { error: updateError } = await db.from("channel_owner_block_requests").update({
        status: retryable ? "pending" : "failed",
        last_error: featureError.message.slice(0, 500),
        updated_at: new Date().toISOString(),
        completed_at: retryable ? null : new Date().toISOString(),
      }).eq("request_id", requestId).eq("client_profile_id", userId);
      if (updateError) console.error("[owner-channel-proxy] block request error update failed", { requestId, message: updateError.message });
      throw featureError;
    }
  }

  if (body.action === "cleaning_list") {
    const assignment = await assignmentForRead(db, body.assignment_id, userId, isAdmin);
    const limit = optionalLimit(body);
    const cursor = optionalUuid(body, "cursor");
    const from = optionalDate(body, "from");
    const to = optionalDate(body, "to");
    if (from && to && from >= to) throw new ChannelFeatureError(400, "UUID et dates [from,to) invalides");
    const payload = await callCadence("owner-site-cleaning", {
      params: {
        property_id: assignment.property_id,
        limit,
        ...(cursor ? { cursor } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      },
    });
    if (!sameIdentity(payload, assignment, false) || !Array.isArray(payload.interventions) || payload.interventions.length > limit ||
        !(payload.next_cursor === null || validUuid(payload.next_cursor))) {
      throw new ChannelFeatureError(502, "Réponse ménage non conforme au contrat API.");
    }
    return {
      property_id: assignment.property_id,
      interventions: payload.interventions.map(item => validateIntervention(item, assignment)),
      next_cursor: payload.next_cursor,
    };
  }

  if (body.action === "cleaning_detail") {
    const assignment = await assignmentForRead(db, body.assignment_id, userId, isAdmin);
    const jobId = optionalUuid(body, "job_id");
    const photoCursor = optionalUuid(body, "photo_cursor");
    const limit = optionalLimit(body);
    if (!jobId) throw new ChannelFeatureError(400, "job_id UUID requis.");
    const payload = await callCadence("owner-site-cleaning", {
      params: { property_id: assignment.property_id, job_id: jobId, limit, ...(photoCursor ? { photo_cursor: photoCursor } : {}) },
    });
    if (!sameIdentity(payload, assignment, false) || !Array.isArray(payload.photos) || payload.photos.length > limit ||
        !(payload.next_photo_cursor === null || validUuid(payload.next_photo_cursor)) ||
        typeof payload.photos_url_expires_in !== "number" || payload.photos_url_expires_in < 1 || payload.photos_url_expires_in > 300) {
      throw new ChannelFeatureError(502, "Réponse photos non conforme au contrat API.");
    }
    return {
      property_id: assignment.property_id,
      intervention: validateIntervention(payload.intervention, assignment),
      photos: payload.photos.map(validatePhoto),
      photos_url_expires_in: payload.photos_url_expires_in,
      next_photo_cursor: payload.next_photo_cursor,
    };
  }

  if (body.action === "reviews_cache") {
    const assignment = await assignmentForRead(db, body.assignment_id, userId, isAdmin);
    const limit = optionalLimit(body, 50);
    const offsetValue = body.offset;
    const offset = offsetValue == null ? 0 : offsetValue;
    if (typeof offset !== "number" || !Number.isInteger(offset) || offset < 0) throw new ChannelFeatureError(400, "offset entier positif requis");
    const { data: reviews, error, count } = await db
      .from("channel_reviews")
      .select("review_id,channel_id,title,content,reviewer_name,rating,rating_scale,created_label,imported_at", { count: "exact" })
      .eq("property_id", assignment.property_id)
      .eq("agency_id", assignment.agency_id)
      .eq("environment", assignment.environment)
      .order("created_label", { ascending: false, nullsFirst: false })
      .order("review_id", { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    const { data: latestJob, error: jobError } = await db
      .from("channel_review_import_jobs")
      .select("*")
      .eq("assignment_id", assignment.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (jobError) throw jobError;
    return {
      reviews: reviews ?? [],
      total_count: count ?? 0,
      next_offset: offset + (reviews?.length ?? 0) < (count ?? 0) ? offset + (reviews?.length ?? 0) : null,
      import: latestJob ? reviewJobResponse(latestJob) : null,
    };
  }

  if (body.action === "reviews_sync_start") {
    const assignment = await assignmentForRead(db, body.assignment_id, userId, isAdmin);
    if (body.automatic === true) {
      const { data: recent, error: recentError } = await db.from("channel_review_import_jobs").select("*")
        .eq("assignment_id", assignment.id).eq("status", "completed")
        .order("completed_at", { ascending: false }).limit(1).maybeSingle();
      if (recentError) throw recentError;
      if (recent?.completed_at && Date.now() - Date.parse(recent.completed_at) < 24 * 60 * 60 * 1000) {
        return reviewJobResponse(recent);
      }
    }
    if (body.restart === true) {
      const { error } = await db.from("channel_review_import_jobs").update({
        status: "failed", last_error: "Import remplacé par une nouvelle synchronisation.", completed_at: new Date().toISOString(),
      }).eq("assignment_id", assignment.id).eq("requested_by", userId).eq("status", "syncing");
      if (error) throw error;
    } else {
      const { data: pending, error } = await db.from("channel_review_import_jobs").select("*")
        .eq("assignment_id", assignment.id).eq("requested_by", userId).eq("status", "syncing")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      if (pending) return reviewJobResponse(pending);
    }
    const { data: job, error } = await db.from("channel_review_import_jobs").insert({
      assignment_id: assignment.id,
      requested_by: userId,
      property_id: assignment.property_id,
      agency_id: assignment.agency_id,
      environment: assignment.environment,
    }).select("*").single();
    if (error) throw error;
    return reviewJobResponse(job);
  }

  if (body.action === "reviews_sync_page") {
    if (!validUuid(body.job_id)) throw new ChannelFeatureError(400, "Identifiant d’import invalide.");
    const { data: job, error } = await db.from("channel_review_import_jobs").select("*").eq("id", body.job_id).eq("requested_by", userId).maybeSingle();
    if (error) throw error;
    if (!job) throw new ChannelFeatureError(404, "Import d’avis introuvable.");
    const assignment = await assignmentForRead(db, job.assignment_id, userId, isAdmin);
    if (assignment.property_id !== job.property_id || assignment.agency_id !== job.agency_id || assignment.environment !== job.environment) {
      throw new ChannelFeatureError(403, "L’attribution a changé. Import d’avis refusé.");
    }
    if (job.status === "completed") return reviewJobResponse(job);
    if (job.status !== "syncing") throw new ChannelFeatureError(409, job.last_error || "Cet import d’avis est arrêté.");
    let payload: Record<string, unknown>;
    try {
      payload = await callCadence("owner-site-reviews", {
        params: {
          property_id: assignment.property_id,
          limit: 100,
          offset: job.next_offset,
          ...(job.previous_page_signature ? { previous_page_signature: job.previous_page_signature } : {}),
        },
      });
    } catch (error) {
      if (error instanceof ChannelFeatureError) await markReviewJobError(db, job.id, error.message, false);
      throw error;
    }
    let page: ReturnType<typeof validateReviewsPage>;
    try {
      page = validateReviewsPage(payload, assignment, job.next_offset, job.previous_page_signature);
    } catch (error) {
      if (error instanceof ChannelFeatureError) await markReviewJobError(db, job.id, error.message, true);
      throw error;
    }
    const { data: recorded, error: recordError } = await db.rpc("record_channel_review_page", {
      p_job_id: job.id,
      p_user_id: userId,
      p_offset: page.offset,
      p_previous_signature: job.previous_page_signature,
      p_next_offset: page.next_offset,
      p_page_signature: page.page_signature,
      p_complete: page.complete,
      p_reviews: page.reviews,
      p_fetched_at: new Date().toISOString(),
    });
    if (recordError) throw recordError;
    if (recorded?.status === "stale") return reviewJobResponse(recorded.job);
    if (recorded?.status !== "recorded" || !recorded.job) {
      await markReviewJobError(db, job.id, "Page d’avis refusée par le contrôle d’intégrité.", true);
      throw new ChannelFeatureError(409, "Page d’avis refusée par le contrôle d’intégrité.");
    }
    return reviewJobResponse(recorded.job);
  }

  throw new ChannelFeatureError(400, "Action channel inconnue.");
}
