import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend";
import { format, isValid, parse, parseISO } from "npm:date-fns";
import { fr } from "npm:date-fns/locale/fr";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SMSFACTOR_API_TOKEN = (Deno.env.get("SMSFACTOR_API_TOKEN") ?? "").trim();
const WEBHOOK_SECRETS = [
  Deno.env.get("RESERVATION_EMAIL_INGEST_SECRET"),
  Deno.env.get("CRON_SECRET_NOTIFY_NEW_RESA"),
  Deno.env.get("CRON_SECRET"),
]
  .map((value) => (value ?? "").trim())
  .filter(Boolean);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(RESEND_API_KEY);
const euroFormatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") ?? "https://beta.proprietaire.hellokeys.fr").replace(/\/$/, "");
const HELLO_KEYS_LOGO_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co/storage/v1/object/public/public-assets/logo.png";

interface IncomingEventPayload {
  event_key?: string;
  source?: string;
  event_type?: string;
  occurred_at?: string;
  reservation_reference?: string;
  reservation_id?: string;
  room_name?: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  arrival_date?: string;
  departure_date?: string;
  total_amount?: string | number;
  guest_count?: number;
  reservation_status?: string;
  subject?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  raw_payload?: Record<string, unknown> | null;
}

interface MatchedRoom {
  id: string;
  user_id: string;
  room_id: string;
  room_name: string;
}

interface MatchedProfile {
  id: string;
  first_name: string | null;
  email: string | null;
  phone_number: string | null;
  notify_new_booking_email: boolean;
  notify_cancellation_email: boolean;
  notify_booking_change_email: boolean;
  notify_new_booking_sms: boolean;
  notify_booking_change_sms: boolean;
  notify_cancellation_sms: boolean;
}

function isAllowedSecret(value: string): boolean {
  return !!value && WEBHOOK_SECRETS.includes(value.trim());
}

