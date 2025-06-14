import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
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
import { saveKrossbookingReservation } from '@/lib/krossbooking';
import { UserRoom } from '@/lib/user-room-api';
import { toast } from 'sonner';

interface OwnerReservationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userRooms: UserRoom[];
  onReservationCreated: () => void;
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
  onReservationCreated,
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

  React.useEffect(() => {
    if (!isOpen) {
      form.reset(); // Reset form when dialog closes
    }
  }, [isOpen, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const formattedArrival = format(values.arrivalDate, 'yyyy-MM-dd');
    const formattedDeparture = format(values.departureDate, 'yyyy-MM-dd');

    const cod_reservation_status = values.foreseeCleaning ? 'PROPRI' : 'PROP0';
    const cleaningSuffix = values.foreseeCleaning ? ' avec ménage' : ' sans ménage';
    const label = `${values.blockType}${cleaningSuffix}`;

    const payload = {
      label: label,
      arrival: formattedArrival,
      departure: formattedDeparture,
      email: values.email || '',
      phone: values.phone || '',
      cod_reservation_status: cod_reservation_status,
      id_room: values.roomId,
    };

    try {
      await saveKrossbookingReservation(payload);
      toast.success("Réservation propriétaire créée avec succès !");
      onReservationCreated(); // Trigger refresh in parent
      onOpenChange(false); // Close dialog
    } catch (error: any) {
      toast.error(`Erreur lors de la création de la réservation : ${error.message}`);
      console.error("Error creating owner reservation:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Créer une Réservation Propriétaire</DialogTitle>
          <DialogDescription>
            Bloquez des dates pour un séjour propriétaire, une fermeture ou un entretien.
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                {form.formState.isSubmitting ? 'Création...' : 'Créer la Réservation'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default OwnerReservationDialog;