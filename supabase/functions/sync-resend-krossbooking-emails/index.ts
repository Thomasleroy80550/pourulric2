import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const PROJECT_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co";
const RESEND_API_BASE_URL = "https://api.resend.com";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY_RECEIV") ?? Deno.env.get("RESEND_API_KEY") ?? "";
const CRON_SECRETS = [

  Deno.env.get("CRON_SECRET_NOTIFY_NEW_RESA"),
  Deno.env.get("CRON_SECRET"),
  Deno.env.get("CRON_SECRET_2"),
  Deno.env.get("RESERVATION_EMAIL_INGEST_SECRET"),
]
  .map((value) => (value ?? "").trim())
  .filter(Boolean);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

interface ReceivedEmailListItem {
  id?: string;
  from?: string | { email?: string; address?: string };
  subject?: string;
}

interface ReceivedEmailDetails {
  id?: string;
  subject?: string;
  from?: string | { email?: string; address?: string };
  text?: string;
  html?: string;
}

function isAllowedSecret(value: string): boolean {
  return !!value && CRON_SECRETS.includes(value.trim());
}

function stripHtml(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function getSenderEmail(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim().toLowerCase();
  if (typeof value === "object") {
    const maybe = value as { email?: string; address?: string };
    return (maybe.address ?? maybe.email ?? "").trim().toLowerCase();
  }
  return "";
}

function extractLineValue(text: string, label: string): string | null {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`${escapedLabel}\s*:?\s*(.+)`, "i");
  const match = text.match(regex);
  return match?.[1]?.trim() || null;
}

