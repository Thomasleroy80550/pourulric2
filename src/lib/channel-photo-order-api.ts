import { supabase } from "@/integrations/supabase/client";
import type { ChannelProperty } from "./owner-channel-api";
import { ChannelApiError } from "./owner-channel-api";

export interface ChannelPhotoReorderResult {
  property_id: string;
  images: string[];
  photos_updated: number;
}

/** Réordonne les photos dans Cadence. Réservé aux administrateurs par le proxy et la base. */
export async function saveChannelPhotoOrder(property: ChannelProperty, photoUrls: string[]): Promise<ChannelPhotoReorderResult> {
  if (!property.assignment_id) throw new ChannelApiError("Attribution Cadence introuvable pour ce logement.");
  const { data, error } = await supabase.functions.invoke("owner-channel-proxy", {
    body: {
      action: "photo_reorder",
      assignment_id: property.assignment_id,
      images: photoUrls,
    },
  });
  if (error) {
    const response = error.context instanceof Response ? error.context : null;
    const payload = response ? await response.json().catch(() => null) : null;
    throw new ChannelApiError(payload?.error || error.message, response?.status === 429 ? 60 : 0);
  }
  if (data?.error) throw new ChannelApiError(data.error);
  return data as ChannelPhotoReorderResult;
}
