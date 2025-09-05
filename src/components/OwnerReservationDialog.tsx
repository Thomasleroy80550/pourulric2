import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, isSameDay, addDays, subDays, isValid, isBefore, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { saveKrossbookingReservation, KrossbookingReservation, fetchKrossbookingRoomTypes, KrossbookingRoomType } from '@/lib/krossbooking'; // Import KrossbookingRoomType
import { UserRoom } from '@/lib/user-room-api';
import { toast } from 'sonner';
import { Profile } from '@/lib/profile-api';

interface OwnerReservationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userRooms: UserRoom[];
  allReservations: KrossbookingReservation[];
  onReservationCreated: () => void;
  initialBooking?: KrossbookingReservation | null;
  profile: Profile | null;
}

const blockTypes = [
  { value: 'Séjour propriétaire', label: 'Séjour propriétaire' },
  { value: 'Fermer', label: 'Fermer' },
  { value: 'Entretien', label: 'Entretien' },
];

const formSchema = z.object({
  roomId: z.string().min(1, { message: 'Veuillez sélectionner une chambre.' }),
  blockType: z.string().min(1, { message: 'Veuillez sélectionner un type de blocage.' }),
  dateRange: z.object({
    from: z.date({ required_error: 'La date d\'arrivée est requise.' }),
    to: z.date().optional(),
  }).refine(data => data.to !== undefined, {
    message: 'La date de départ est requise.',
    path: ['to'],
  }).refine(data => data.to! >= data.from, {
    message: 'La date de départ ne peut pas être antérieure à la date d\'arrivée.',
    path: ['to'],
  }),
  foreseeCleaning: z.boolean().default(false),
  email: z.string().email({ message: 'Email invalide.' }).optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
});

