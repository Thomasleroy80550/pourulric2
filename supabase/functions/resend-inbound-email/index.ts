import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend";

const PROJECT_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-resend-webhook-secret",
};

const resendApiKey = Deno.env.get("RESEND_API_KEY");
if (!resendApiKey) {
  throw new Error("RESEND_API_KEY is not configured.");
}

const resend = new Resend(resendApiKey);
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

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

function extractLineValue(text: string, label: string): string | null {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`${escapedLabel}\s*:?\s*(.+)`, "i");
  const match = text.match(regex);
  return match?.[1]?.trim() || null;
}

function extractReservationReference(text: string): string | null {
  return (
    text.match(/Reservation\s+n\.\s*([^\s\n]+(?:\/[^\s\n]+)?)/i)?.[1]?.trim() ||
    text.match(/Reservation\s+([^\s\n]+(?:\/[^\s\n]+)?)\s+cancelled/i)?.[1]?.trim() ||
    null
  );
}

function parseKrossbookingEvent(subject: string, plainText: string) {
  const normalizedSubject = normalizeText(subject);
  const fromReservationEmail = normalizedSubject.includes("reservation");

  if (!fromReservationEmail) {
    return null;
  }

  let eventType: "new" | "modified" | "cancelled" | null = null;

  if (normalizedSubject.includes("new reservation")) {
    eventType = "new";
  } else if (normalizedSubject.includes("modified") || normalizedSubject.includes("updated")) {
    eventType = "modified";
  } else if (
    normalizedSubject.includes("reservation cancellation") ||
    normalizedSubject.includes("cancelled") ||
    normalizedSubject.includes("canceled") ||
    normalizedSubject.includes("annulation") ||
    normalizedSubject.includes("cancel")
  ) {
    eventType = "cancelled";
  }

  const reservationReference = extractReservationReference(plainText);
  const occurredAt = plainText.match(/(?:made on|updated on|cancelled on)\s*(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/i)?.[1]?.trim() || null;
  const arrivalDepartureMatch = plainText.match(/Arrival:\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*Departure:\s*(\d{2}\/\d{2}\/\d{4})/i);
  const totalFare =
    plainText.match(/Total fare:\s*([^\n]+)/i)?.[1]?.trim() ||
    plainText.match(/Total amount:\s*([^\n]+)/i)?.[1]?.trim() ||
    null;
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
    eventType: eventType ?? "unknown",
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

async function ingestKrossbookingReservationEvent(payload: {
  eventType: string;
  reservationReference: string;
  reservationId: string;
  occurredAt: string | null;
  roomName: string;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  arrivalDate: string | null;
  departureDate: string | null;
  totalAmount: string | null;
  guestCount: number | null;
  reservationStatus: string | null;
  subject: string;
  rawPayload: Record<string, unknown>;
}) {
  const ingestSecret =
    Deno.env.get("RESERVATION_EMAIL_INGEST_SECRET") ??
    Deno.env.get("CRON_SECRET_NOTIFY_NEW_RESA") ??
    Deno.env.get("CRON_SECRET");

  if (!ingestSecret) {
    console.warn("[resend-inbound-email] missing ingest secret, skipping reservation ingestion");
    return;
  }

  const safeOccurredAt = payload.occurredAt ?? new Date().toISOString();
  const eventKey = `${payload.reservationReference}-${payload.eventType}-${safeOccurredAt}`;

  const response = await fetch(`${PROJECT_URL}/functions/v1/ingest-reservation-email-event`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ingestSecret}`,
    },
    body: JSON.stringify({
      event_key: eventKey,
      event_type: payload.eventType,
      source: "resend-inbound-krossbooking",
      occurred_at: safeOccurredAt,
      reservation_reference: payload.reservationReference,
      reservation_id: payload.reservationId,
      room_name: payload.roomName,
      guest_name: payload.guestName,
      guest_email: payload.guestEmail,
      guest_phone: payload.guestPhone,
      arrival_date: payload.arrivalDate,
      departure_date: payload.departureDate,
      total_amount: payload.totalAmount,
      guest_count: payload.guestCount,
      reservation_status: payload.reservationStatus,
      subject: payload.subject,
      raw_payload: payload.rawPayload,
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`ingest-reservation-email-event failed: ${response.status} ${responseText}`);
  }

  console.log(`[resend-inbound-email] krossbooking event ingested ${responseText}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const providedSecret = req.headers.get("x-resend-webhook-secret");
    const expectedSecret =
      Deno.env.get("RESEND_INBOUND_WEBHOOK_SECRET") ??
      Deno.env.get("CRON_SECRET_NOTIFY_NEW_RESA") ??
      Deno.env.get("CRON_SECRET");

    if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
      console.warn("[resend-inbound-email] unauthorized webhook");
      return new Response(JSON.stringify({ error: "Unauthorized webhook" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const payload = await req.json();
    console.log("[resend-inbound-email] webhook received");

    const subject: string = payload?.subject ?? "(sans sujet)";
    const fromEmail: string | undefined =
      payload?.from?.address ??
      payload?.from?.email ??
      (typeof payload?.from === "string" ? payload.from : undefined);
    const toEmail: string | undefined =
      payload?.to?.[0]?.address ??
      payload?.to?.[0]?.email ??
      (Array.isArray(payload?.to) ? payload.to[0] : undefined);

    const textBody: string | undefined = payload?.text ?? undefined;
    const htmlBody: string | undefined = payload?.html ?? undefined;
    const plainBody = (textBody && textBody.trim()) || stripHtml(htmlBody);

    let contactEmail = "contact@hellokeys.fr";
    const { data: contactSetting } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "contact_email")
      .maybeSingle();

    if (contactSetting?.value) {
      const maybe = typeof contactSetting.value === "string" ? contactSetting.value : contactSetting.value?.email;
      if (maybe && typeof maybe === "string") {
        contactEmail = maybe;
      }
    }

    const normalizedSender = normalizeText(fromEmail ?? "");
    const isKrossbookingSender = normalizedSender.includes("noreply krossbooking com") || (fromEmail ?? "").toLowerCase() === "noreply@krossbooking.com";

    if (isKrossbookingSender) {
      const parsedEvent = parseKrossbookingEvent(subject, plainBody);
      if (parsedEvent && parsedEvent.eventType !== "unknown") {
        try {
          await ingestKrossbookingReservationEvent({
            ...parsedEvent,
            subject,
            rawPayload: payload,
          });
        } catch (ingestError) {
          const message = ingestError instanceof Error ? ingestError.message : String(ingestError);
          console.error(`[resend-inbound-email] reservation ingestion failed ${message}`);
        }
      } else {
        console.log(`[resend-inbound-email] ignored krossbooking email subject=${subject}`);
      }
    }

    const fwdSubject = `FWD: ${subject}`;
    const fwdHtml = `
      <div>
        <p><strong>Email entrant</strong></p>
        <p><strong>De:</strong> ${fromEmail ?? "inconnu"}</p>
        <p><strong>À:</strong> ${toEmail ?? "inconnu"}</p>
        <hr/>
        ${htmlBody ?? (textBody ? `<pre>${textBody}</pre>` : "<em>(corps vide)</em>")}
      </div>
    `;

    await resend.emails.send({
      from: "Hello Keys Inbound <noreply@notifications.hellokeys.fr>",
      to: [contactEmail],
      subject: fwdSubject,
      html: fwdHtml,
    });

    if (fromEmail) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", fromEmail)
        .maybeSingle();

      if (profile?.id) {
        const { data: existingConv } = await supabaseAdmin
          .from("conversations")
          .select("id")
          .eq("user_id", profile.id)
          .eq("subject", subject)
          .limit(1)
          .maybeSingle();

        let conversationId = existingConv?.id;
        if (!conversationId) {
          const { data: newConv } = await supabaseAdmin
            .from("conversations")
            .insert({ user_id: profile.id, subject })
            .select("id")
            .single();
          conversationId = newConv?.id;
        }

        if (conversationId) {
          const content = plainBody.replace(/\s+/g, " ").trim();
          await supabaseAdmin.from("messages").insert({
            conversation_id: conversationId,
            sender_id: profile.id,
            content: content || "(email reçu)",
          });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[resend-inbound-email] error ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});