import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callCadence, ChannelFeatureError, validatePricingPeriods, validatePricingRead, validatePricingResponse } from "./features.ts";
import { storeBeyondLinked } from "./beyond.ts";

type Period = ReturnType<typeof validatePricingPeriods>[number];
type Assignment = { id: string; client_profile_id: string; user_room_id: string; property_id: string; agency_id: string; environment: string; beyond_linked: boolean };
type SeasonRequest = { id: string; user_id: string; room_id: string; season_year: number; items: Record<string, unknown>[]; cadence_send_started_at: string };

function nextDay(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

// Cadence remplace toutes les périodes propriétaire : ne retirer que les portions
// remplacées par la demande, en préservant les autres saisons et les trous fermés.
export function mergeSeasonPeriods(existing: Period[], requested: Period[]): Period[] {
  let kept = existing;
  for (const incoming of requested) {
    kept = kept.flatMap(period => {
      if (period.end_date < incoming.start_date || period.start_date > incoming.end_date) return [period];
      const pieces: Period[] = [];
      if (period.start_date < incoming.start_date) pieces.push({ ...period, end_date: nextDay(incoming.start_date, -1) });
      if (period.end_date > incoming.end_date) pieces.push({ ...period, start_date: nextDay(incoming.end_date, 1) });
      return pieces;
    });
  }
  return [...kept, ...requested].sort((a, b) => a.start_date.localeCompare(b.start_date));
}

export async function sendSeasonToCadence(db: SupabaseClient, body: Record<string, unknown>, adminId: string, isAdmin: boolean) {
  if (!isAdmin) throw new ChannelFeatureError(403, "Seul un administrateur peut valider et envoyer une demande à Cadence.");
  if (body.confirmed !== true || typeof body.request_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.request_id) || !body.expected_request || typeof body.expected_request !== "object" || Array.isArray(body.expected_request)) {
    throw new ChannelFeatureError(400, "Demande affichée et confirmation explicite requises.");
  }
  const { data: prepared, error: prepareError } = await db.rpc("prepare_season_cadence_send", { p_request_id: body.request_id, p_admin_id: adminId, p_expected_request: body.expected_request });
  if (prepareError) throw new ChannelFeatureError(409, prepareError.message);
  if (prepared.already_sent) return { already_sent: true, request: prepared.request };
  const request = prepared.request as SeasonRequest;
  const assignment = prepared.assignment as Assignment;
  let posted = false;
  try {
    if (!Array.isArray(request.items) || !request.items.length || request.items.length > 500 || request.items.some(item => !item || typeof item !== "object" || Array.isArray(item))) throw new ChannelFeatureError(400, "Complétez les périodes de la demande avant de valider.");
    const openItems = request.items.filter(item => item.closed !== true);
    const closureCount = request.items.length - openItems.length;
    if (!openItems.length) throw new ChannelFeatureError(400, "Aucune période tarifaire ouverte à transmettre.");
    const requested = validatePricingPeriods(openItems.map(item => {
      if (typeof item.start_date !== "string" || typeof item.end_date !== "string" || item.start_date < "2027-01-01" || item.end_date > "2028-01-04") {
        throw new ChannelFeatureError(400, "Les dates doivent appartenir à la saison 2027 (jusqu’au 4 janvier 2028).");
      }
      if (item.closed_on_arrival || item.closed_on_departure) throw new ChannelFeatureError(400, "L’API tarifaire ne gère pas les fermetures aux arrivées/départs. Traitez-les séparément.");
      if (typeof item.price !== "number" || item.price <= 0 || typeof item.min_stay !== "number") {
        throw new ChannelFeatureError(400, "Renseignez un prix et un séjour minimum pour chaque période ouverte avant l’envoi.");
      }
      return { start_date: item.start_date, end_date: item.end_date, price: item.price, min_stay: item.min_stay, label: item.period_type };
    }));

    const detail = await callCadence("owner-site-properties", { params: { property_id: assignment.property_id } });
    const property = Array.isArray(detail.properties) ? detail.properties.find((item: Record<string, unknown>) => typeof item?.id === "string" && item.id.toLowerCase() === assignment.property_id.toLowerCase()) : null;
    if (!property || detail.agency_id !== assignment.agency_id || detail.environment !== assignment.environment) {
      throw new ChannelFeatureError(409, "L’agence ou l’environnement Cadence ne correspond plus à l’attribution.");
    }
    if (typeof property.beyond_linked === "boolean") await storeBeyondLinked(db, assignment, [property]);
    const pricing = validatePricingRead(await callCadence("owner-site-pricing", { params: { property_id: assignment.property_id } }), assignment);
    const beyondLinked = property.beyond_linked === true || pricing.beyond_linked;
    await storeBeyondLinked(db, assignment, [{ id: assignment.property_id, beyond_linked: beyondLinked }]);
    if (beyondLinked) throw new ChannelFeatureError(409, "Ce logement utilise Smart Pricing : aucun tarif ne peut être envoyé.");

    const existing = pricing.periods.filter(period => period.source === "owner" && period.end_date >= new Date().toISOString().slice(0, 10)).map(period => ({
      start_date: period.start_date,
      end_date: period.end_date,
      price: period.price,
      min_stay: period.min_stay || 1,
      ...(period.max_stay != null ? { max_stay: period.max_stay } : {}),
      ...(period.label ? { label: period.label } : {}),
    }));
    const periods = validatePricingPeriods(mergeSeasonPeriods(existing, requested));
    const { data: current, error: currentError } = await db.from("channel_property_assignments").select("client_profile_id,user_room_id,agency_id,environment,beyond_linked").eq("id", assignment.id).single();
    if (currentError) throw currentError;
    if (current.client_profile_id !== request.user_id || current.user_room_id !== assignment.user_room_id || current.agency_id !== assignment.agency_id || current.environment !== assignment.environment || current.beyond_linked) {
      throw new ChannelFeatureError(409, "L’attribution du logement a changé. Rechargez la demande.");
    }
    console.info("[owner-channel-proxy] admin validated season pricing", { requestId: request.id, adminId, propertyId: assignment.property_id, periods: requested.length, closuresNotSent: closureCount });
    posted = true;
    const result = validatePricingResponse(await callCadence("owner-site-pricing", {
      method: "POST",
      body: { property_id: assignment.property_id, periods },
    }), assignment, periods.length);
    if (result.periods_ignored !== 0 || result.periods_applied !== periods.length || result.periods_received !== periods.length) {
      throw new ChannelFeatureError(502, "Cadence n’a pas confirmé toutes les périodes. Vérifiez les tarifs avant de réessayer.");
    }
    const warning = [
      typeof result.warning === "string" ? result.warning : null,
      !result.pushed_to_nextpax ? "La diffusion sur les plateformes n’est pas encore confirmée." : null,
      closureCount ? `${closureCount} période(s) de fermeture non transmise(s) : à gérer séparément dans Cadence.` : null,
    ].filter(Boolean).join(" ");
    const { data: saved, error: saveError } = await db.from("season_price_requests").update({
      cadence_send_status: "sent", cadence_sent_at: new Date().toISOString(), cadence_sent_by: adminId,
      cadence_error: warning || null, cadence_pushed_to_nextpax: result.pushed_to_nextpax,
    }).eq("id", request.id).eq("cadence_send_started_at", request.cadence_send_started_at).select("*").single();
    if (saveError) throw saveError;
    console.info("[owner-channel-proxy] season pricing sent", { requestId: request.id, propertyId: assignment.property_id, pushedToNextPax: result.pushed_to_nextpax });
    return { request: saved, warning: warning || null, periods_sent: requested.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Envoi Cadence indisponible.";
    const detail = posted ? `${message} Un appel d’écriture a été tenté : contrôlez Cadence avant toute reprise.` : message;
    const { error: updateError } = await db.from("season_price_requests").update({ cadence_send_status: "failed", cadence_error: detail.slice(0, 1500) }).eq("id", request.id).eq("cadence_send_started_at", request.cadence_send_started_at);
    if (updateError) console.error("[owner-channel-proxy] season send error persistence failed", { requestId: request.id, message: updateError.message });
    console.error("[owner-channel-proxy] season send failed", { requestId: request.id, message: detail });
    throw new ChannelFeatureError(error instanceof ChannelFeatureError ? error.status : 503, detail);
  }
}