const OwnerReservationDialog: React.FC<OwnerReservationDialogProps> = ({
  isOpen,
  onOpenChange,
  userRooms,
  allReservations,
  onReservationCreated,
  initialBooking,
  profile,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roomId: '',
      blockType: '',
      dateRange: {
        from: undefined,
        to: undefined,
      },
      foreseeCleaning: false,
      email: '',
      phone: '',
    },
  });

  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [krossbookingRoomTypes, setKrossbookingRoomTypes] = useState<KrossbookingRoomType[]>([]);
  const [loadingKrossbookingRoomTypes, setLoadingKrossbookingRoomTypes] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const loadRoomTypes = async () => {
      setLoadingKrossbookingRoomTypes(true);
      try {
        const types = await fetchKrossbookingRoomTypes();
        setKrossbookingRoomTypes(types);
      } catch (error) {
        console.error("Error fetching Krossbooking room types:", error);
        toast.error("Erreur lors du chargement des types de chambres Krossbooking.");
      } finally {
        setLoadingKrossbookingRoomTypes(false);
      }
    };

    if (isOpen) {
      loadRoomTypes();
      if (initialBooking) {
        let blockTypeFound = '';
        for (const type of blockTypes) {
          if (initialBooking.guest_name?.includes(type.value)) {
            blockTypeFound = type.value;
            break;
          }
        }

        form.reset({
          roomId: initialBooking.krossbooking_room_id,
          blockType: blockTypeFound,
          dateRange: {
            from: parseISO(initialBooking.check_in_date),
            to: parseISO(initialBooking.check_out_date),
          },
          foreseeCleaning: initialBooking.status === 'PROPRI',
          email: initialBooking.email || '',
          phone: initialBooking.phone || '',
        });
      } else {
        form.reset({
          roomId: '',
          blockType: '',
          dateRange: {
            from: undefined,
            to: undefined,
          },
          foreseeCleaning: false,
          email: '',
          phone: '',
        });
      }
    }
  }, [isOpen, initialBooking, form]);

  console.log("OwnerReservationDialog - Profile prop:", profile);
  const krossbookingPropertyId = profile?.krossbooking_property_id;
  console.log("OwnerReservationDialog - krossbooking_property_id from profile:", krossbookingPropertyId);

  const getDisabledDates = React.useCallback((date: Date) => {
    if (!selectedRoomId) return false;

    const roomReservations = allReservations.filter(res =>
      res.krossbooking_room_id === selectedRoomId &&
      res.status !== 'CANC' &&
      (initialBooking ? res.id !== initialBooking.id : true)
    );

    for (const res of roomReservations) {
      const checkIn = isValid(parseISO(res.check_in_date)) ? parseISO(res.check_in_date) : null;
      const checkOut = isValid(parseISO(res.check_out_date)) ? parseISO(res.check_out_date) : null;

      if (checkIn && checkOut) {
        if (isAfter(date, checkIn) && isBefore(date, checkOut)) {
          return true;
        }
        if (isSameDay(checkIn, checkOut) && isSameDay(date, checkIn)) {
          return true;
        }
      }
    }
    return false;
  }, [selectedRoomId, allReservations, initialBooking]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!profile || !krossbookingPropertyId) {
      toast.error("L'ID de propriété Krossbooking n'est pas défini sur le profil de l'utilisateur. Veuillez le configurer dans la section admin.");
      return;
    }

    const formattedArrival = format(values.dateRange.from, 'yyyy-MM-dd');
    const formattedDeparture = format(values.dateRange.to!, 'yyyy-MM-dd');

    const cod_reservation_status = values.foreseeCleaning ? 'PROPRI' : 'PROP0';
    const cleaningSuffix = values.foreseeCleaning ? ' avec ménage' : ' sans ménage';
    const label = `${values.blockType}${cleaningSuffix}`;

    let id_room_type: string | undefined;
    for (const type of krossbookingRoomTypes) {
      const foundRoom = type.rooms.find(room => room.id_room.toString() === values.roomId);
      if (foundRoom) {
        id_room_type = type.id_room_type.toString();
        break;
      }
    }

    if (!id_room_type) {
      toast.error("Impossible de trouver le type de chambre correspondant à la chambre sélectionnée.");
      return;
    }

    const payload: SaveReservationPayload = {
      label: label,
      arrival: formattedArrival,
      departure: formattedDeparture,
      email: values.email || '',
      phone: values.phone || '',
      cod_reservation_status: cod_reservation_status,
      id_room: values.roomId,
      id_room_type: id_room_type,
      property_id: krossbookingPropertyId,
    };

    if (initialBooking && initialBooking.id) {
      payload.id_reservation = initialBooking.id;
    }

    try {
      setIsLoading(true);
      await saveKrossbookingReservation(payload);
      toast.success(initialBooking ? "Réservation mise à jour avec succès !" : "Réservation propriétaire créée avec succès !");
      onReservationCreated();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Erreur lors de la ${initialBooking ? 'mise à jour' : 'création'} de la réservation : ${error.message}`);
      console.error("Error saving owner reservation:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialBooking ? 'Modifier la Réservation' : 'Créer une Réservation Propriétaire'}</DialogTitle>
          <DialogDescription>
            {initialBooking ? 'Modifiez les détails de cette réservation.' : 'Bloquez des dates pour un séjour propriétaire, une fermeture ou un entretien.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="roomId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chambre</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={loadingKrossbookingRoomTypes}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une chambre" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {userRooms.map((room) => (
                        <SelectItem key={room.id} value={room.room_id}>
                          {room.room_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="blockType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de blocage</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {blockTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateRange"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Dates d'arrivée et de départ</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          id="date"
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value.from && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value.from ? (
                            field.value.to ? (
                              <>
                                {format(field.value.from, "PPP", { locale: fr })} -{" "}
                                {format(field.value.to, "PPP", { locale: fr })}
                              </>
                            ) : (
                              format(field.value.from, "PPP", { locale: fr })
                            )
                          ) : (
                            <span>Choisir une plage de dates</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={field.value.from}
                        selected={field.value}
                        onSelect={field.onChange}
                        numberOfMonths={1}
                        locale={fr}
                        disabled={getDisabledDates}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="foreseeCleaning"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Prévoir le ménage</FormLabel>
                    <DialogDescription>
                      Indique si un ménage est nécessaire après ce blocage.
                    </DialogDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+33612345678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting || loadingKrossbookingRoomTypes || isLoading}>
                {form.formState.isSubmitting ? (initialBooking ? 'Mise à jour...' : 'Création...') : (initialBooking ? 'Mettre à jour la Réservation' : 'Créer la Réservation')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default OwnerReservationDialog;