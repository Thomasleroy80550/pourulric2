import { supabase } from "@/integrations/supabase/client";
import { ChannelApiError, ChannelAssignment } from "./owner-channel-api";

export interface ReservationSource extends ChannelAssignment {
  profiles: { first_name: string | null; last_name: string | null } | null;
}
export interface ImportedChannelReservation {
  reservation_id: string;
  is_active: boolean;
  updated_at: string;
  channel_reservations: { payload: Record<string, unknown>; source_fetched_at: string; imported_at: string };
}
export interface ReservationImport {
  id: string;
  imported_at: string;
  fetched_at: string;
  sync_from: string | null;
  sync_to: string | null;
}
export interface ReservationCachePage {
  reservations: ImportedChannelReservation[];
  next_cursor: string | null;
  import: ReservationImport | null;
}
export interface ReservationSyncProgress {
  job_id: string;
  status: "syncing" | "completed";
  pages: number;
  reservation_count: number;
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
export const getReservationSources = (cursor: string | null = null) => request<{ sources: ReservationSource[]; next_cursor: string | null }>({ action: "reservation_sources", cursor });
export const getImportedChannelReservations = (assignmentId: string, from: string, to: string, includeInactive: boolean, cursor: string | null = null) =>
  request<ReservationCachePage>({ action: "reservation_cache", assignment_id: assignmentId, from, to, include_inactive: includeInactive, cursor });
export const startChannelReservationSync = (assignmentId: string, from: string, to: string, restart = false) =>
  request<ReservationSyncProgress>({ action: "reservation_sync_start", assignment_id: assignmentId, from, to, restart });
export const advanceChannelReservationSync = (jobId: string) => request<ReservationSyncProgress>({ action: "reservation_sync_page", job_id: jobId });
