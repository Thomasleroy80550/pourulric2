import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend";
import { format, isValid, parseISO } from "npm:date-fns";
import { fr } from "npm:date-fns/locale/fr";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const CRON_SECRETS = [
  Deno.env.get("CRON_SECRET"),
  Deno.env.get("CRON_SECRET_2"),
  Deno.env.get("CRONSECRETNOTIFYNEWRESA"),
  Deno.env.get("CRON_SECRET_NOTIFY_NEW_RESA"),
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
const resend = new Resend(RESEND_API_KEY);
const euroFormatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function isAllowedCronSecret(value: string): boolean {
  return !!value && CRON_SECRETS.includes(value.trim());
}

interface UserRoom {
  room_id: string | number;
  room_name?: string | null;
}

interface UserProfile {
  id: string;
  first_name: string | null;
  email: string | null;
  user_rooms: UserRoom[] | null;
  notify_new_booking_email: boolean;
  notify_cancellation_email: boolean;
  notify_booking_change_email: boolean;
}

interface ProcessedReservationRow {
  reservation_id: string;
  status: string;
  check_in_date: string | null;
  check_out_date: string | null;
  amount: number | null;
}

interface ReservationSnapshot {
  id: string;
  guest_name: string;
  property_name: string;
  check_in_date: string | null;
  check_out_date: string | null;
  amount: number | null;
  status: string;
}

interface ReservationChange {
  label: string;
  before: string;
  after: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return "—";

  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, "dd MMMM yyyy", { locale: fr }) : value;
}

function parseAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/\s/g, "").replace("€", "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function formatAmount(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return euroFormatter.format(value);
}

function hasAmountChanged(before: number | null, after: number | null): boolean {
  if (before === null && after === null) return false;
  return before !== after;
}

function buildReservationSnapshot(profile: UserProfile, reservation: any): ReservationSnapshot {
  return {
    id: String(reservation.id_reservation),
    guest_name: reservation.label || "N/A",
    property_name: profile.user_rooms?.find((room) => String(room.room_id) === String(reservation.id_room))?.room_name || "Logement",
    check_in_date: reservation.arrival || null,
    check_out_date: reservation.departure || null,
    amount: parseAmount(reservation.charge_total_amount),
    status: reservation.cod_reservation_status || "",
  };
}

function getReservationChanges(before: ProcessedReservationRow, after: ReservationSnapshot): ReservationChange[] {
  const changes: ReservationChange[] = [];

  if ((before.check_in_date ?? null) !== (after.check_in_date ?? null)) {
    changes.push({
      label: "Arrivée",
      before: formatDisplayDate(before.check_in_date),
      after: formatDisplayDate(after.check_in_date),
    });
  }

  if ((before.check_out_date ?? null) !== (after.check_out_date ?? null)) {
    changes.push({
      label: "Départ",
      before: formatDisplayDate(before.check_out_date),
      after: formatDisplayDate(after.check_out_date),
    });
  }

  if (hasAmountChanged(before.amount ?? null, after.amount ?? null)) {
    changes.push({
      label: "Montant",
      before: formatAmount(before.amount),
      after: formatAmount(after.amount),
    });
  }

  return changes;
}

