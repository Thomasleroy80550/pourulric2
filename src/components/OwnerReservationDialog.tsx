import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, isSameDay, addDays, subDays, isValid, isBefore } from 'date-fns';
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
import { saveKrossbookingReservation, KrossbookingReservation } from '@/lib/krossbooking'; // Import KrossbookingReservation
import { UserRoom } from '@/lib/user-room-api';
import { toast } from 'sonner';

interface OwnerReservationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userRooms: UserRoom[];
  allReservations: KrossbookingReservation[]; // New prop: all reservations to check for conflicts
  onReservationCreated: () => void;
  initialBooking?: KrossbookingReservation | null; // New prop for editing
}

const blockTypes = [
  { value: 'Séjour propriétaire', label: 'Séjour propriétaire' },
  { value: 'Fermer', label: 'Fermer' },
  { value: 'Entretien', label: 'Entretien' },
];

const formSchema = z.object({
  roomId: z.string().min(1, { message: 'Veuillez sélectionner une chambre.' }),
  blockType: z.string().min(1, { message: 'Veuillez sélectionner un type de blocage.' }),
  arrivalDate: z.date({ required_error: 'La date d\'arrivée est requise.' }),
  departureDate: z.date({ required_error: 'La date de départ est requise.' }),
  foreseeCleaning: z.boolean().default(false),
  email: z.string().email({ message: 'Email invalide.' }).optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
}).refine((data) => data.departureDate >= data.arrivalDate, {
  message: 'La date de départ ne peut pas être antérieure à la date d\'arrivée.',
  path: ['departureDate'],
});

