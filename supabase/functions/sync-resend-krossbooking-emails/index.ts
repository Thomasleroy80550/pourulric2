import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const PROJECT_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co";
const RESEND_API_BASE_URL = "https://api.resend.com";
const RESEND_API_KEY = (Deno.env.get("RESEND_API_KEY_RECEIV") ?? Deno.env.get("RESEND_API_KEY") ?? "").trim();
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
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

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

function getSenderEmail(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim().toLowerCase();
  if (typeof value === "object") {
    const maybe = value as { email?: string; address?: string };
    return (maybe.address ?? maybe.email ?? "").trim().toLowerCase();
  }
  return "";
}

function cleanExtractedValue(value: string | null): string | null {
  if (!value) return null;

  const cleaned = repairTextEncoding(value.trim());
  if (!cleaned || cleaned === ":") return null;
  if (/^[A-Z ]+:$/i.test(cleaned)) return null;

  return cleaned;
}

function extractLineValue(text: string, label: string): string | null {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`${escapedLabel}\s*:?\s*(.+)`, "i");
  const match = text.match(regex);
  return cleanExtractedValue(match?.[1]?.trim() || null);
}

function extractFirstLineValue(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const value = extractLineValue(text, label);
    if (value) return value;
  }

  return null;
}

function extractReservationReference(subject: string, text: string): string | null {
  return (
    text.match(/(?:Reservation|Réservation|Prenotazione)\s+n\.\s*([^\s\n]+(?:\/[^\s\n]+)?)/i)?.[1]?.trim() ||
    text.match(/Reservation\s+([^\s\n]+(?:\/[^\s\n]+)?)\s+cancelled/i)?.[1]?.trim() ||
    text.match(/\b(KB\d{6,}|\d{4,6}\/\d{4})\b/i)?.[1]?.trim() ||
    subject.match(/\b(KB\d{6,}|\d{4,6}\/\d{4})\b/i)?.[1]?.trim() ||
    null
  );
}

