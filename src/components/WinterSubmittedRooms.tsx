import { CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { HivernageRequest } from '@/lib/hivernage-api';
import type { UserRoom } from '@/lib/user-room-api';
import { WINTER_SEASON, winterClosureSummary } from '@/lib/winter-season';

type Props = {
  requests: HivernageRequest[];
  rooms: UserRoom[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
};

export default function WinterSubmittedRooms({ requests, rooms, loading, error, onRetry }: Props) {
  const latestByRoom = new Map<string, HivernageRequest>();
  for (const request of requests) {
    if (request.instructions?.season !== WINTER_SEASON || !request.user_room_id) continue;
    const previous = latestByRoom.get(request.user_room_id);
    if (!previous || request.created_at > previous.created_at) latestByRoom.set(request.user_room_id, request);
  }
  const submitted = Array.from(latestByRoom.values());

  return (
    <Card className="mb-6 rounded-2xl">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5 text-emerald-600" />Logements déjà renseignés</h2>
          {!loading && !error && <Badge variant="secondary">{submitted.length} logement{submitted.length > 1 ? 's' : ''} · Hiver {WINTER_SEASON}</Badge>}
        </div>
        {loading ? (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Chargement des consignes envoyées…</p>
        ) : error ? (
          <div className="flex flex-wrap items-center gap-3"><p className="text-sm text-muted-foreground">Impossible de vérifier les formulaires déjà remplis.</p><Button variant="outline" size="sm" onClick={onRetry}>Réessayer</Button></div>
        ) : submitted.length === 0 ? (
          <p className="text-sm text-muted-foreground">Vous n’avez pas encore envoyé de consignes pour cet hiver.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {submitted.map(request => (
              <li key={request.user_room_id} className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                <div className="flex items-start justify-between gap-3">
                  <p className="break-words text-sm font-semibold">{rooms.find(room => room.id === request.user_room_id)?.room_name || request.user_rooms?.room_name || 'Logement'}</p>
                  <Badge className="shrink-0 gap-1 border-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900 dark:text-emerald-100"><CheckCircle2 className="h-3 w-3" />Envoyé</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Dernier envoi le {new Date(request.created_at).toLocaleDateString('fr-FR')}</p>
                <p className="mt-2 text-sm">{winterClosureSummary(request.instructions)}</p>
              </li>
            ))}
          </ul>
        )}
        {!loading && !error && submitted.length > 0 && <p className="mt-3 text-xs text-muted-foreground">« Envoyé » indique que le formulaire a été transmis à Hello Keys, pas que les actions ont déjà été réalisées.</p>}
      </CardContent>
    </Card>
  );
}
