import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Snowflake, ChevronRight } from 'lucide-react';
import { useSession } from '@/components/SessionContextProvider';
import WinterSubmittedRooms from '@/components/WinterSubmittedRooms';
import { getMyHivernageRequests } from '@/lib/hivernage-api';
import type { UserRoom } from '@/lib/user-room-api';
import { WINTER_FORM_PATH, WINTER_SEASON } from '@/lib/winter-season';

export default function WinterPwaOverview({ rooms }: { rooms: UserRoom[] }) {
  const { session } = useSession();
  const requests = useQuery({
    queryKey: ['winter-pwa-requests', session?.user.id, WINTER_SEASON],
    queryFn: getMyHivernageRequests,
    enabled: !!session?.user.id,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  return (
    <section aria-label="Hivernage 2027" className="space-y-3">
      <Link to={WINTER_FORM_PATH} className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-cyan-50 p-4 text-sky-950">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><Snowflake className="h-6 w-6" /></span>
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Hivernage 2027</p><p className="mt-0.5 text-xs text-sky-700">Préparer un logement ou consulter mes consignes envoyées</p></div>
        <ChevronRight className="h-4 w-4 shrink-0" />
      </Link>
      <WinterSubmittedRooms requests={requests.data ?? []} rooms={rooms} loading={requests.isLoading} error={requests.isError} onRetry={() => { void requests.refetch(); }} />
    </section>
  );
}
