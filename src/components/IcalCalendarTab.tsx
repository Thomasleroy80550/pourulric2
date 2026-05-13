import React, { useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import BookingPlanningGridStudio from '@/components/BookingPlanningGridStudio';
import { fetchIcalReservationsForRoom } from '@/lib/ical';
import { KrossbookingReservation } from '@/lib/krossbooking';
import { UserProfile } from '@/lib/profile-api';
import { UserRoom } from '@/lib/user-room-api';
import { toast } from 'sonner';

interface IcalCalendarTabProps {
  userRooms: UserRoom[];
  profile: UserProfile | null;
}

const IcalCalendarTab: React.FC<IcalCalendarTabProps> = ({ userRooms, profile }) => {
  const [loadingIcal, setLoadingIcal] = useState(false);
  const [icalReservations, setIcalReservations] = useState<KrossbookingReservation[]>([]);

  const linkedRooms = useMemo(
    () => userRooms.filter((room) => room.ical_url?.trim()),
    [userRooms]
  );

  useEffect(() => {
    const syncIcalReservations = async () => {
      if (linkedRooms.length === 0) {
        setIcalReservations([]);
        return;
      }

      setLoadingIcal(true);

      const results = await Promise.allSettled(
        linkedRooms.map(async (room) => fetchIcalReservationsForRoom(room))
      );

      const loadedReservations = results
        .filter((result): result is PromiseFulfilledResult<KrossbookingReservation[]> => result.status === 'fulfilled')
        .flatMap((result) => result.value);

      const failedResults = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');

      setIcalReservations(loadedReservations);

      if (failedResults.length > 0) {
        const message = failedResults[0].reason instanceof Error
          ? failedResults[0].reason.message
          : 'Impossible de synchroniser un ou plusieurs flux iCal.';
        toast.error(message);
      }

      setLoadingIcal(false);
    };

    void syncIcalReservations();
  }, [linkedRooms]);

  if (userRooms.length === 0) {
    return <p className="text-muted-foreground">Aucune chambre configurée.</p>;
  }

  if (loadingIcal) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (linkedRooms.length === 0) {
    return <p className="text-muted-foreground">Aucun flux iCal n’est configuré pour ces logements.</p>;
  }

  return (
    <div className="w-full min-w-0 overflow-x-visible">
      <BookingPlanningGridStudio
        refreshTrigger={0}
        userRooms={userRooms}
        reservations={icalReservations}
        onReservationChange={() => undefined}
        profile={profile}
      />
    </div>
  );
};

export default IcalCalendarTab;
