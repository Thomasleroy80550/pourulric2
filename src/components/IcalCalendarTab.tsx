import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays, Link2, RefreshCw, Save } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import TwelveMonthView from '@/components/TwelveMonthView';
import { fetchIcalReservationsForRoom } from '@/lib/ical';
import { KrossbookingReservation } from '@/lib/krossbooking';
import { updateUserRoom, UserRoom } from '@/lib/user-room-api';
import { toast } from 'sonner';

interface IcalCalendarTabProps {
  userRooms: UserRoom[];
  onUserRoomUpdated: (room: UserRoom) => void;
}

const IcalCalendarTab: React.FC<IcalCalendarTabProps> = ({ userRooms, onUserRoomUpdated }) => {
  const [urlByRoomId, setUrlByRoomId] = useState<Record<string, string>>({});
  const [savingRoomId, setSavingRoomId] = useState<string | null>(null);
  const [loadingIcal, setLoadingIcal] = useState(false);
  const [icalReservations, setIcalReservations] = useState<KrossbookingReservation[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    setUrlByRoomId(
      Object.fromEntries(userRooms.map((room) => [room.id, room.ical_url?.trim() || '']))
    );
  }, [userRooms]);

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

  const handleSave = async (room: UserRoom) => {
    const rawValue = (urlByRoomId[room.id] || '').trim();

    if (rawValue) {
      try {
        const parsedUrl = new URL(rawValue);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          toast.error('L’URL iCal doit commencer par http:// ou https://');
          return;
        }
      } catch {
        toast.error('Veuillez saisir une URL iCal valide.');
        return;
      }
    }

    setSavingRoomId(room.id);
    try {
      const savedRoom = await updateUserRoom(room.id, {
        ical_url: rawValue || null,
      });
      onUserRoomUpdated(savedRoom);
      toast.success(rawValue ? 'Flux iCal enregistré.' : 'Flux iCal supprimé.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur lors de l’enregistrement du flux iCal.';
      toast.error(message);
    } finally {
      setSavingRoomId(null);
    }
  };

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
          Renseignez un lien iCal par logement pour afficher une vue calendrier indépendante de l’API Krossbooking.
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
          <CardTitle>Liens iCal par logement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {userRooms.map((room) => (
            <div key={room.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{room.room_name}</p>
                  <p className="text-sm text-muted-foreground">ID logement : {room.room_id}</p>
                </div>
                {room.ical_url?.trim() ? <Badge variant="secondary">Connecté</Badge> : <Badge variant="outline">Non connecté</Badge>}
              </div>
              <div className="space-y-2">
                <Label htmlFor={`ical-${room.id}`}>URL du flux iCal</Label>
                <div className="flex flex-col gap-2 lg:flex-row">
                  <div className="relative flex-1">
                    <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id={`ical-${room.id}`}
                      value={urlByRoomId[room.id] || ''}
                      onChange={(event) => setUrlByRoomId((current) => ({
                        ...current,
                        [room.id]: event.target.value,
                      }))}
                      placeholder="https://.../calendar.ics"
                      className="pl-9"
                    />
                  </div>
                  <Button onClick={() => handleSave(room)} disabled={savingRoomId === room.id}>
                    <Save className="mr-2 h-4 w-4" />
                    {savingRoomId === room.id ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </div>
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
          Ajoutez au moins un lien iCal pour afficher le calendrier alternatif.
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