function repairTextEncoding(value: string): string {
  if (!/[ÃÂâ€]/.test(value)) return value;

  try {
    const bytes = Uint8Array.from(Array.from(value).map((char) => char.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder("utf-8").decode(bytes);
    return decoded.includes("�") ? value : decoded;
  } catch {
    return value;
  }
}

function normalizeText(value: string): string {
  const repaired = repairTextEncoding(value);
  return repaired
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function getNumberTokens(value: string): string[] {
  return Array.from(new Set(normalizeText(value).match(/\b\d+\b/g) ?? []));
}

function getTextWithoutNumbers(value: string): string {
  return normalizeText(value).replace(/\b\d+\b/g, " ").replace(/\s+/g, " ").trim();
}

function haveSameNumberTokens(left: string[], right: string[]): boolean {
  if (left.length === 0 || right.length === 0 || left.length !== right.length) {
    return false;
  }

  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();
  return leftSorted.every((value, index) => value === rightSorted[index]);
}

function getRoomMatchScore(inputRoomName: string, existingRoomName: string): number {
  const normalizedInput = normalizeText(inputRoomName);
  const normalizedExisting = normalizeText(existingRoomName);

  if (!normalizedInput || !normalizedExisting) {
    return -1;
  }

  if (normalizedInput === normalizedExisting) {
    return 1000;
  }

  const inputNumbers = getNumberTokens(inputRoomName);
  const existingNumbers = getNumberTokens(existingRoomName);
  const inputBase = getTextWithoutNumbers(inputRoomName);
  const existingBase = getTextWithoutNumbers(existingRoomName);
  const basesCompatible = !!inputBase && !!existingBase && (
    inputBase === existingBase ||
    inputBase.includes(existingBase) ||
    existingBase.includes(inputBase)
  );

  if (haveSameNumberTokens(inputNumbers, existingNumbers) && basesCompatible) {
    let score = 800;

    if (normalizedExisting.startsWith(normalizedInput) || normalizedInput.startsWith(normalizedExisting)) {
      score += 50;
    }

    return score;
  }

  if (inputNumbers.length > 0 || existingNumbers.length > 0) {
    return -1;
  }

  if (normalizedExisting.includes(normalizedInput) || normalizedInput.includes(normalizedExisting)) {
    return 100;
  }

  return -1;
}

function resolveMatchedRooms(allRooms: MatchedRoom[], inputRoomName: string): { matchedRooms: MatchedRoom[]; errorMessage: string | null } {
  const scoredRooms = allRooms
    .map((room) => ({ room, score: getRoomMatchScore(inputRoomName, room.room_name) }))
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => right.score - left.score);

  if (scoredRooms.length === 0) {
    return {
      matchedRooms: [],
      errorMessage: `No room matched for ${inputRoomName}`,
    };
  }

  const bestScore = scoredRooms[0].score;
  const bestMatches = scoredRooms.filter((entry) => entry.score === bestScore).map((entry) => entry.room);

  if (bestScore === 100 && bestMatches.length > 1) {
    return {
      matchedRooms: [],
      errorMessage: `Ambiguous partial room match for ${inputRoomName}: ${bestMatches.map((room) => room.room_name).join(", ")}`,
    };
  }

  return {
    matchedRooms: bestMatches,
    errorMessage: null,
  };
}

function normalizeEventType(value: string | undefined): "new" | "modified" | "cancelled" | "unknown" {
  const normalized = normalizeText(value ?? "");

  if (["new", "reservation new", "new reservation", "created", "creation"].includes(normalized)) {
    return "new";
  }

  if (["modified", "modification", "updated", "update"].includes(normalized)) {
    return "modified";
  }

  if (["cancelled", "canceled", "annulation", "cancel", "cancelation", "cancellation"].includes(normalized)) {
    return "cancelled";
  }

  return "unknown";
}

function parseDateInput(value: string | undefined): string | null {
  if (!value) return null;

  const isoDate = parseISO(value);
  if (isValid(isoDate)) {
    return format(isoDate, "yyyy-MM-dd");
  }

  const dayFirstDate = parse(value, "dd/MM/yyyy", new Date());
  if (isValid(dayFirstDate)) {
    return format(dayFirstDate, "yyyy-MM-dd");
  }

  return null;
}

function parseDateTimeInput(value: string | undefined): string | null {
  if (!value) return null;

  const isoDate = parseISO(value);
  if (isValid(isoDate)) {
    return isoDate.toISOString();
  }

  const dayFirstDateTime = parse(value, "dd/MM/yyyy HH:mm:ss", new Date());
  if (isValid(dayFirstDateTime)) {
    return dayFirstDateTime.toISOString();
  }

  const sqlDateTime = parse(value, "yyyy-MM-dd HH:mm:ss", new Date());
  if (isValid(sqlDateTime)) {
    return sqlDateTime.toISOString();
  }

  return null;
}

function parseAmount(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const normalized = value
    .replace(/euro/gi, "")
    .replace(/€/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return "—";

  const parsed = parseISO(value);
  if (!isValid(parsed)) return value;
  return format(parsed, "dd MMMM yyyy", { locale: fr });
}

function formatAmount(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return euroFormatter.format(value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatSmsDate(value: string | null | undefined): string | null {
  if (!value) return null;

  const parsed = parseISO(value);
  if (!isValid(parsed)) return value;
  return format(parsed, "dd/MM");
}

function normalizePhoneForSmsFactor(value: string | null | undefined): string | null {
  if (!value) return null;

  let phone = value.trim().replace(/[\s\-().]/g, "");
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  if (phone.startsWith("33") && !phone.startsWith("+")) phone = `+${phone}`;
  if (!phone.startsWith("+") && phone.length === 10 && phone.startsWith("0")) phone = `+33${phone.slice(1)}`;
  if (phone.startsWith("+33") && phone[3] === "0") phone = `+33${phone.slice(4)}`;

  const digits = phone.replace(/\D/g, "");
  return digits.length >= 11 ? digits : null;
}

function sanitizeSmsText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/€/g, " EUR")
    .replace(/→/g, "->")
    .replace(/[’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function truncateSmsText(value: string, maxLength = 160): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function buildReservationSmsMessage(
  eventType: "new" | "modified" | "cancelled" | "unknown",
  roomLabel: string,
  guestName: string,
  reservationLabel: string,
  arrivalDate: string | null,
  departureDate: string | null,
  totalAmount: number | null,
): string | null {
  const arrival = formatSmsDate(arrivalDate);
  const departure = formatSmsDate(departureDate);
  const dateRange = arrival && departure ? `${arrival}-${departure}` : arrival ?? departure ?? "";
  const amount = totalAmount === null ? "" : formatAmount(totalAmount).replace(/\s/g, "");

  let message = "";

  if (eventType === "new") {
    message = `HK nouvelle resa ${roomLabel} ${dateRange} ${guestName} ${amount} ref ${reservationLabel}`;
  } else if (eventType === "cancelled") {
    message = `HK annulation resa ${roomLabel} ${dateRange} ${guestName} ref ${reservationLabel}`;
  } else if (eventType === "modified") {
    message = `HK modif resa ${roomLabel} ${dateRange} ${guestName} ref ${reservationLabel}`;
  }

  if (!message) {
    return null;
  }

  return truncateSmsText(sanitizeSmsText(message));
}

function buildReservationEmailLayout(
  title: string,
  firstName: string | null,
  introHtml: string,
  detailsHtml: string,
  ctaPath: string,
): string {
  const ctaUrl = `${APP_BASE_URL}${ctaPath.startsWith("/") ? ctaPath : `/${ctaPath}`}`;
  const greetingName = escapeHtml(firstName?.trim() || "");

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc; padding: 24px 12px;">
      <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <img src="${HELLO_KEYS_LOGO_URL}" alt="Hello Keys Logo" style="width: 150px; margin-bottom: 20px;">
        <h2 style="color: #1a202c; margin: 0 0 16px 0;">${escapeHtml(title)}</h2>
        <p style="margin: 0 0 16px 0;">Bonjour ${greetingName},</p>
        <div style="margin: 0 0 20px 0;">${introHtml}</div>
        <div style="background-color: #f7fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
          <ul style="margin: 0; padding-left: 20px;">
            ${detailsHtml}
          </ul>
        </div>
        <a href="${ctaUrl}" style="background-color: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; margin-top: 8px;">Voir dans mon espace</a>
        <p style="margin-top: 30px; font-size: 0.9em; color: #718096;">À bientôt,<br>L'équipe Hello Keys</p>
      </div>
    </div>
  `;
}

async function sendEmail(profile: MatchedProfile, subject: string, html: string) {
  if (!profile.email) {
    console.warn(`[ingest-reservation-email-event] missing email for user_id=${profile.id}`);
    return;
  }

  await resend.emails.send({
    from: "Hello Keys <noreply@notifications.hellokeys.fr>",
    to: [profile.email],
    subject,
    html,
  });
}

async function sendSms(profile: MatchedProfile, message: string, smsId: string) {
  if (!SMSFACTOR_API_TOKEN) {
    console.warn(`[ingest-reservation-email-event] SMSFACTOR_API_TOKEN missing, SMS skipped user_id=${profile.id}`);
    return;
  }

  const destination = normalizePhoneForSmsFactor(profile.phone_number);
  if (!destination) {
    console.warn(`[ingest-reservation-email-event] missing or invalid phone_number for user_id=${profile.id}`);
    return;
  }

  const params = new URLSearchParams({
    token: SMSFACTOR_API_TOKEN,
    text: truncateSmsText(sanitizeSmsText(message)),
    to: destination,
    pushtype: "alert",
    gsmsmsid: smsId,
  });

  const response = await fetch(`https://api.smsfactor.com/send?${params.toString()}`, {
    method: "GET",
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`SMSFactor error ${response.status}: ${responseText}`);
  }

  console.log(`[ingest-reservation-email-event] sms sent user_id=${profile.id} to=${destination}`);
}

function buildChangesHtml(before: Record<string, unknown> | null | undefined, after: Record<string, unknown> | null | undefined): string {
  if (!before && !after) {
    return "<li><strong>Mise à jour détectée</strong></li>";
  }

  const keys = Array.from(new Set([...(before ? Object.keys(before) : []), ...(after ? Object.keys(after) : [])]));
  const items = keys
    .filter((key) => JSON.stringify(before?.[key] ?? null) !== JSON.stringify(after?.[key] ?? null))
    .map((key) => {
      const beforeValue = before?.[key] ?? "—";
      const afterValue = after?.[key] ?? "—";
      return `<li><strong>${escapeHtml(key)} :</strong> ${escapeHtml(String(beforeValue))} → ${escapeHtml(String(afterValue))}</li>`;
    });

  return items.length > 0 ? items.join("") : "<li><strong>Mise à jour détectée</strong></li>";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  let body: IncomingEventPayload = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  const headerSecret = req.headers.get("x-webhook-secret")?.trim() ?? "";
  const bodySecret = typeof (body as Record<string, unknown>).secret === "string" ? String((body as Record<string, unknown>).secret).trim() : "";
  const isAuthorized = isAllowedSecret(bearerToken) || isAllowedSecret(headerSecret) || isAllowedSecret(bodySecret);

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const roomName = body.room_name?.trim() ?? "";
  if (!roomName) {
    return new Response(JSON.stringify({ error: "room_name is required" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const repairedRoomName = repairTextEncoding(roomName);
  const normalizedRoomName = normalizeText(repairedRoomName);
  const eventType = normalizeEventType(body.event_type);
  const occurredAt = parseDateTimeInput(body.occurred_at) ?? new Date().toISOString();
  const arrivalDate = parseDateInput(body.arrival_date);
  const departureDate = parseDateInput(body.departure_date);
  const totalAmount = parseAmount(body.total_amount);
  const eventKey = body.event_key?.trim() || null;

  console.log(`[ingest-reservation-email-event] received event_type=${eventType} room_name=${repairedRoomName} reservation_id=${body.reservation_id ?? "unknown"}`);

  try {
    const { data: userRooms, error: userRoomsError } = await supabaseAdmin
      .from("user_rooms")
      .select("id, user_id, room_id, room_name");

    if (userRoomsError) {
      throw userRoomsError;
    }

    const allRooms = (userRooms ?? []) as MatchedRoom[];
    const { matchedRooms, errorMessage: roomMatchError } = resolveMatchedRooms(allRooms, repairedRoomName);
    const matchedUserIds = Array.from(new Set(matchedRooms.map((room) => room.user_id)));
    const matchedRoomIds = matchedRooms.map((room) => room.id);

    if (roomMatchError) {
      console.warn(`[ingest-reservation-email-event] ${roomMatchError}`);
    }

    const insertPayload = {
      source: body.source?.trim() || "email",
      event_key: eventKey,
      event_type: eventType,
      occurred_at: occurredAt,
      reservation_reference: body.reservation_reference?.trim() || null,
      reservation_id: body.reservation_id?.trim() || null,
      room_name: repairedRoomName,
      room_name_normalized: normalizedRoomName,
      guest_name: body.guest_name?.trim() || null,
      guest_email: body.guest_email?.trim() || null,

      guest_phone: body.guest_phone?.trim() || null,
      arrival_date: arrivalDate,
      departure_date: departureDate,
      total_amount: totalAmount,
      guest_count: typeof body.guest_count === "number" ? body.guest_count : null,
      reservation_status: body.reservation_status?.trim() || null,
      subject: body.subject?.trim() || null,
      before_payload: body.before ?? null,
      after_payload: body.after ?? null,
      raw_payload: body.raw_payload ?? body,
      matched_user_room_ids: matchedRoomIds,
      matched_user_ids: matchedUserIds,
      processing_status: matchedUserIds.length > 0 ? "matched" : "unmatched",
      error_message: matchedUserIds.length > 0 ? null : roomMatchError,
      processed_at: new Date().toISOString(),
    };

    const { data: insertedEvent, error: insertError } = await supabaseAdmin
      .from("reservation_email_events")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        console.warn(`[ingest-reservation-email-event] duplicate event ignored event_key=${eventKey}`);
        return new Response(JSON.stringify({ success: true, duplicate: true, eventKey }), {
          status: 200,
          headers: corsHeaders,
        });
      }
      throw insertError;
    }

    if (matchedUserIds.length === 0) {
      console.warn(`[ingest-reservation-email-event] no room matched for room_name=${repairedRoomName}`);
      return new Response(JSON.stringify({
        success: true,
        eventId: insertedEvent?.id ?? null,
        matchedUsers: 0,
        matchedRooms: 0,
        eventType,
      }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, email, phone_number, notify_new_booking_email, notify_cancellation_email, notify_booking_change_email, notify_new_booking_sms, notify_booking_change_sms, notify_cancellation_sms")
      .in("id", matchedUserIds);

    if (profilesError) {
      throw profilesError;
    }

    const matchedProfiles = (profiles ?? []) as MatchedProfile[];
    const roomLabel = matchedRooms[0]?.room_name ?? repairedRoomName;
    const guestName = body.guest_name?.trim() || "Client";
    const reservationLabel = body.reservation_reference?.trim() || body.reservation_id?.trim() || "Réservation";

    for (const profile of matchedProfiles) {
      let notificationMessage = `Événement réservation : ${roomLabel}`;
      let notificationLink = "/calendar";
      let emailSubject = `Réservation pour ${roomLabel}`;
      let emailHtml = buildReservationEmailLayout(
        "Réservation",
        profile.first_name,
        `<p>Un événement de réservation a été reçu pour <strong>${escapeHtml(roomLabel)}</strong>.</p>`,
        `<li><strong>Référence :</strong> ${escapeHtml(reservationLabel)}</li><li><strong>Client :</strong> ${escapeHtml(guestName)}</li>`,
        notificationLink,
      );
      let shouldSendEmail = false;
      let shouldSendSms = false;
      let smsMessage = "";

      if (eventType === "new") {
        notificationMessage = `Nouvelle réservation : ${roomLabel} (${guestName}, ${formatDisplayDate(arrivalDate)} → ${formatDisplayDate(departureDate)})`;
        emailSubject = `Nouvelle réservation pour ${roomLabel}`;
        emailHtml = buildReservationEmailLayout(
          "Nouvelle réservation",
          profile.first_name,
          `<p>Une nouvelle réservation a été enregistrée pour votre logement <strong>${escapeHtml(roomLabel)}</strong>.</p>`,
          `
            <li><strong>Référence :</strong> ${escapeHtml(reservationLabel)}</li>
            <li><strong>Client :</strong> ${escapeHtml(guestName)}</li>
            <li><strong>Arrivée :</strong> ${escapeHtml(formatDisplayDate(arrivalDate))}</li>
            <li><strong>Départ :</strong> ${escapeHtml(formatDisplayDate(departureDate))}</li>
            <li><strong>Montant :</strong> ${escapeHtml(formatAmount(totalAmount))}</li>
          `,
          notificationLink,
        );
        shouldSendEmail = profile.notify_new_booking_email;
        shouldSendSms = profile.notify_new_booking_sms;
      } else if (eventType === "cancelled") {
        notificationMessage = `Annulation de réservation : ${roomLabel} (${guestName})`;
        notificationLink = "/bookings";
        emailSubject = `Annulation de réservation pour ${roomLabel}`;
        emailHtml = buildReservationEmailLayout(
          "Annulation de réservation",
          profile.first_name,
          `<p>Une réservation a été annulée pour votre logement <strong>${escapeHtml(roomLabel)}</strong>.</p>`,
          `
            <li><strong>Référence :</strong> ${escapeHtml(reservationLabel)}</li>
            <li><strong>Client :</strong> ${escapeHtml(guestName)}</li>
            <li><strong>Arrivée prévue :</strong> ${escapeHtml(formatDisplayDate(arrivalDate))}</li>
          `,
          notificationLink,
        );
        shouldSendEmail = profile.notify_cancellation_email;
        shouldSendSms = profile.notify_cancellation_sms;
      } else if (eventType === "modified") {
        notificationMessage = `Réservation modifiée : ${roomLabel} (${guestName})`;
        emailSubject = `Modification de réservation pour ${roomLabel}`;
        emailHtml = buildReservationEmailLayout(
          "Modification de réservation",
          profile.first_name,
          `<p>Une réservation a été modifiée pour votre logement <strong>${escapeHtml(roomLabel)}</strong>.</p>`,
          `
            <li><strong>Référence :</strong> ${escapeHtml(reservationLabel)}</li>
            <li><strong>Client :</strong> ${escapeHtml(guestName)}</li>
            ${buildChangesHtml(body.before, body.after)}
          `,
          notificationLink,
        );
        shouldSendEmail = profile.notify_booking_change_email;
        shouldSendSms = profile.notify_booking_change_sms;
      }

      smsMessage = buildReservationSmsMessage(
        eventType,
        roomLabel,
        guestName,
        reservationLabel,
        arrivalDate,
        departureDate,
        totalAmount,
      ) ?? "";

      const { error: notificationError } = await supabaseAdmin.from("notifications").insert({
        user_id: profile.id,
        message: notificationMessage,
        link: notificationLink,
      });

      if (notificationError) {
        console.error(`[ingest-reservation-email-event] notification insert failed user_id=${profile.id} message=${notificationError.message}`);
      }

      if (shouldSendEmail) {
        try {
          await sendEmail(profile, emailSubject, emailHtml);
        } catch (emailError) {
          const message = emailError instanceof Error ? emailError.message : String(emailError);
          console.error(`[ingest-reservation-email-event] email send failed user_id=${profile.id} message=${message}`);
        }
      }

      if (shouldSendSms && smsMessage) {
        try {
          await sendSms(profile, smsMessage, `${insertedEvent?.id ?? "reservation-event"}-${profile.id}`);
        } catch (smsError) {
          const message = smsError instanceof Error ? smsError.message : String(smsError);
          console.error(`[ingest-reservation-email-event] sms send failed user_id=${profile.id} message=${message}`);
        }
      }
    }

    console.log(`[ingest-reservation-email-event] processed event_id=${insertedEvent?.id ?? "unknown"} matched_users=${matchedUserIds.length}`);

    return new Response(JSON.stringify({
      success: true,
      eventId: insertedEvent?.id ?? null,
      eventType,
      matchedUsers: matchedUserIds.length,
      matchedRooms: matchedRoomIds.length,
      matchedRoomNames: matchedRooms.map((room) => room.room_name),
    }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ingest-reservation-email-event] error ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});