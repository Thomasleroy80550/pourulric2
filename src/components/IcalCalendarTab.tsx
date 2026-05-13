import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import TwelveMonthView from '@/components/TwelveMonthView';
import { fetchIcalReservationsForRoom } from '@/lib/ical';
import { KrossbookingReservation } from '@/lib/krossbooking';
import { UserRoom } from '@/lib/user-room-api';
import { toast } from 'sonner';

interface IcalCalendarTabProps {
  userRooms: UserRoom[];
}

const IcalCalendarTab: React.FC<IcalCalendarTabProps> = ({ userRooms }) => {
  const [loadingIcal, setLoadingIcal] = useState(false);
  const [icalReservations, setIcalReservations] = useState<KrossbookingReservation[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);

  const linkedRooms = useMemo(
    () => userRooms.filter((room) => room.ical_url?.trim()),
    [userRooms]
  );

  const upcomingReservations = useMemo(
    () => [...icalReservations].sort((a, b) => a.check_in_date.localeCompare(b.check_in_date)).slice(0, 12),
    [icalReservations]
  );

  const syncIcalReservations = async () => {
    if (linkedRooms.length === 0) {
      setIcalReservations([]);
      setSyncError(null);
      return;
    }

    setLoadingIcal(true);
    setSyncError(null);

    const results = await Promise.allSettled(
      linkedRooms.map(async (room) => ({
        roomId: room.id,
        reservations: await fetchIcalReservationsForRoom(room),
      }))
    );

    const loadedReservations = results
      .filter((result): result is PromiseFulfilledResult<{ roomId: string; reservations: KrossbookingReservation[] }> => result.status === 'fulfilled')
      .flatMap((result) => result.value.reservations);

    const failedResults = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');

    setIcalReservations(loadedReservations);

    if (failedResults.length > 0) {
      const message = failedResults[0].reason instanceof Error
        ? failedResults[0].reason.message
        : 'Impossible de synchroniser un ou plusieurs flux iCal.';
      setSyncError(message);
      toast.error(message);
    } else {
      toast.success('Flux iCal synchronisés.');
    }

    setLoadingIcal(false);
  };

  useEffect(() => {
    void syncIcalReservations();
  }, [userRooms]);

  if (userRooms.length === 0) {
    return (
      <p className="text-muted-foreground">
        Aucune chambre configurée. Ajoutez d’abord vos logements pour connecter un flux iCal.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <CalendarDays className="h-4 w-4" />
        <AlertTitle>Calendrier iCal</AlertTitle>
        <AlertDescription>
          Les liens iCal sont configurés par l’administrateur au niveau de chaque logement. Cet onglet affiche la synchronisation et la vue calendrier alternative.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Logements connectés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{linkedRooms.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Réservations importées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{icalReservations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Synchronisation</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={syncIcalReservations} disabled={loadingIcal || linkedRooms.length === 0} className="w-full">
              <RefreshCw className={`mr-2 h-4 w-4 ${loadingIcal ? 'animate-spin' : ''}`} />
              Actualiser les flux
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Statut des flux iCal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {userRooms.map((room) => (
            <div key={room.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{room.room_name}</p>
                  <p className="text-sm text-muted-foreground">ID logement : {room.room_id}</p>
                </div>
                {room.ical_url?.trim() ? <Badge variant="secondary">Connecté</Badge> : <Badge variant="outline">Non configuré</Badge>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {syncError ? (
        <Alert variant="destructive">
          <AlertTitle>Synchronisation incomplète</AlertTitle>
          <AlertDescription>{syncError}</AlertDescription>
        </Alert>
      ) : null}

      {loadingIcal ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[360px] w-full" />
        </div>
      ) : linkedRooms.length === 0 ? (
        <p className="text-muted-foreground">
          Aucun flux iCal n’est encore configuré par l’administrateur pour ces logements.
        </p>
      ) : (

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Prochaines réservations iCal</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingReservations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune réservation trouvée dans les flux iCal.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingReservations.map((reservation) => (
                    <div key={reservation.id} className="flex flex-col gap-1 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium">{reservation.property_name}</p>
                        <p className="text-sm text-muted-foreground">{reservation.guest_name}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(`${reservation.check_in_date}T00:00:00`), 'dd MMM yyyy', { locale: fr })}
                        {' → '}
                        {format(new Date(`${reservation.check_out_date}T00:00:00`), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <TwelveMonthView userRooms={userRooms} reservations={icalReservations} />
        </div>
      )}
    </div>
  );
};

export default IcalCalendarTab;
