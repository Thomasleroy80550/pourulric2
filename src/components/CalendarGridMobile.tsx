import React, { useState, useMemo, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, differenceInDays, max, min, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Home, LogIn, LogOut, Sparkles } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { UserRoom } from '@/lib/user-room-api';
import { KrossbookingReservation, saveKrossbookingReservation, fetchKrossbookingRoomTypes, KrossbookingRoomType } from '@/lib/krossbooking';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import ReservationActionsDialog from './ReservationActionsDialog';
import OwnerReservationDialog from './OwnerReservationDialog';
import { toast } from 'sonner';
import { Profile } from '@/lib/profile-api'; // Import de Profile

const channelColors: { [key: string]: { name: string; bgColor: string; textColor: string; } } = {
  'AIRBNB': { name: 'Airbnb', bgColor: 'bg-red-600', textColor: 'text-white' },
  'BOOKING': { name: 'Booking.com', bgColor: 'bg-blue-700', textColor: 'text-white' },
  'ABRITEL': { name: 'Abritel', bgColor: 'bg-orange-600', textColor: 'text-white' },
  'DIRECT': { name: 'Direct', bgColor: 'bg-purple-600', textColor: 'text-white' },
  'HELLOKEYS': { name: 'Hello Keys', bgColor: 'bg-green-600', textColor: 'text-white' },
  'OWNER_BLOCK': { name: 'Bloqué', bgColor: 'bg-slate-700', textColor: 'text-white' },
  'UNKNOWN': { name: 'Autre', bgColor: 'bg-gray-600', textColor: 'text-white' },
};

interface CalendarGridMobileProps {
  refreshTrigger: number;
  userRooms: UserRoom[];
  reservations: KrossbookingReservation[];
  onReservationChange: () => void;
  profile: Profile | null; // Ajout de la prop profile
}

