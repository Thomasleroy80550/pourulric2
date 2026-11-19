import { supabase } from "@/integrations/supabase/client";

export interface ChannelProperty {
  id: string;
  name?: string;
  title?: string;
  property_name?: string;
  agency_id?: string;
  environment?: string;
}
export interface ChannelAssignment {
  id: string;
  client_profile_id: string;
  property_id: string;
  agency_id: string;
  environment: string;
}
export interface ChannelPage {
  properties: ChannelProperty[];
  agency_id?: string;
  environment?: string;
  next_cursor: string | null;
}
export class ChannelApiError extends Error {
  constructor(message: string, public retryAfter: number = 0) { super(message); }
}
export function channelPropertyName(property: ChannelProperty) {
  return [property.name, property.title, property.property_name].find(value => typeof value === "string" && value.trim()) || property.id;
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("owner-channel-proxy", { body });
  if (error) {
    const response = error.context instanceof Response ? error.context : null;
    const payload = response ? await response.json().catch(() => null) : null;
    throw new ChannelApiError(payload?.error || error.message, response?.status === 429 ? 60 : 0);
  }
  if (data?.error) throw new ChannelApiError(data.error);
  return data as T;
}
export const getChannelCatalog = (cursor: string | null = null) => invoke<ChannelPage>({ action: "catalog", cursor });
export const getMyChannelProperties = (cursor: string | null = null) => invoke<ChannelPage>({ action: "mine", cursor });
export const getChannelAssignments = (clientProfileId: string) => invoke<{ assignments: ChannelAssignment[] }>({ action: "assignments", client_profile_id: clientProfileId });
export const assignChannelProperty = (clientProfileId: string, propertyId: string) => invoke<{ success: boolean }>({ action: "assign", client_profile_id: clientProfileId, property_id: propertyId });
export const unassignChannelProperty = (assignmentId: string) => invoke<{ success: boolean }>({ action: "unassign", assignment_id: assignmentId });

export interface OnboardingOwner {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  property_address: string | null;
  property_city: string | null;
}
export interface OnboardingContext {
  owners: OnboardingOwner[];
  rooms: { user_id: string; room_name: string }[];
  assignments: ChannelAssignment[];
}
export interface OnboardingSelection {
  property_id: string;
  client_profile_id: string;
}
export interface OnboardingBatchResult {
  results: (OnboardingSelection & { success: boolean; message: string })[];
  retry_after: number;
  stopped: boolean;
}
export const getChannelOnboardingContext = () => invoke<OnboardingContext>({ action: "onboarding_context" });
export const assignChannelOnboardingBatch = (selections: OnboardingSelection[], agencyId: string, environment: string) =>
  invoke<OnboardingBatchResult>({ action: "assign_batch", selections, agency_id: agencyId, environment });
