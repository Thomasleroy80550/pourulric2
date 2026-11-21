import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "@/components/SessionContextProvider";
import {
  advanceChannelReservationSync, getImportedChannelReservations, getReservationSources,
  ImportedChannelReservation, startChannelReservationSync, ReservationSource,
} from "@/lib/channel-reservations-api";
import { ChannelApiError } from "@/lib/owner-channel-api";
import { channelRoom, displayChannelBlock, displayChannelReservation, mergeOwnerReservationDisplay } from "@/lib/owner-reservation-display";
import { getChannelBlocks, type ChannelBlock } from "@/lib/channel-features-api";
import type { KrossbookingReservation } from "@/lib/krossbooking";
import type { UserRoom } from "@/lib/user-room-api";

const emptyRooms: UserRoom[] = [];
const emptyReservations: KrossbookingReservation[] = [];
type CachedProperty = { assignmentId: string; records: ImportedChannelReservation[]; hasImport: boolean };
async function readProperty(source: ReservationSource): Promise<CachedProperty> {
  const records: ImportedChannelReservation[] = [];
  let cursor: string | null = null;
  let importedAt: string | undefined;
  let hasImport = false;
  do {
    const page = await getImportedChannelReservations(source.id, "", "", false, cursor);
    if (cursor && page.import?.imported_at !== importedAt) throw new Error("Un import a changé pendant la lecture du planning.");
    importedAt = page.import?.imported_at;
    hasImport = page.import !== null;
    records.push(...page.reservations);
    cursor = page.next_cursor;
  } while (cursor);
  return { assignmentId: source.id, records, hasImport };
}

async function readBlocks(source: ReservationSource): Promise<ChannelBlock[]> {
  try {
    const page = await getChannelBlocks(source.id);
    return page.blocks;
  } catch {
    return [];
  }
}

export function useOwnerReservationFeed(legacyRooms: UserRoom[] = emptyRooms, legacyReservations: KrossbookingReservation[] = emptyReservations) {
  const { session, profile } = useSession();
  const client = useQueryClient();
  const userId = session?.user.id;
  const enabled = !!userId && profile?.role === "user" && !profile.is_banned && !profile.is_payment_suspended && !profile.is_contract_terminated;
  const sourceKey = ["owner-reservation-sources", userId];
  const sources = useQuery({
    queryKey: sourceKey, enabled, staleTime: 60 * 1000, retry: false,
    queryFn: async () => {
      const all: ReservationSource[] = [];
      let cursor: string | null = null;
      do { const page = await getReservationSources(cursor); all.push(...page.sources); cursor = page.next_cursor; } while (cursor);
      return all;
    },
  });
  const assignments = sources.data || [];
  const ids = assignments.map(source => source.id);
  const cacheKey = ["owner-reservation-cache", userId, ids];
  const cache = useQuery({
    queryKey: cacheKey, enabled: enabled && sources.isSuccess, staleTime: 60 * 1000, retry: false,
    queryFn: () => Promise.all(assignments.map(readProperty)),
  });
  const blocksKey = ["owner-channel-blocks", userId, ids];
  const blocks = useQuery({
    queryKey: blocksKey, enabled: enabled && sources.isSuccess, staleTime: 60 * 1000, retry: false,
    queryFn: () => Promise.all(assignments.map(async source => ({ assignmentId: source.id, blocks: await readBlocks(source) }))),
  });
  const syncKey = ["owner-reservation-auto-sync", userId, ids];
  const sync = useQuery({
    queryKey: syncKey, enabled: enabled && sources.isSuccess && !cache.isPending,
    staleTime: 5 * 60 * 1000, refetchInterval: 5 * 60 * 1000, retry: false,
    queryFn: async ({ signal }) => {
      let warning = "";
      let retryAfter = 0;
      for (const source of assignments) {
        if (signal.aborted) break;
        try {
          let job = await startChannelReservationSync(source.id, "", "", false, true);
          while (job.status !== "completed" && !signal.aborted) job = await advanceChannelReservationSync(job.job_id);
          if (signal.aborted) break;
          const fresh = await readProperty(source);
          client.setQueryData<CachedProperty[]>(cacheKey, previous => [...(previous || []).filter(item => item.assignmentId !== source.id), fresh]);
        } catch (error) {
          warning = error instanceof Error ? error.message : "Actualisation des réservations indisponible.";
          if (error instanceof ChannelApiError && error.retryAfter) { retryAfter = error.retryAfter; break; }
        }
      }
      if (!signal.aborted) await client.invalidateQueries({ queryKey: sourceKey });
      return { warning, retryAfter };
    },
  });
  useEffect(() => {
    if (!sync.data?.warning) return;
    toast.warning("Actualisation du planning différée. Les dernières réservations importées restent affichées.", { description: sync.data.warning });
    if (!sync.data.retryAfter) return;
    const timer = window.setTimeout(() => client.invalidateQueries({ queryKey: syncKey }), sync.data.retryAfter * 1000);
    return () => window.clearTimeout(timer);
  }, [sync.dataUpdatedAt]);
  useEffect(() => {
    const error = sources.error || cache.error;
    if (enabled && error) toast.warning("Les réservations du nouveau channel ne peuvent pas être actualisées pour le moment.", { description: error.message });
  }, [enabled, sources.error, cache.error]);

  const display = useMemo(() => {
    if (!enabled) return { rooms: legacyRooms, reservations: legacyReservations, replacedRoomIds: new Set<string>() };
    const channelRooms = (sources.data || []).map(channelRoom);
    const channelReservations = (cache.data || []).flatMap(item => {
      const source = sources.data?.find(source => source.id === item.assignmentId);
      if (!source) return [];
      return item.records.map(record => displayChannelReservation(record, source)).filter((record): record is KrossbookingReservation => record !== null);
    });
    const channelBlocks = (blocks.data || []).flatMap(item => {
      const source = sources.data?.find(source => source.id === item.assignmentId);
      if (!source) return [];
      return item.blocks.map(block => displayChannelBlock(block, source));
    });
    return mergeOwnerReservationDisplay(legacyRooms, legacyReservations, channelRooms, [...channelReservations, ...channelBlocks]);
  }, [enabled, legacyRooms, legacyReservations, sources.data, cache.data, blocks.data]);
  return {
    ...display,
    sources: assignments,
    unlinkedSources: assignments.filter(source => !source.user_room_id),
    isLoading: enabled && (sources.isLoading || cache.isLoading || (assignments.length > 0 && sync.isFetching && !cache.data?.some(item => item.hasImport))),
    isSyncing: enabled && sync.isFetching,
    error: enabled ? sources.error || cache.error : null,
  };
}