const CalendarGridMobile: React.FC<CalendarGridMobileProps> = ({ userRooms, reservations, onReservationChange, profile }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isActionsDialogOpen, setIsActionsDialogOpen] = useState(false);
  const [selectedBookingForActions, setSelectedBookingForActions] = useState<KrossbookingReservation | null>(null);
  const [isOwnerReservationDialogOpen, setIsOwnerReservationDialogOpen] = useState(false);
  const [bookingToEdit, setBookingToEdit] = useState<KrossbookingReservation | null>(null);
  const [krossbookingRoomTypes, setKrossbookingRoomTypes] = useState<KrossbookingRoomType[]>([]);
  const [loadingRoomTypes, setLoadingRoomTypes] = useState<boolean>(true);

  useEffect(() => {
    const loadRoomTypes = async () => {
      setLoadingRoomTypes(true);
      try {
        const types = await fetchKrossbookingRoomTypes();
        setKrossbookingRoomTypes(types);
      } catch (error) {
        console.error("Error fetching Krossbooking room types in CalendarGridMobile:", error);
        toast.error("Erreur lors du chargement des types de chambres Krossbooking.");
      } finally {
        setLoadingRoomTypes(false);
      }
    };
    loadRoomTypes();
  }, []); // Empty dependency array means this runs once on mount

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleReservationClick = (booking: KrossbookingReservation) => {
    setSelectedBookingForActions(booking);
    setIsActionsDialogOpen(true);
  };

  const handleEditReservation = (booking: KrossbookingReservation) => {
    setBookingToEdit(booking);
    setIsOwnerReservationDialogOpen(true);
    setIsActionsDialogOpen(false);
  };

  const handleDeleteReservation = async (bookingId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler cette réservation ?")) {
      return;
    }
    try {
      const bookingToCancel = reservations.find(b => b.id === bookingId);
      if (!bookingToCancel) {
        toast.error("Réservation introuvable pour annulation.");
        return;
      }

      let id_room_type: string | undefined;
      for (const type of krossbookingRoomTypes) {
        const foundRoom = type.rooms.find(room => room.id_room.toString() === bookingToCancel.krossbooking_room_id);
        if (foundRoom) {
          id_room_type = type.id_room_type.toString();
          break;
        }
      }

      if (!id_room_type) {
        toast.error("Impossible de trouver le type de chambre pour l'annulation.");
        console.error("Could not find room type for room id:", bookingToCancel.krossbooking_room_id);
        return;
      }

      await saveKrossbookingReservation({
        id_reservation: bookingToCancel.id,
        label: bookingToCancel.guest_name || "Annulation",
        arrival: bookingToCancel.check_in_date,
        departure: bookingToCancel.check_out_date,
        email: bookingToCancel.email || '',
        phone: bookingToCancel.phone || '',
        cod_reservation_status: "CANC",
        id_room: bookingToCancel.krossbooking_room_id,
        id_room_type: id_room_type,
        property_id: bookingToCancel.property_id, // Ajout de cette ligne
      });
      toast.success("Réservation annulée avec succès !");
      setIsActionsDialogOpen(false);
      onReservationChange();
    } catch (err: any) {
      toast.error(`Erreur lors de l'annulation de la réservation : ${err.message}`);
      console.error("Error deleting reservation:", err);
    }
  };

  const getReservationsForRoomAndMonth = (roomId: string) => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    return reservations
      .filter(res => res.krossbooking_room_id === roomId)
      .filter(res => {
        const checkIn = isValid(parseISO(res.check_in_date)) ? parseISO(res.check_in_date) : null;
        const checkOut = isValid(parseISO(res.check_out_date)) ? parseISO(res.check_out_date) : null;
        if (!checkIn || !checkOut) return false;
        return (checkIn <= monthEnd && checkOut >= monthStart);
      })
      .sort((a, b) => parseISO(a.check_in_date).getTime() - parseISO(b.check_in_date).getTime());
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Planning</CardTitle>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium text-base capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </span>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {userRooms.length === 0 ? (
          <p className="text-center text-gray-500 py-4">Aucune chambre configurée.</p>
        ) : (
          <Accordion type="multiple" defaultValue={userRooms.map(r => r.id)} className="w-full">
            {userRooms.map(room => {
              const roomReservations = getReservationsForRoomAndMonth(room.room_id);
              return (
                <AccordionItem value={room.id} key={room.id}>
                  <AccordionTrigger>
                    <div className="flex items-center">
                      <Home className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="font-medium text-sm truncate">
                        {room.room_name}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {roomReservations.length > 0 ? (
                      <div className="space-y-2">
                        {roomReservations.map(res => {
                          const checkIn = parseISO(res.check_in_date);
                          const checkOut = parseISO(res.check_out_date);
                          const channelInfo = channelColors[res.channel_identifier || 'UNKNOWN'] || channelColors['UNKNOWN'];
                          return (
                            <div
                              key={res.id}
                              className={cn(
                                "p-2 rounded-md flex justify-between items-center",
                                channelInfo.bgColor,
                                channelInfo.textColor,
                                res.channel_identifier !== 'OWNER_BLOCK' && 'cursor-pointer'
                              )}
                              onClick={() => {
                                if (res.channel_identifier !== 'OWNER_BLOCK') {
                                  handleReservationClick(res);
                                }
                              }}
                            >
                              <div>
                                <p className="font-bold text-sm">{res.guest_name}</p>
                                <p className="text-xs">
                                  {format(checkIn, 'dd/MM', { locale: fr })} - {format(checkOut, 'dd/MM', { locale: fr })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold">{res.amount}</p>
                                <p className="text-xs">{channelInfo.name}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-2">Aucune réservation ce mois-ci.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>

      <ReservationActionsDialog
        isOpen={isActionsDialogOpen}
        onOpenChange={setIsActionsDialogOpen}
        booking={selectedBookingForActions}
        onEdit={handleEditReservation}
        onDelete={handleDeleteReservation}
      />

      <OwnerReservationDialog
        isOpen={isOwnerReservationDialogOpen}
        onOpenChange={setIsOwnerReservationDialogOpen}
        userRooms={userRooms}
        allReservations={reservations}
        onReservationCreated={onReservationChange}
        initialBooking={bookingToEdit}
      />
    </Card>
  );
};

export default CalendarGridMobile;