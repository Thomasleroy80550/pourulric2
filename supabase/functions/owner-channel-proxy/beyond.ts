import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Stores Cadence's per-property `beyond_linked` flag on every assignment of the
 * imported properties. A property whose payload carries no boolean flag is left
 * untouched: a missing value is never read as "not linked".
 */
export async function storeBeyondLinked(
  db: SupabaseClient,
  scope: { agency_id: string; environment: string },
  properties: { id: string; beyond_linked?: unknown }[],
) {
  for (const linked of [true, false]) {
    const ids = properties.filter(property => property.beyond_linked === linked).map(property => property.id);
    if (!ids.length) continue;
    const { data, error } = await db.from("channel_property_assignments").update({ beyond_linked: linked })
      .in("property_id", ids).eq("agency_id", scope.agency_id).eq("environment", scope.environment)
      .neq("beyond_linked", linked).select("id");
    if (error) throw error;
    if (data.length) console.info("[owner-channel-proxy] beyond_linked refreshed", { linked, assignments: data.length });
  }
}
