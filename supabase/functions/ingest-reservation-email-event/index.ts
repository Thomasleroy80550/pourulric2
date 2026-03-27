import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend";
import { format, isValid, parse, parseISO } from "npm:date-fns";
import { fr } from "npm:date-fns/locale/fr";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
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
  notify_new_booking_email: boolean;
  notify_cancellation_email: boolean;
  notify_booking_change_email: boolean;
}

function isAllowedSecret(value: string): boolean {
  return !!value && WEBHOOK_SECRETS.includes(value.trim());
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
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

  const normalizedRoomName = normalizeText(roomName);
  const eventType = normalizeEventType(body.event_type);
  const occurredAt = parseDateTimeInput(body.occurred_at) ?? new Date().toISOString();
  const arrivalDate = parseDateInput(body.arrival_date);
  const departureDate = parseDateInput(body.departure_date);
  const totalAmount = parseAmount(body.total_amount);
  const eventKey = body.event_key?.trim() || null;

  console.log(`[ingest-reservation-email-event] received event_type=${eventType} room_name=${roomName} reservation_id=${body.reservation_id ?? "unknown"}`);

  try {
    const { data: userRooms, error: userRoomsError } = await supabaseAdmin
      .from("user_rooms")
      .select("id, user_id, room_id, room_name");

    if (userRoomsError) {
      throw userRoomsError;
    }

    const allRooms = (userRooms ?? []) as MatchedRoom[];
    let matchedRooms = allRooms.filter((room) => normalizeText(room.room_name) === normalizedRoomName);

    if (matchedRooms.length === 0) {
      matchedRooms = allRooms.filter((room) => {
        const normalizedExisting = normalizeText(room.room_name);
        return normalizedExisting.includes(normalizedRoomName) || normalizedRoomName.includes(normalizedExisting);
      });
    }

    const matchedUserIds = Array.from(new Set(matchedRooms.map((room) => room.user_id)));
    const matchedRoomIds = matchedRooms.map((room) => room.id);

    const insertPayload = {
      source: body.source?.trim() || "email",
      event_key: eventKey,
      event_type,
      occurred_at: occurredAt,
      reservation_reference: body.reservation_reference?.trim() || null,
      reservation_id: body.reservation_id?.trim() || null,
      room_name: roomName,
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
      error_message: matchedUserIds.length > 0 ? null : `No room matched for ${roomName}`,
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
      console.warn(`[ingest-reservation-email-event] no room matched for room_name=${roomName}`);
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
      .select("id, first_name, email, notify_new_booking_email, notify_cancellation_email, notify_booking_change_email")
      .in("id", matchedUserIds);

    if (profilesError) {
      throw profilesError;
    }

    const matchedProfiles = (profiles ?? []) as MatchedProfile[];
    const roomLabel = matchedRooms[0]?.room_name ?? roomName;
    const guestName = body.guest_name?.trim() || "Client";
    const reservationLabel = body.reservation_reference?.trim() || body.reservation_id?.trim() || "Réservation";

    for (const profile of matchedProfiles) {
      let notificationMessage = `Événement réservation : ${roomLabel}`;
      let notificationLink = "/calendar";
      let emailSubject = `Réservation pour ${roomLabel}`;
      let emailHtml = `
        <h1>Réservation</h1>
        <p>Bonjour ${escapeHtml(profile.first_name || "")},</p>
        <p>Un événement de réservation a été reçu pour <strong>${escapeHtml(roomLabel)}</strong>.</p>
      `;
      let shouldSendEmail = false;

      if (eventType === "new") {
        notificationMessage = `Nouvelle réservation : ${roomLabel} (${guestName}, ${formatDisplayDate(arrivalDate)} → ${formatDisplayDate(departureDate)})`;
        emailSubject = `Nouvelle réservation pour ${roomLabel}`;
        emailHtml = `
          <h1>Nouvelle réservation</h1>
          <p>Bonjour ${escapeHtml(profile.first_name || "")},</p>
          <p>Une nouvelle réservation a été enregistrée pour votre logement <strong>${escapeHtml(roomLabel)}</strong>.</p>
          <ul>
            <li><strong>Référence :</strong> ${escapeHtml(reservationLabel)}</li>
            <li><strong>Client :</strong> ${escapeHtml(guestName)}</li>
            <li><strong>Arrivée :</strong> ${escapeHtml(formatDisplayDate(arrivalDate))}</li>
            <li><strong>Départ :</strong> ${escapeHtml(formatDisplayDate(departureDate))}</li>
            <li><strong>Montant :</strong> ${escapeHtml(formatAmount(totalAmount))}</li>
          </ul>
        `;
        shouldSendEmail = profile.notify_new_booking_email;
      } else if (eventType === "cancelled") {
        notificationMessage = `Annulation de réservation : ${roomLabel} (${guestName})`;
        notificationLink = "/bookings";
        emailSubject = `Annulation de réservation pour ${roomLabel}`;
        emailHtml = `
          <h1>Annulation de réservation</h1>
          <p>Bonjour ${escapeHtml(profile.first_name || "")},</p>
          <p>Une réservation a été annulée pour votre logement <strong>${escapeHtml(roomLabel)}</strong>.</p>
          <ul>
            <li><strong>Référence :</strong> ${escapeHtml(reservationLabel)}</li>
            <li><strong>Client :</strong> ${escapeHtml(guestName)}</li>
            <li><strong>Arrivée prévue :</strong> ${escapeHtml(formatDisplayDate(arrivalDate))}</li>
          </ul>
        `;
        shouldSendEmail = profile.notify_cancellation_email;
      } else if (eventType === "modified") {
        notificationMessage = `Réservation modifiée : ${roomLabel} (${guestName})`;
        emailSubject = `Modification de réservation pour ${roomLabel}`;
        emailHtml = `
          <h1>Modification de réservation</h1>
          <p>Bonjour ${escapeHtml(profile.first_name || "")},</p>
          <p>Une réservation a été modifiée pour votre logement <strong>${escapeHtml(roomLabel)}</strong>.</p>
          <ul>
            <li><strong>Référence :</strong> ${escapeHtml(reservationLabel)}</li>
            <li><strong>Client :</strong> ${escapeHtml(guestName)}</li>
            ${buildChangesHtml(body.before, body.after)}
          </ul>
        `;
        shouldSendEmail = profile.notify_booking_change_email;
      }

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
