import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
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
import { UserRoom } from '@/lib/user-room-api';
import { saveChannelManagerSettings } from '@/lib/krossbooking';
import { toast } from 'sonner';

interface PriceRestrictionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userRooms: UserRoom[];
  onSettingsSaved: () => void;
}

const channels = [
  { value: 'AIRBNB', label: 'Airbnb' },
  { value: 'BOOKING', label: 'Booking.com' },
  { value: 'ABRITEL', label: 'Abritel' },
  { value: 'DIRECT', label: 'Direct' },
  { value: 'HELLOKEYS', label: 'Hello Keys' },
];

// Example rate types. You might need to adjust these based on your Krossbooking setup.
const rateTypes = [
  { value: '5', label: 'Tarif Standard' }, // Common default rate ID
  { value: '1', label: 'Tarif Propriétaire' }, // Example of another rate ID
  // Add more as needed, e.g., { value: 'YOUR_RATE_ID', label: 'Your Custom Rate Name' }
];

const formSchema = z.object({
  roomId: z.string().min(1, { message: 'Veuillez sélectionner une chambre.' }),
  channel: z.string().min(1, { message: 'Veuillez sélectionner un canal.' }),
  idRate: z.string().min(1, { message: 'Veuillez sélectionner un type de tarif.' }), // New field for idRate
  dateRange: z.object({
    from: z.date({ required_error: 'La date de début est requise.' }),
    to: z.date({ required_error: 'La date de fin est requise.' }),
  }).refine(data => data.to! >= data.from, {
    message: 'La date de fin ne peut pas être antérieure à la date de début.',
    path: ['to'],
  }),
  price: z.coerce.number().min(0, { message: 'Le prix ne peut pas être négatif.' }).optional().or(z.literal('')),
  closed: z.boolean().default(false),
  minStay: z.coerce.number().min(0, { message: 'Le séjour minimum ne peut pas être négatif.' }).optional().or(z.literal('')),
  maxStay: z.coerce.number().min(0, { message: 'Le séjour maximum ne peut pas être négatif.' }).optional().or(z.literal('')),
  closedOnArrival: z.boolean().default(false),
  closedOnDeparture: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.minStay !== '' && data.maxStay !== '' && data.minStay !== undefined && data.maxStay !== undefined && data.minStay > data.maxStay) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Le séjour minimum ne peut pas être supérieur au séjour maximum.',
      path: ['minStay'],
    });
  }
});

const PriceRestrictionDialog: React.FC<PriceRestrictionDialogProps> = ({
  isOpen,
  onOpenChange,
  userRooms,
  onSettingsSaved,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roomId: '',
      channel: '',
      idRate: '1', // Default to '1' as requested
      dateRange: {
        from: undefined,
        to: undefined,
      },
      price: '',
      closed: false,
      minStay: '',
      maxStay: '',
      closedOnArrival: false,
      closedOnDeparture: false,
    },
  });

  React.useEffect(() => {
    if (!isOpen) {
      form.reset(); // Reset form when dialog closes
    }
  }, [isOpen, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const formattedDateFrom = format(values.dateRange.from, 'yyyy-MM-dd');
    const formattedDateTo = format(values.dateRange.to!, 'yyyy-MM-dd');

    const cmBlock: any = {
      id_room_type: parseInt(values.roomId),
      id_rate: parseInt(values.idRate), // Use selected idRate
      cod_channel: values.channel,
      date_from: formattedDateFrom,
      date_to: formattedDateTo,
    };

    if (values.price !== '' && values.price !== undefined) {
      cmBlock.price = values.price;
    }
    if (values.closed) {
      cmBlock.closed = values.closed;
    }

    const restrictions: any = {};
    if (values.minStay !== '' && values.minStay !== undefined) {
      restrictions.MINST = values.minStay;
    }
    if (values.maxStay !== '' && values.maxStay !== undefined) {
      restrictions.MAXST = values.maxStay;
    }
    if (values.closedOnArrival) {
      restrictions.CLARR = values.closedOnArrival;
    }
    if (values.closedOnDeparture) {
      restrictions.CLDEP = values.closedOnDeparture;
    }

    if (Object.keys(restrictions).length > 0) {
      cmBlock.restrictions = restrictions;
    }

    const payload = {
      cm: {
        [`block_${Date.now()}`]: cmBlock, // Generate a unique key for the block
      },
    };

    try {
      await saveChannelManagerSettings(payload);
      toast.success("Prix et restrictions mis à jour avec succès !");
      onSettingsSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Erreur lors de la mise à jour : ${error.message}`);
      console.error("Error saving channel manager settings:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Configurer Prix & Restrictions</DialogTitle>
          <DialogDescription>
            Définissez les prix et les restrictions de séjour pour vos chambres sur différents canaux.
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
              name="channel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Canal de Distribution</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un canal" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {channels.map((channel) => (
                        <SelectItem key={channel.value} value={channel.value}>
                          {channel.label}
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
              name="idRate" // New field
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de Tarif</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type de tarif" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {rateTypes.map((rate) => (
                        <SelectItem key={rate.value} value={rate.value}>
                          {rate.label}
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
                  <FormLabel>Dates de début et de fin</FormLabel>
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
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prix (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Laisser vide pour ne pas modifier le prix"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value === '' ? '' : Number(e.target.value);
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="closed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Fermer la disponibilité</FormLabel>
                    <DialogDescription>
                      Bloque la chambre pour la période sélectionnée sur ce canal.
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="minStay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Séjour Minimum (nuits)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Laisser vide pour ne pas modifier"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value === '' ? '' : Number(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxStay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Séjour Maximum (nuits)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Laisser vide pour ne pas modifier"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value === '' ? '' : Number(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="closedOnArrival"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Fermé à l'arrivée</FormLabel>
                    <DialogDescription>
                      Empêche les arrivées ce jour-là.
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
              name="closedOnDeparture"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Fermé au départ</FormLabel>
                    <DialogDescription>
                      Empêche les départs ce jour-là.
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  'Sauvegarder les paramètres'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PriceRestrictionDialog;