async function sendEmail(profile: UserProfile, subject: string, html: string) {
  if (!profile.email) {
    console.warn(`[check-new-reservations] Aucun email pour l'utilisateur ${profile.id}, envoi ignoré.`);
    return;
  }

  try {
    await resend.emails.send({
      from: "Hello Keys <noreply@notifications.hellokeys.fr>",
      to: [profile.email],
      subject,
      html,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[check-new-reservations] Erreur d'envoi d'email pour l'utilisateur ${profile.id}: ${message}`);
  }
}

async function sendNewBookingEmail(profile: UserProfile, reservation: ReservationSnapshot) {
  const subject = `Nouvelle réservation pour ${reservation.property_name}`;
  const html = `
    <h1>Nouvelle réservation</h1>
    <p>Bonjour ${escapeHtml(profile.first_name || "")},</p>
    <p>Une nouvelle réservation a été enregistrée pour votre logement <strong>${escapeHtml(reservation.property_name)}</strong>.</p>
    <ul>
      <li><strong>Client :</strong> ${escapeHtml(reservation.guest_name)}</li>
      <li><strong>Arrivée :</strong> ${escapeHtml(formatDisplayDate(reservation.check_in_date))}</li>
      <li><strong>Départ :</strong> ${escapeHtml(formatDisplayDate(reservation.check_out_date))}</li>
      <li><strong>Montant :</strong> ${escapeHtml(formatAmount(reservation.amount))}</li>
    </ul>
    <p>Vous pouvez consulter les détails sur votre espace propriétaire.</p>
  `;

  await sendEmail(profile, subject, html);
  console.log(`[check-new-reservations] Email de nouvelle réservation envoyé à ${profile.email} pour la réservation ${reservation.id}.`);
}

async function sendCancellationEmail(profile: UserProfile, reservation: ReservationSnapshot) {
  const subject = `Annulation de réservation pour ${reservation.property_name}`;
  const html = `
    <h1>Annulation de réservation</h1>
    <p>Bonjour ${escapeHtml(profile.first_name || "")},</p>
    <p>La réservation suivante pour votre logement <strong>${escapeHtml(reservation.property_name)}</strong> a été annulée :</p>
    <ul>
      <li><strong>Client :</strong> ${escapeHtml(reservation.guest_name)}</li>
      <li><strong>Date d'arrivée prévue :</strong> ${escapeHtml(formatDisplayDate(reservation.check_in_date))}</li>
    </ul>
    <p>Cette réservation a été retirée de votre calendrier.</p>
  `;

  await sendEmail(profile, subject, html);
  console.log(`[check-new-reservations] Email d'annulation envoyé à ${profile.email} pour la réservation ${reservation.id}.`);
}

async function sendModificationEmail(
  profile: UserProfile,
  reservation: ReservationSnapshot,
  changes: ReservationChange[],
) {
  const subject = `Modification de réservation pour ${reservation.property_name}`;
  const changesHtml = changes
    .map(
      (change) => `
        <li>
          <strong>${escapeHtml(change.label)} :</strong>
          ${escapeHtml(change.before)} → ${escapeHtml(change.after)}
        </li>
      `,
    )
    .join("");

  const html = `
    <h1>Modification de réservation</h1>
    <p>Bonjour ${escapeHtml(profile.first_name || "")},</p>
    <p>La réservation de <strong>${escapeHtml(reservation.guest_name)}</strong> pour votre logement <strong>${escapeHtml(reservation.property_name)}</strong> a été modifiée.</p>
    <ul>
      ${changesHtml}
    </ul>
    <p>Vous pouvez consulter les détails mis à jour sur votre espace propriétaire.</p>
  `;

  await sendEmail(profile, subject, html);
  console.log(`[check-new-reservations] Email de modification envoyé à ${profile.email} pour la réservation ${reservation.id}.`);
}

async function insertNotification(userId: string, message: string, link: string) {
  const { error } = await supabaseAdmin.from("notifications").insert({
    user_id: userId,
    message,
    link,
  });

  if (error) {
    console.error(`[check-new-reservations] Erreur lors de la création de la notification pour ${userId}: ${error.message}`);
  }
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
  const isCron = isAllowedCronSecret(headerToken) || isAllowedCronSecret(bodyToken);

  if (!isCron) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const seed = body.seed === true;
  const inspectLogs = body.inspect_logs === true;
  const logsLimit = typeof body.logs_limit === "number" ? body.logs_limit : 20;
  const logsOffset = typeof body.logs_offset === "number" ? body.logs_offset : 0;
  const logsPage = typeof body.logs_page === "number" ? body.logs_page : null;
  const limitProfiles = typeof body.limit_profiles === "number" ? body.limit_profiles : null;
  const filterUserId = typeof body.user_id === "string" ? body.user_id.trim() : "";
  const filterProfileEmail = typeof body.profile_email === "string" ? body.profile_email.trim() : "";
  const stats = {
    processedProfiles: 0,
    processedReservations: 0,
    newBookings: 0,
    cancellations: 0,
    modifications: 0,
    seededOnly: seed,
  };

  console.log(
    `[check-new-reservations] Début d'exécution seed=${seed} inspect_logs=${inspectLogs} limit_profiles=${limitProfiles ?? "all"} user_id=${filterUserId || "all"} profile_email=${filterProfileEmail || "all"}`,
  );

  try {
    if (inspectLogs) {
      const proxyResponse = await fetch(`${SUPABASE_URL}/functions/v1/krossbooking-proxy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${bodyToken || headerToken}`,
        },
        body: JSON.stringify({
          action: "get_reservations_log",
          cron_secret: bodyToken || headerToken,
          limit: logsLimit,
          offset: logsOffset,
          ...(logsPage !== null ? { page: logsPage } : {}),
        }),
      });

      const rawText = await proxyResponse.text();
      if (!proxyResponse.ok) {
        console.error(`[check-new-reservations] Erreur lors de l'inspection des logs: ${proxyResponse.status} ${rawText}`);
        return new Response(JSON.stringify({ error: rawText || "Unable to fetch reservation logs" }), {
          status: proxyResponse.status,
          headers: corsHeaders,
        });
      }

      let logsResponse: Record<string, unknown> = {};
      try {
        logsResponse = rawText ? JSON.parse(rawText) : {};
      } catch {
        logsResponse = { raw: rawText };
      }

      const logsData = Array.isArray(logsResponse?.data?.data)
        ? logsResponse.data.data
        : Array.isArray(logsResponse?.data)
          ? logsResponse.data
          : [];
      const firstEntry = logsData[0] ?? null;
      const firstEntryKeys = firstEntry && typeof firstEntry === "object" ? Object.keys(firstEntry as Record<string, unknown>) : [];

      console.log(`[check-new-reservations] Inspection logs récupérés count=${logsData.length}`);

      return new Response(JSON.stringify({
        success: true,
        inspectLogs: true,
        count: logsData.length,
        firstEntryKeys,
        sample: logsData.slice(0, 5),
        rawResponse: logsResponse,
      }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    let profilesQuery = supabaseAdmin
      .from("profiles")
      .select(`
        id,
        first_name,
        email,
        notify_new_booking_email,
        notify_cancellation_email,
        notify_booking_change_email,
        user_rooms(room_id, room_name)
      `);

    if (filterUserId) {
      profilesQuery = profilesQuery.eq("id", filterUserId);
    }

    if (filterProfileEmail) {
      profilesQuery = profilesQuery.eq("email", filterProfileEmail);
    }

    if (limitProfiles && limitProfiles > 0) {
      profilesQuery = profilesQuery.limit(limitProfiles);
    }

    const { data: profiles, error: profilesError } = await profilesQuery;

    if (profilesError) {
      throw profilesError;
    }

    for (const profile of (profiles || []) as UserProfile[]) {
      if (!profile.user_rooms || profile.user_rooms.length === 0) {
        continue;
      }

      stats.processedProfiles += 1;

      const proxyResponse = await fetch(`${SUPABASE_URL}/functions/v1/krossbooking-proxy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${bodyToken || headerToken}`,
        },
        body: JSON.stringify({
          action: "get_reservations_for_user_rooms",
          rooms: profile.user_rooms,
          cron_secret: bodyToken || headerToken,
        }),
      });

      if (!proxyResponse.ok) {
        const errorText = await proxyResponse.text();
        console.error(`[check-new-reservations] Erreur Krossbooking pour l'utilisateur ${profile.id}: ${proxyResponse.status} ${errorText}`);
        continue;
      }

      const reservationsResponse = await proxyResponse.json();
      const reservations = Array.isArray(reservationsResponse?.data) ? reservationsResponse.data : [];

      const { data: processedReservations, error: processedError } = await supabaseAdmin
        .from("processed_reservations")
        .select("reservation_id, status, check_in_date, check_out_date, amount")
        .eq("user_id", profile.id);

      if (processedError) {
        console.error(`[check-new-reservations] Erreur de récupération des réservations traitées pour ${profile.id}: ${processedError.message}`);
        continue;
      }

      const processedMap = new Map<string, ProcessedReservationRow>(
        (processedReservations || []).map((reservation) => [String(reservation.reservation_id), reservation as ProcessedReservationRow]),
      );

      for (const reservation of reservations) {
        const currentReservation = buildReservationSnapshot(profile, reservation);
        const storedReservation = processedMap.get(currentReservation.id);
        stats.processedReservations += 1;

        if (!seed) {
          if (!storedReservation) {
            if (currentReservation.status !== "CANC") {
              if (profile.notify_new_booking_email) {
                await sendNewBookingEmail(profile, currentReservation);
              }
              await insertNotification(
                profile.id,
                `Nouvelle réservation : ${currentReservation.property_name} (${currentReservation.guest_name}, ${formatDisplayDate(currentReservation.check_in_date)} → ${formatDisplayDate(currentReservation.check_out_date)})`,
                "/calendar",
              );
              stats.newBookings += 1;
            }
          } else if (storedReservation.status !== "CANC" && currentReservation.status === "CANC") {
            if (profile.notify_cancellation_email) {
              await sendCancellationEmail(profile, currentReservation);
            }
            await insertNotification(
              profile.id,
              `Annulation de réservation : ${currentReservation.property_name} (${currentReservation.guest_name}, arrivée ${formatDisplayDate(currentReservation.check_in_date)})`,
              "/bookings",
            );
            stats.cancellations += 1;
          } else if (storedReservation.status !== "CANC" && currentReservation.status !== "CANC") {
            const changes = getReservationChanges(storedReservation, currentReservation);

            if (changes.length > 0) {
              if (profile.notify_booking_change_email) {
                await sendModificationEmail(profile, currentReservation, changes);
              }
              await insertNotification(
                profile.id,
                `Réservation modifiée : ${currentReservation.property_name} (${currentReservation.guest_name})`,
                "/calendar",
              );
              stats.modifications += 1;
            }
          }
        }

        const { error: upsertError } = await supabaseAdmin.from("processed_reservations").upsert(
          {
            user_id: profile.id,
            reservation_id: currentReservation.id,
            status: currentReservation.status,
            check_in_date: currentReservation.check_in_date,
            check_out_date: currentReservation.check_out_date,
            amount: currentReservation.amount,
            last_processed_at: new Date().toISOString(),
          },
          { onConflict: "user_id,reservation_id" },
        );

        if (upsertError) {
          console.error(`[check-new-reservations] Erreur lors de l'upsert de la réservation ${currentReservation.id} pour l'utilisateur ${profile.id}: ${upsertError.message}`);
        }
      }
    }

    console.log(`[check-new-reservations] Exécution terminée. seed=${seed} profils=${stats.processedProfiles} réservations=${stats.processedReservations} nouvelles=${stats.newBookings} annulations=${stats.cancellations} modifications=${stats.modifications}`);

    return new Response(JSON.stringify({ success: true, stats }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[check-new-reservations] Erreur dans la fonction: ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});