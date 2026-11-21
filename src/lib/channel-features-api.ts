import { supabase } from "@/integrations/supabase/client";
import { ChannelApiError } from "./owner-channel-api";

export interface ChannelCalendarDay {
  date: string;
  price: number | null;
  availability: "booked" | "blocked" | "available" | "unknown";
  quantity: number | null;
  min_stay: number | null;
  max_stay: number | null;
  arrivals_allowed: boolean | null;
  departures_allowed: boolean | null;
}
export interface ChannelCalendar {
  property_id: string;
  agency_id: string;
  environment: string;
  currency: string;
  from: string;
  to: string;
  days: ChannelCalendarDay[];
  prices_source: string | null;
  prices_updated_at: string | null;
  availability_source: string | null;
  fetched_at: string;
}
export interface ChannelBlock {
  id: string;
  check_in: string;
  check_out: string;
  status: "active" | "owner_pending";
  cleaning_requested: boolean;
  created_here?: boolean;
}
export interface ChannelLocalBlockRequest {
  request_id: string;
  check_in: string;
  check_out: string;
  cleaning_requested: boolean;
  status: "pending" | "failed";
  last_error: string | null;
  created_at: string;
}
export interface ChannelBlocksPage {
  property_id: string;
  blocks: ChannelBlock[];
  local_requests: ChannelLocalBlockRequest[];
}
export interface ChannelBlockCreateResult {
  request_id: string;
  block?: ChannelBlock;
  block_id?: string;
  status?: string;
  replayed: boolean;
  cleaning_job_created?: boolean;
}
export interface ChannelCleaningIntervention {
  id: string;
  property_id: string;
  scheduled_date: string;
  rooms: string[];
  status: "todo" | "in_progress" | "done";
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  reopened_at: string | null;
}
export interface ChannelCleaningList {
  interventions: ChannelCleaningIntervention[];
  next_cursor: string | null;
}
export interface ChannelCleaningPhoto {
  id: string;
  room: string;
  phase: "before" | "after";
  created_at: string;
  url: string;
}
export interface ChannelCleaningDetail {
  intervention: ChannelCleaningIntervention;
  photos: ChannelCleaningPhoto[];
  photos_url_expires_in: number;
  next_photo_cursor: string | null;
}
export interface ChannelReview {
  review_id: string;
  channel_id: string | null;
  title: string | null;
  content: string | null;
  reviewer_name: string | null;
  rating: number | null;
  rating_scale: number | null;
  created_label: string | null;
  imported_at: string;
}
export interface ChannelReviewImport {
  job_id: string;
  status: "syncing" | "completed" | "failed";
  next_offset: number;
  pages: number;
  review_count: number;
  last_error: string | null;
  fetched_at: string | null;
  completed_at: string | null;
}
export interface ChannelReviewsCache {
  reviews: ChannelReview[];
  total_count: number;
  next_offset: number | null;
  import: ChannelReviewImport | null;
}

async function request<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("owner-channel-proxy", { body });
  if (error) {
    const response = error.context instanceof Response ? error.context : null;
    const payload = response ? await response.json().catch(() => null) : null;
    throw new ChannelApiError(payload?.error || error.message, response?.status === 429 ? 60 : 0);
  }
  if (data?.error) throw new ChannelApiError(data.error);
  return data as T;
}

export const getChannelCalendar = (assignmentId: string, from?: string, to?: string) =>
  request<ChannelCalendar>({ action: "calendar", assignment_id: assignmentId, ...(from ? { from } : {}), ...(to ? { to } : {}) });

export const getChannelBlocks = (assignmentId: string) =>
  request<ChannelBlocksPage>({ action: "blocks", assignment_id: assignmentId });

export function createChannelBlock(input: {
  assignmentId: string;
  requestId: string;
  checkIn: string;
  checkOut: string;
  cleaningRequested: boolean;
}) {
  return request<ChannelBlockCreateResult>({
    action: "block_create",
    assignment_id: input.assignmentId,
    request_id: input.requestId,
    check_in: input.checkIn,
    check_out: input.checkOut,
    cleaning_requested: input.cleaningRequested,
    confirmed: true,
  });
}

export function getChannelCleaningList(input: {
  assignmentId: string;
  limit?: number;
  cursor?: string | null;
  from?: string;
  to?: string;
}) {
  return request<ChannelCleaningList>({
    action: "cleaning_list",
    assignment_id: input.assignmentId,
    limit: input.limit ?? 50,
    ...(input.cursor ? { cursor: input.cursor } : {}),
    ...(input.from ? { from: input.from } : {}),
    ...(input.to ? { to: input.to } : {}),
  });
}

export function getChannelCleaningDetail(input: {
  assignmentId: string;
  jobId: string;
  limit?: number;
  photoCursor?: string | null;
}) {
  return request<ChannelCleaningDetail>({
    action: "cleaning_detail",
    assignment_id: input.assignmentId,
    job_id: input.jobId,
    limit: input.limit ?? 50,
    ...(input.photoCursor ? { photo_cursor: input.photoCursor } : {}),
  });
}

export const getChannelReviewsCache = (assignmentId: string, offset = 0, limit = 50) =>
  request<ChannelReviewsCache>({ action: "reviews_cache", assignment_id: assignmentId, offset, limit });

export const startChannelReviewsSync = (assignmentId: string, restart = false, automatic = false) =>
  request<ChannelReviewImport>({ action: "reviews_sync_start", assignment_id: assignmentId, restart, automatic });

export const advanceChannelReviewsSync = (jobId: string) =>
  request<ChannelReviewImport>({ action: "reviews_sync_page", job_id: jobId });
