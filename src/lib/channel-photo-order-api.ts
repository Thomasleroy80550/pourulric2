import { supabase } from "@/integrations/supabase/client";
import type { ChannelProperty } from "./owner-channel-api";

export function channelPropertyScopeKey(property: ChannelProperty): string {
  return [property.agency_id, property.environment, property.id].join(":");
}

function scope(property: ChannelProperty) {
  if (!property.agency_id || !property.environment) throw new Error("Le périmètre Cadence du logement est incomplet.");
  return { property_id: property.id, agency_id: property.agency_id, environment: property.environment };
}

export async function getChannelPhotoOrders(): Promise<Map<string, string[]>> {
  const { data, error } = await supabase
    .from("channel_property_photo_orders")
    .select("property_id,agency_id,environment,photo_order");
  if (error) throw error;
  return new Map((data ?? []).map(row => [
    [row.agency_id, row.environment, row.property_id].join(":"),
    Array.isArray(row.photo_order) ? row.photo_order.filter((value): value is string => typeof value === "string") : [],
  ]));
}

export async function saveChannelPhotoOrder(property: ChannelProperty, photoOrder: string[]): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("channel_property_photo_orders")
    .upsert({
      ...scope(property),
      photo_order: photoOrder,
      updated_by: auth.user?.id ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "property_id,agency_id,environment" });
  if (error) throw error;
}