function parseKrossbookingEvent(subject: string, plainText: string) {
  const normalizedSubject = normalizeText(subject);
  const normalizedBody = normalizeText(plainText);
  const normalizedContent = `${normalizedSubject} ${normalizedBody}`.trim();

  const looksLikeReservationEmail = [
    "reservation",
    "reservations",
    "details des reservations",
    "details reservation",
    "espace client",
    "prenotazione",
    "cancellazione",
    "frontoffice",
    "booking com",
    "airbnb",
    "vrbo",
  ].some((keyword) => normalizedContent.includes(keyword));

  if (!looksLikeReservationEmail) {
    return null;
  }

  let eventType: "new" | "modified" | "cancelled" | "unknown" = "unknown";

  if (
    normalizedContent.includes("new reservation") ||
    normalizedContent.includes("new resa") ||
    normalizedContent.includes("nuova prenotazione") ||
    normalizedContent.includes("new booking")
  ) {
    eventType = "new";
  } else if (
    normalizedContent.includes("modified") ||
    normalizedContent.includes("updated") ||
    normalizedContent.includes("updated on") ||
    normalizedContent.includes("modifica") ||
    normalizedContent.includes("modificata") ||
    normalizedContent.includes("modifie") ||
    normalizedContent.includes("mise a jour") ||
    normalizedContent.includes("details des reservations") ||
    normalizedContent.includes("details reservation")
  ) {
    eventType = "modified";
  } else if (
    normalizedContent.includes("reservation cancellation") ||
    normalizedContent.includes("cancellazione prenotazione") ||
    normalizedContent.includes("cancelled") ||
    normalizedContent.includes("canceled") ||
    normalizedContent.includes("annulation") ||
    normalizedContent.includes("cancel") ||
    normalizedContent.includes("cancellazione")
  ) {
    eventType = "cancelled";
  }

  const reservationReference = extractReservationReference(subject, plainText);
  const occurredAt =
    plainText.match(/(?:made on|updated on|cancelled on|mise a jour le)\s*(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/i)?.[1]?.trim() ||
    null;
  const arrivalDepartureMatch =
    plainText.match(/Arrival:\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*Departure:\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    plainText.match(/Arriv[ée]e?\s*:?\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*D[ée]part\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    plainText.match(/Arrivo\s*:?\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*Partenza\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i);
  const totalFare =
    plainText.match(/Total fare:\s*([^\n]+)/i)?.[1]?.trim() ||
    plainText.match(/Total amount:\s*([^\n]+)/i)?.[1]?.trim() ||
    plainText.match(/Montant total\s*:?\s*([^\n]+)/i)?.[1]?.trim() ||
    plainText.match(/Importo totale\s*:?\s*([^\n]+)/i)?.[1]?.trim() ||
    null;
  const guestCountValue =
    plainText.match(/Guests:\s*(\d+)/i)?.[1]?.trim() ||
    plainText.match(/Voyageurs\s*:?\s*(\d+)/i)?.[1]?.trim() ||
    plainText.match(/Ospiti\s*:?\s*(\d+)/i)?.[1]?.trim() ||
    null;
  const assignedRooms = extractFirstLineValue(plainText, ["Assigned rooms", "Chambres attribuées", "Camere assegnate"]);
  const reservationFor = extractFirstLineValue(plainText, ["Reservation for", "Réservation pour", "Prenotazione per"]);
  const roomName = assignedRooms || reservationFor?.replace(/^\d+\s*x\s*/i, "").split(" - ")[0]?.trim() || null;
  const customerName = extractFirstLineValue(plainText, ["Customer", "Client", "Cliente"]);
  const customerEmail = extractFirstLineValue(plainText, ["Email"]);
  const customerPhone = extractFirstLineValue(plainText, ["Phone", "Téléphone", "Telefono"]);
  const status = extractFirstLineValue(plainText, ["Status", "Statut", "Stato"]);

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
  const startedAt = new Date().toISOString();
  let syncRunId: string | null = null;

  console.log(`[sync-resend-krossbooking-emails] start limit=${limit} inspect_only=${inspectOnly}`);

  try {
    const { data: createdRun, error: createRunError } = await supabaseAdmin
      .from("reservation_email_sync_runs")
      .insert({
        source: "resend-receiving-api",
        inspect_only: inspectOnly,
        requested_limit: limit,
        status: "started",
        started_at: startedAt,
        details: {
          after: after || null,
          before: before || null,
          include_raw: includeRaw,
        },
      })
      .select("id")
      .single();

    if (createRunError) {
      console.error(`[sync-resend-krossbooking-emails] create run failed ${createRunError.message}`);
    } else {
      syncRunId = createdRun?.id ?? null;
    }

    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (after) params.set("after", after);
    if (before) params.set("before", before);

    const listResponse = await resendRequest(`/emails/receiving?${params.toString()}`);
    const listData = Array.isArray(listResponse?.data) ? listResponse.data : [];
    const processed: Array<Record<string, unknown>> = [];
    let matchedCount = 0;
    let ingestedCount = 0;
    let duplicateCount = 0;
    let ignoredCount = 0;
    let failedCount = 0;

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
        ignoredCount += 1;
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
        failedCount += 1;
        processed.push({
          emailId,
          senderEmail,
          subject,
          status: "ingest_failed",
          error: ingestText,
        });
        continue;
      }

      let ingestPayload: Record<string, unknown> | null = null;
      try {
        ingestPayload = ingestText ? JSON.parse(ingestText) : null;
      } catch {
        ingestPayload = null;
      }

      if (ingestPayload?.duplicate === true) {
        duplicateCount += 1;
        processed.push({
          emailId,
          senderEmail,
          subject,
          status: "duplicate",
          response: ingestPayload,
        });
        continue;
      }

      ingestedCount += 1;
      processed.push({
        emailId,
        senderEmail,
        subject,
        status: "ingested",
        response: ingestPayload ?? ingestText,
      });
    }

    const finishedAt = new Date().toISOString();
    const resultPayload = {
      success: true,
      inspectOnly,
      totalFetched: listData.length,
      matchedKrossbooking: matchedCount,
      ingested: ingestedCount,
      duplicates: duplicateCount,
      ignored: ignoredCount,
      failed: failedCount,
      processed,
    };

    if (syncRunId) {
      const { error: updateRunError } = await supabaseAdmin
        .from("reservation_email_sync_runs")
        .update({
          total_fetched: listData.length,
          matched_krossbooking: matchedCount,
          ingested: ingestedCount,
          status: failedCount > 0 ? "completed_with_errors" : "success",
          error_message: failedCount > 0 ? `${failedCount} email(s) failed during ingestion` : null,
          finished_at: finishedAt,
          details: {
            after: after || null,
            before: before || null,
            include_raw: includeRaw,
            duplicates: duplicateCount,
            ignored: ignoredCount,
            failed: failedCount,
            processed,
          },
        })
        .eq("id", syncRunId);

      if (updateRunError) {
        console.error(`[sync-resend-krossbooking-emails] update run failed ${updateRunError.message}`);
      }
    }

    console.log(`[sync-resend-krossbooking-emails] done matched=${matchedCount} ingested=${ingestedCount} duplicates=${duplicateCount}`);

    return new Response(JSON.stringify(resultPayload), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (syncRunId) {
      const { error: updateRunError } = await supabaseAdmin
        .from("reservation_email_sync_runs")
        .update({
          status: "error",
          error_message: message,
          finished_at: new Date().toISOString(),
        })
        .eq("id", syncRunId);

      if (updateRunError) {
        console.error(`[sync-resend-krossbooking-emails] update error run failed ${updateRunError.message}`);
      }
    }

    console.error(`[sync-resend-krossbooking-emails] error ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});