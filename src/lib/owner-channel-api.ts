import { supabase } from "@/integrations/supabase/client";

export interface ChannelPropertyPhoto {
  id?: string;
  url: string;
  caption?: string;
  position?: number;
}
export interface ChannelProperty {
  id: string;
  name?: string;
  title?: string;
  property_name?: string;
  description?: string;
  summary?: string;
  short_description?: string;
  long_description?: string;
  details?: string;
  photos?: Array<string | ChannelPropertyPhoto>;
  images?: Array<string | ChannelPropertyPhoto>;
  pictures?: Array<string | ChannelPropertyPhoto>;
  media?: Array<string | ChannelPropertyPhoto>;
  amenities?: unknown;
  equipment?: unknown;
  equipments?: unknown;
  features?: unknown;
  facilities?: unknown;
  agency_id?: string;
  environment?: string;
  assignment_id?: string;
  user_room_id?: string | null;
}
export interface ChannelAssignment {
  id: string;
  client_profile_id: string;
  property_id: string;
  agency_id: string;
  environment: string;
  user_room_id?: string | null;
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
function channelText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const record = value as Record<string, unknown>;
  const localized = [record.fr, record.en, record.value, record.text, record.name].find(item => typeof item === "string" && item.trim());
  return typeof localized === "string" ? localized.trim() : "";
}
export function channelPropertyName(property: ChannelProperty) {
  return [property.name, property.title, property.property_name].map(channelText).find(Boolean) || property.id;
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
export const linkChannelAssignmentRoom = (assignmentId: string, userRoomId: string | null) => invoke<{ success: boolean }>({ action: "link_room", assignment_id: assignmentId, user_room_id: userRoomId });
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
  rooms: { id: string; user_id: string; room_name: string }[];
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
