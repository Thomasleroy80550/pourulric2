import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

type Selection = { property_id: string; client_profile_id: string };
type Catalog = { properties: { id: string }[]; agency_id: string; environment: string };
type Result = Selection & { success: boolean; message: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadOnboardingContext(db: SupabaseClient) {
  const owners: Record<string, unknown>[] = [];
  const rooms: Record<string, unknown>[] = [];
  const assignments: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from("profiles").select("id,first_name,last_name,email,property_address,property_city")
      .eq("role", "user").eq("is_banned", false).or("is_contract_terminated.is.null,is_contract_terminated.eq.false")
      .order("id").range(offset, offset + 999);
    if (error) throw error;
    owners.push(...data);
    if (data.length < 1000) break;
  }
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from("user_rooms").select("user_id,room_name").order("id").range(offset, offset + 999);
    if (error) throw error;
    rooms.push(...data);
    if (data.length < 1000) break;
  }
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from("channel_property_assignments").select("*").order("id").range(offset, offset + 999);
    if (error) throw error;
    assignments.push(...data);
    if (data.length < 1000) break;
  }
  return { owners, rooms, assignments };
}

export async function assignOnboardingBatch(
  db: SupabaseClient,
  body: Record<string, unknown>,
  upstream: (params: Record<string, string>) => Promise<Catalog>,
) {
  const raw = body.selections;
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 20 ||
      typeof body.agency_id !== "string" || !body.agency_id || typeof body.environment !== "string" || !body.environment ||
      raw.some(item => !item || typeof item.property_id !== "string" || !uuid.test(item.property_id) ||
        typeof item.client_profile_id !== "string" || !uuid.test(item.client_profile_id))) {
    return { status: 400, body: { error: "Sélection invalide (1 à 20 logements par lot, profil et contexte requis)." } };
  }
  const selections: Selection[] = raw.map(item => ({ property_id: item.property_id.toLowerCase(), client_profile_id: item.client_profile_id.toLowerCase() }));
  if (new Set(selections.map(item => item.property_id)).size !== selections.length) {
    return { status: 400, body: { error: "Un logement ne peut figurer qu’une fois dans un lot." } };
  }
  const { data: owners, error: ownerError } = await db.from("profiles").select("id")
    .in("id", selections.map(item => item.client_profile_id)).eq("role", "user").eq("is_banned", false)
    .or("is_contract_terminated.is.null,is_contract_terminated.eq.false");
  if (ownerError) throw ownerError;
  const ownerIds = new Set(owners.map(owner => owner.id));
  const { data: existing, error: existingError } = await db.from("channel_property_assignments").select("property_id")
    .in("property_id", selections.map(item => item.property_id)).eq("agency_id", body.agency_id).eq("environment", body.environment);
  if (existingError) throw existingError;
  const assignedIds = new Set(existing.map(link => link.property_id));
  const results: Result[] = [];
  const verified: Selection[] = [];
  let retryAfter = 0;
  let stoppedMessage = "";
  for (const item of selections) {
    if (stoppedMessage) { results.push({ ...item, success: false, message: stoppedMessage }); continue; }
    if (!ownerIds.has(item.client_profile_id)) {
      results.push({ ...item, success: false, message: "Ce profil n’est pas un propriétaire actif." }); continue;
    }
    if (assignedIds.has(item.property_id)) {
      results.push({ ...item, success: false, message: "Ce logement est déjà attribué. Aucun lien existant modifié." }); continue;
    }
    try {
      const detail = await upstream({ property_id: item.property_id });
      if (detail.agency_id !== body.agency_id || detail.environment !== body.environment) {
        stoppedMessage = "L’agence ou l’environnement de la clé a changé. Rechargez le catalogue.";
        results.push({ ...item, success: false, message: stoppedMessage }); continue;
      }
      if (!detail.properties.some(property => property.id.toLowerCase() === item.property_id)) {
        results.push({ ...item, success: false, message: "Logement absent ou supprimé." }); continue;
      }
      verified.push(item);
    } catch (error) {
      const status = error && typeof error === "object" && "status" in error ? Number(error.status) : 500;
      const message = error instanceof Error ? error.message : "Impossible de vérifier ce logement.";
      results.push({ ...item, success: false, message });
      if (status === 429) retryAfter = 60;
      if (status !== 404) stoppedMessage = message;
    }
  }
  if (verified.length) {
    const { error } = await db.from("channel_property_assignments").upsert(
      verified.map(item => ({ ...item, agency_id: body.agency_id, environment: body.environment })),
      { onConflict: "client_profile_id,property_id,agency_id,environment", ignoreDuplicates: true },
    );
    if (error) throw error;
    verified.forEach(item => results.push({ ...item, success: true, message: "Logement attribué." }));
    console.info("[owner-channel-proxy] onboarding batch assigned", { count: verified.length });
  }
  return { status: 200, body: { results, retry_after: retryAfter, stopped: Boolean(stoppedMessage) } };
}
