import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Snowflake, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { useSession } from '@/components/SessionContextProvider';
import WinterSubmittedRooms from '@/components/WinterSubmittedRooms';
import { getMyHivernageRequests } from '@/lib/hivernage-api';
import type { UserRoom } from '@/lib/user-room-api';
import { WINTER_FORM_PATH, WINTER_SEASON } from '@/lib/winter-season';

export default function WinterPwaOverview({ rooms }: { rooms: UserRoom[] }) {
  const [open, setOpen] = useState(false);
  const { session } = useSession();
  const requests = useQuery({
    queryKey: ['winter-pwa-requests', session?.user.id, WINTER_SEASON],
    queryFn: getMyHivernageRequests,
    enabled: !!session?.user.id,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const submittedCount = new Set((requests.data ?? [])
    .filter(request => request.instructions?.season === WINTER_SEASON && request.user_room_id)
    .map(request => request.user_room_id)).size;
  const summary = requests.isLoading ? 'Chargement…' : requests.isError ? 'Consulter mes logements' : submittedCount === 0 ? 'Mes consignes pour cet hiver' : `${submittedCount} logement${submittedCount > 1 ? 's' : ''} renseigné${submittedCount > 1 ? 's' : ''}`;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <section aria-label="Hivernage 2027" className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-white px-4 py-3 shadow-sm">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><Snowflake className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">Hivernage 2027</p><p className="mt-0.5 text-xs text-slate-500">{summary}</p></div>
        <SheetTrigger asChild><Button variant="ghost" size="sm" className="shrink-0 rounded-full text-sky-700 hover:bg-sky-50" aria-label="Gérer mes consignes d’hivernage">Gérer<ArrowRight className="ml-1 h-4 w-4" /></Button></SheetTrigger>
      </section>
      <SheetContent side="bottom" className="mx-auto flex max-h-[85dvh] max-w-md flex-col rounded-t-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
        <SheetHeader className="pr-7 text-left">
          <SheetTitle>Mon hivernage 2027</SheetTitle>
          <SheetDescription>Vacances Hello Keys : 3 janvier → 5 février 2027.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 overflow-y-auto overscroll-contain">
          <WinterSubmittedRooms requests={requests.data ?? []} rooms={rooms} loading={requests.isLoading} error={requests.isError} onRetry={() => { void requests.refetch(); }} />
        </div>
        <SheetClose asChild><Button asChild className="w-full shrink-0 rounded-xl bg-sky-700 text-white hover:bg-sky-800"><Link to={WINTER_FORM_PATH}>Préparer un logement<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></SheetClose>
      </SheetContent>
    </Sheet>
  );
}