function parseKrossbookingEvent(subject: string, plainText: string) {
  const normalizedSubject = normalizeText(subject);
  if (!normalizedSubject.includes("reservation")) {
    return null;
  }

  let eventType: "new" | "modified" | "cancelled" | "unknown" = "unknown";

  if (normalizedSubject.includes("new reservation")) {
    eventType = "new";
  } else if (normalizedSubject.includes("modified") || normalizedSubject.includes("updated")) {
    eventType = "modified";
  } else if (
    normalizedSubject.includes("cancelled") ||
    normalizedSubject.includes("canceled") ||
    normalizedSubject.includes("annulation") ||
    normalizedSubject.includes("cancel")
  ) {
    eventType = "cancelled";
  }

  const reservationReference = plainText.match(/Reservation\s*n\.\s*([^\n]+)/i)?.[1]?.trim() || null;
  const occurredAt = plainText.match(/(?:made on|updated on|cancelled on)\s*(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/i)?.[1]?.trim() || null;
  const arrivalDepartureMatch = plainText.match(/Arrival:\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*Departure:\s*(\d{2}\/\d{2}\/\d{4})/i);
  const totalFare = plainText.match(/Total fare:\s*([^\n]+)/i)?.[1]?.trim() || null;
  const guestCountValue = plainText.match(/Guests:\s*(\d+)/i)?.[1]?.trim() || null;
  const assignedRooms = extractLineValue(plainText, "Assigned rooms");
  const reservationFor = extractLineValue(plainText, "Reservation for");
  const roomName = assignedRooms || reservationFor?.replace(/^\d+\s*x\s*/i, "").split(" - ")[0]?.trim() || null;
  const customerName = extractLineValue(plainText, "Customer");
  const customerEmail = extractLineValue(plainText, "Email");
  const customerPhone = extractLineValue(plainText, "Phone");
  const status = extractLineValue(plainText, "Status");

  if (!roomName || !reservationReference) {
    return null;
  }

  return {
    eventType,
    reservationReference,
    reservationId: reservationReference.split("/")[0]?.trim() || reservationReference,
    occurredAt,
    roomName,
    guestName: customerName,
    guestEmail: customerEmail,
    guestPhone: customerPhone,
    arrivalDate: arrivalDepartureMatch?.[1] ?? null,
    departureDate: arrivalDepartureMatch?.[2] ?? null,
    totalAmount: totalFare,
    guestCount: guestCountValue ? Number(guestCountValue) : null,
    reservationStatus: status,
  };
}

async function resendRequest(path: string) {
  const response = await fetch(`${RESEND_API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "User-Agent": "hellokeys-reservation-sync/1.0",
    },
  });

  const rawText = await response.text();
  if (!response.ok) {
    throw new Error(`Resend API ${path} failed: ${response.status} ${rawText}`);
  }

  return rawText ? JSON.parse(rawText) : {};
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

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const headerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  const bodyToken = typeof body.cron_secret === "string" ? body.cron_secret.trim() : "";
  const isAuthorized = isAllowedSecret(headerToken) || isAllowedSecret(bodyToken);

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY is not configured" }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  const limit = typeof body.limit === "number" ? body.limit : 20;
  const after = typeof body.after === "string" ? body.after : "";
  const before = typeof body.before === "string" ? body.before : "";
  const inspectOnly = body.inspect_only === true;
  const includeRaw = body.include_raw === true;
  const ingestSecret = bodyToken || headerToken;

  console.log(`[sync-resend-krossbooking-emails] start limit=${limit} inspect_only=${inspectOnly}`);

  try {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (after) params.set("after", after);
    if (before) params.set("before", before);

    const listResponse = await resendRequest(`/emails/receiving?${params.toString()}`);
    const listData = Array.isArray(listResponse?.data) ? listResponse.data : [];
    const processed: Array<Record<string, unknown>> = [];
    let matchedCount = 0;
    let ingestedCount = 0;

    for (const email of listData as ReceivedEmailListItem[]) {
      const emailId = email.id;
      if (!emailId) continue;

      const detailsResponse = await resendRequest(`/emails/receiving/${emailId}`);
      const details = (detailsResponse?.data ?? detailsResponse) as ReceivedEmailDetails;
      const senderEmail = getSenderEmail(details?.from ?? email.from);
      const subject = details?.subject ?? email.subject ?? "";
      const isKrossbookingSender = senderEmail === "noreply@krossbooking.com";

      if (!isKrossbookingSender) {
        continue;
      }

      const plainText = (details?.text && details.text.trim()) || stripHtml(details?.html);
      const parsedEvent = parseKrossbookingEvent(subject, plainText);
      matchedCount += 1;

      if (!parsedEvent || parsedEvent.eventType === "unknown") {
        processed.push({
          emailId,
          senderEmail,
          subject,
          status: "ignored",
          reason: "unsupported-or-unparseable",
          ...(includeRaw ? { raw: detailsResponse } : {}),
        });
        continue;
      }

      if (inspectOnly) {
        processed.push({
          emailId,
          senderEmail,
          subject,
          status: "parsed",
          event: parsedEvent,
          ...(includeRaw ? { raw: detailsResponse } : {}),
        });
        continue;
      }

      const ingestResponse = await fetch(`${PROJECT_URL}/functions/v1/ingest-reservation-email-event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ingestSecret}`,
        },
        body: JSON.stringify({
          event_key: `resend-email-${emailId}`,
          event_type: parsedEvent.eventType,
          source: "resend-receiving-api",
          occurred_at: parsedEvent.occurredAt,
          reservation_reference: parsedEvent.reservationReference,
          reservation_id: parsedEvent.reservationId,
          room_name: parsedEvent.roomName,
          guest_name: parsedEvent.guestName,
          guest_email: parsedEvent.guestEmail,
          guest_phone: parsedEvent.guestPhone,
          arrival_date: parsedEvent.arrivalDate,
          departure_date: parsedEvent.departureDate,
          total_amount: parsedEvent.totalAmount,
          guest_count: parsedEvent.guestCount,
          reservation_status: parsedEvent.reservationStatus,
          subject,
          raw_payload: includeRaw ? detailsResponse : { email_id: emailId, subject, from: senderEmail },
        }),
      });

      const ingestText = await ingestResponse.text();
      if (!ingestResponse.ok) {
        processed.push({
          emailId,
          senderEmail,
          subject,
          status: "ingest_failed",
          error: ingestText,
        });
        continue;
      }

      ingestedCount += 1;
      processed.push({
        emailId,
        senderEmail,
        subject,
        status: "ingested",
        response: ingestText,
      });
    }

    console.log(`[sync-resend-krossbooking-emails] done matched=${matchedCount} ingested=${ingestedCount}`);

    return new Response(JSON.stringify({
      success: true,
      inspectOnly,
      totalFetched: listData.length,
      matchedKrossbooking: matchedCount,
      ingested: ingestedCount,
      processed,
    }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[sync-resend-krossbooking-emails] error ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
