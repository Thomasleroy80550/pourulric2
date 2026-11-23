import { supabase } from "@/integrations/supabase/client";
import type { SeasonPricingRequest } from "@/lib/season-pricing-api";

export async function sendSeasonRequestToCadence(request: SeasonPricingRequest): Promise<{ request: SeasonPricingRequest; warning?: string | null; already_sent?: boolean }> {
  const { data, error } = await supabase.functions.invoke("owner-channel-proxy", {
    body: {
      action: "season_send", request_id: request.id, confirmed: true,
      expected_request: { user_id: request.user_id, room_id: request.room_id, season_year: request.season_year, items: request.items },
    },
  });
  if (error) {
    const response = error.context instanceof Response ? error.context : null;
    const payload = response ? await response.json().catch(() => null) : null;
    throw new Error(payload?.error || error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