const OwnerReservationDialog: React.FC<OwnerReservationDialogProps> = ({
  isOpen,
  onOpenChange,
  userRooms,
  allReservations, // Destructure new prop
  onReservationCreated,
  initialBooking, // Destructure new prop
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roomId: '',
      blockType: '',
      foreseeCleaning: false,
      email: '',
      phone: '',
    },
  });

  const selectedRoomId = form.watch('roomId');
  const selectedArrivalDate = form.watch('arrivalDate');

  React.useEffect(() => {
    if (isOpen) {
      if (initialBooking) {
        // Pre-fill form for editing
        // Determine blockType from label, if label contains one of the known block types
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
          arrivalDate: parseISO(initialBooking.check_in_date),
          departureDate: parseISO(initialBooking.check_out_date),
          foreseeCleaning: initialBooking.status === 'PROPRI', // PROPRI means cleaning is foreseen
          email: initialBooking.email || '', // Assuming email/phone might be part of KrossbookingReservation if available
          phone: initialBooking.phone || '',
        });
      } else {
        // Reset for new creation
        form.reset({
          roomId: '',
          blockType: '',
          foreseeCleaning: false,
          email: '',
          phone: '',
        });
      }
    }
  }, [isOpen, initialBooking, form]);

  // Function to determine disabled dates for ARRIVAL
  const getDisabledDatesForArrival = React.useCallback((date: Date) => {
    if (!selectedRoomId) return false;

    const roomReservations = allReservations.filter(res =>
      res.krossbooking_room_id === selectedRoomId &&
      res.status !== 'CANC' && // Do not consider cancelled reservations as blocking
      (initialBooking ? res.id !== initialBooking.id : true) // Exclude the current booking if editing
    );

    for (const res of roomReservations) {
      const checkIn = isValid(parseISO(res.check_in_date)) ? parseISO(res.check_in_date) : null;
      const checkOut = isValid(parseISO(res.check_out_date)) ? parseISO(res.check_out_date) : null;

      if (checkIn && checkOut) {
        // A day is blocked for arrival if it's within the occupied period of another reservation.
        // The occupied period is from check-in day up to (but not including) check-out day.
        // For a 1-night stay (checkIn=X, checkOut=X+1), day X is blocked.
        // For a 0-night stay (checkIn=X, checkOut=X), day X is blocked.
        const occupiedStart = startOfDay(checkIn);
        const occupiedEnd = subDays(startOfDay(checkOut), 0); // This makes it inclusive of check-out day for 0-night stays, and exclusive for >0 night stays

        if (isWithinInterval(date, { start: occupiedStart, end: occupiedEnd })) {
          return true;
        }
      }
    }
    return false;
  }, [selectedRoomId, allReservations, initialBooking]);

  // Function to determine disabled dates for DEPARTURE
  const getDisabledDatesForDeparture = React.useCallback((date: Date) => {
    if (!selectedRoomId) return false;

    // A departure date cannot be before the selected arrival date
    if (selectedArrivalDate && isBefore(date, selectedArrivalDate)) {
      return true;
    }

    const roomReservations = allReservations.filter(res =>
      res.krossbooking_room_id === selectedRoomId &&
      res.status !== 'CANC' && // Do not consider cancelled reservations as blocking
      (initialBooking ? res.id !== initialBooking.id : true) // Exclude the current booking if editing
    );

    for (const res of roomReservations) {
      const checkIn = isValid(parseISO(res.check_in_date)) ? parseISO(res.check_in_date) : null;
      const checkOut = isValid(parseISO(res.check_out_date)) ? parseISO(res.check_out_date) : null;

      if (checkIn && checkOut) {
        // A day is blocked for departure if it falls *strictly between* another reservation's check-in and check-out.
        // This means the check-in day of another reservation *can* be selected as a departure day.
        // Example: Res A: 25-27. New Res: Arrive 24. Departure 25 is allowed. Departure 26 is NOT allowed.
        const blockStart = addDays(startOfDay(checkIn), 0); // Start of blocking interval for departure
        const blockEnd = subDays(startOfDay(checkOut), 1); // End of blocking interval for departure

        if (isBefore(blockEnd, blockStart)) { // Handles 0 or 1 night stays where blockEnd would be before blockStart
          // For 0 or 1 night stays, there's no "middle" to block.
          // The only blocking is if the departure date is the same as the check-in date of another reservation,
          // but this is allowed as per the user's request (can depart on the day another arrives).
          continue; 
        }

        if (isWithinInterval(date, { start: blockStart, end: blockEnd })) {
          return true;
        }
      }
    }
    return false;
  }, [selectedRoomId, allReservations, initialBooking, selectedArrivalDate]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const formattedArrival = format(values.arrivalDate, 'yyyy-MM-dd');
    const formattedDeparture = format(values.departureDate, 'yyyy-MM-dd');

    const cod_reservation_status = values.foreseeCleaning ? 'PROPRI' : 'PROP0';
    const cleaningSuffix = values.foreseeCleaning ? ' avec ménage' : ' sans ménage';
    const label = `${values.blockType}${cleaningSuffix}`;

    const payload: any = { // Use 'any' for now to allow id_reservation
      label: label,
      arrival: formattedArrival,
      departure: formattedDeparture,
      email: values.email || '',
      phone: values.phone || '',
      cod_reservation_status: cod_reservation_status,
      id_room: values.roomId,
    };

    if (initialBooking && initialBooking.id) {
      payload.id_reservation = initialBooking.id; // Add id_reservation for updates
    }

    try {
      await saveKrossbookingReservation(payload);
      toast.success(initialBooking ? "Réservation mise à jour avec succès !" : "Réservation propriétaire créée avec succès !");
      onReservationCreated(); // Trigger refresh in parent
      onOpenChange(false); // Close dialog
    } catch (error: any) {
      toast.error(`Erreur lors de la ${initialBooking ? 'mise à jour' : 'création'} de la réservation : ${error.message}`);
      console.error("Error saving owner reservation:", error);
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
              name="arrivalDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date d'arrivée</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: fr })
                          ) : (
                            <span>Choisir une date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        locale={fr}
                        disabled={getDisabledDatesForArrival} // Apply disabled dates logic for arrival
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="departureDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date de départ</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: fr })
                          ) : (
                            <span>Choisir une date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        locale={fr}
                        disabled={getDisabledDatesForDeparture} // Apply disabled dates logic for departure
                        min={selectedArrivalDate || new Date()} // Ensure departure is not before arrival
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
              <Button type="submit" disabled={form.formState.isSubmitting}>
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