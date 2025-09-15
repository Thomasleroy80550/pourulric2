import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Loader2, Trash2 } from 'lucide-react';
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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { UserRoom } from '@/lib/user-room-api';
import { saveChannelManagerSettings, fetchKrossbookingRoomTypes, KrossbookingRoomType } from '@/lib/krossbooking';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { getOverrides, addOverrides, deleteOverride, PriceOverride, NewPriceOverride } from '@/lib/price-override-api';
import { Skeleton } from '@/components/ui/skeleton';

interface PriceRestrictionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userRooms: UserRoom[];
  onSettingsSaved: () => void;
}

const seasons = [
  {
    name: 'Week-end +',
    ranges: [
      { from: '18/04/2025', to: '20/04/2025' },
      { from: '30/04/2025', to: '03/05/2025' },
      { from: '07/05/2025', to: '10/05/2025' },
      { from: '28/05/2025', to: '31/05/2025' },
      { from: '06/06/2025', to: '08/06/2025' },
      { from: '11/07/2025', to: '14/07/2025' },
      { from: '14/08/2025', to: '16/08/2025' },
      { from: '31/10/2025', to: '01/11/2025' },
      { from: '07/11/2025', to: '10/11/2025' },
    ],
  },
  {
    name: 'Haute saison',
    ranges: [
      { from: '04/04/2025', to: '29/04/2025' },
      { from: '27/06/2025', to: '06/09/2025' },
      { from: '17/10/2025', to: '30/10/2025' },
      { from: '19/12/2025', to: '03/01/2026' },
    ],
  },
  {
    name: 'Moyenne saison',
    ranges: [
      { from: '07/02/2025', to: '03/04/2025' },
      { from: '04/05/2025', to: '06/05/2025' },
      { from: '11/05/2025', to: '27/05/2025' },
      { from: '01/06/2025', to: '05/06/2025' },
      { from: '09/06/2025', to: '26/06/2025' },
      { from: '07/09/2025', to: '27/09/2025' },
    ],
  },
  {
    name: 'Basse saison',
    ranges: [
      { from: '28/09/2025', to: '16/10/2025' },
      { from: '09/03/2025', to: '03/04/2025' },
      { from: '02/11/2025', to: '06/11/2025' },
      { from: '11/11/2025', to: '18/12/2025' },
    ],
  },
];

const parseDateString = (dateStr: string): Date => {
  const [day, month, year] = dateStr.split('/');
  return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
};

const formSchema = z.object({
  roomId: z.string().min(1, { message: 'Veuillez sélectionner une chambre.' }),
  seasonName: z.string().optional(),
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }),
  price: z.coerce.number().min(0, { message: 'Le prix ne peut pas être négatif.' }).optional().or(z.literal('')),
  closed: z.boolean().default(false),
  minStay: z.coerce.number().min(0, { message: 'Le séjour minimum ne peut pas être négatif.' }).optional().or(z.literal('')),
  closedOnArrival: z.boolean().default(false),
  closedOnDeparture: z.boolean().default(false),
}).refine(data => {
    return data.seasonName || (data.dateRange.from && data.dateRange.to);
}, {
    message: "Veuillez sélectionner une saison ou une plage de dates personnalisée.",
    path: ["seasonName"],
});

const PriceRestrictionDialog: React.FC<PriceRestrictionDialogProps> = ({
  isOpen,
  onOpenChange,
  userRooms,
  onSettingsSaved,
}) => {
  const [overrides, setOverrides] = useState<PriceOverride[]>([]);
  const [isLoadingOverrides, setIsLoadingOverrides] = useState(true);
  // roomTypes and isLoadingRoomTypes are kept for potential future validation/display,
  // but not directly used for id_room_type mapping anymore.
  const [roomTypes, setRoomTypes] = useState<KrossbookingRoomType[]>([]);
  const [isLoadingRoomTypes, setIsLoadingRoomTypes] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roomId: '',
      seasonName: '',
      dateRange: { from: undefined, to: undefined },
      price: '',
      closed: false,
      minStay: '',
      closedOnArrival: false,
      closedOnDeparture: false,
    },
  });

  const fetchDialogData = async () => {
    setIsLoadingOverrides(true);
    setIsLoadingRoomTypes(true); // Still fetch room types for general info/validation
    try {
      const [overridesData, roomTypesData] = await Promise.all([
        getOverrides(),
        fetchKrossbookingRoomTypes(), // Fetch Krossbooking room types
      ]);
      setOverrides(overridesData);
      setRoomTypes(roomTypesData);
      console.log("DEBUG: userRooms prop (your configured rooms):", userRooms);
      console.log("DEBUG: roomTypes fetched from Krossbooking (for info/validation):", roomTypesData);
    } catch (error: any) {
      toast.error(`Erreur lors du chargement des données : ${error.message}`);
    } finally {
      setIsLoadingOverrides(false);
      setIsLoadingRoomTypes(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDialogData();
      form.reset();
    }
  }, [isOpen, form, userRooms]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log("DEBUG: onSubmit values:", values);
    
    const selectedRoom = userRooms.find(r => r.room_id === values.roomId);
    if (!selectedRoom) {
      toast.error("Chambre sélectionnée introuvable dans votre configuration.");
      return;
    }

    // Prioritize room_id_2 for Krossbooking API calls, fallback to room_id
    const krossbookingRoomTypeId = selectedRoom.room_id_2 ? parseInt(selectedRoom.room_id_2, 10) : parseInt(selectedRoom.room_id, 10);

    if (isNaN(krossbookingRoomTypeId)) {
      toast.error("L'ID de la chambre (ou ID 2) sélectionnée n'est pas un nombre valide. Veuillez vérifier votre configuration.");
      console.error("ERROR: Parsed krossbookingRoomTypeId is NaN. Check userRooms configuration, especially room_id_2.");
      return;
    }
    console.log(`DEBUG: Using Krossbooking Room Type ID for submission: ${krossbookingRoomTypeId}`);

    let dateRanges: { from: string; to: string }[] = [];
    let toastMessage = "Prix et restrictions mis à jour avec succès !";

    if (values.seasonName) {
        const selectedSeason = seasons.find(s => s.name === values.seasonName);
        if (selectedSeason) {
            dateRanges = selectedSeason.ranges.map(range => ({
                from: format(parseDateString(range.from), 'yyyy-MM-dd'),
                to: format(parseDateString(range.to), 'yyyy-MM-dd'),
            }));
            toastMessage = `Paramètres appliqués à la saison '${selectedSeason.name}'.`;
        }
    } else if (values.dateRange.from && values.dateRange.to) {
        dateRanges = [{
            from: format(values.dateRange.from, 'yyyy-MM-dd'),
            to: format(values.dateRange.to, 'yyyy-MM-dd'),
        }];
    }

    if (dateRanges.length === 0) {
        toast.error("Aucune plage de dates valide à traiter.");
        return;
    }

    const cmPayload: { [key: string]: any } = {};
    dateRanges.forEach((range, index) => {
        const cmBlock: any = {
            id_room_type: krossbookingRoomTypeId, // Use the derived ID here
            id_rate: 1, // Hardcoded to 1
            cod_channel: 'BE', // Hardcoded to 'BE'
            date_from: range.from,
            date_to: range.to,
        };

        if (values.price !== '' && values.price !== undefined) cmBlock.price = values.price;
        if (values.closed) cmBlock.closed = values.closed;

        const restrictions: any = {};
        if (values.minStay !== '' && values.minStay !== undefined) {
            restrictions.MINST = values.minStay;
        } else {
            restrictions.MINST = 2;
        }
        if (values.closedOnArrival) restrictions.CLARR = values.closedOnArrival;
        if (values.closedOnDeparture) restrictions.CLDEP = values.closedOnDeparture;

        if (Object.keys(restrictions).length > 0) cmBlock.restrictions = restrictions;
        
        cmPayload[`block_${Date.now()}_${index}`] = cmBlock;
    });

    const payload = { cm: cmPayload };
    console.log(`DEBUG: Final cmPayload before sending: ${JSON.stringify(payload)}`);

    const overridesToSave: NewPriceOverride[] = dateRanges.map(range => ({
        room_id: values.roomId,
        room_name: selectedRoom?.room_name || 'N/A',
        room_id_2: selectedRoom?.room_id_2 || undefined, // Store room_id_2 in the override
        start_date: range.from,
        end_date: range.to,
        price: values.price !== '' ? values.price : undefined,
        closed: values.closed,
        min_stay: values.minStay !== '' ? values.minStay : undefined,
        closed_on_arrival: values.closedOnArrival,
        closed_on_departure: values.closedOnDeparture,
    }));

    try {
        await saveChannelManagerSettings(payload);
        await addOverrides(overridesToSave);

        toast.success(toastMessage);
        onSettingsSaved();
        onOpenChange(false);
    } catch (error: any) {
        toast.error(`Erreur lors de la mise à jour : ${error.message}`);
    }
  };

  const handleDeleteOverride = async (override: PriceOverride) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette modification et restaurer les valeurs par défaut ?")) {
      return;
    }

    // Prioritize room_id_2 for Krossbooking API calls, fallback to room_id
    const roomTypeIdToDelete = override.room_id_2 ? parseInt(override.room_id_2, 10) : parseInt(override.room_id, 10);
    if (isNaN(roomTypeIdToDelete)) {
      toast.error(`L'ID de la chambre (ou ID 2) dans l'historique n'est pas valide (${override.room_id}, ${override.room_id_2}). Impossible de continuer.`);
      console.error(`ERROR: Parsed roomTypeIdToDelete is NaN for override deletion. Override roomId: ${override.room_id}, room_id_2: ${override.room_id_2}`);
      return;
    }
    console.log(`DEBUG: Using Krossbooking Room Type ID for deletion: ${roomTypeIdToDelete}`);

    const priceInput = window.prompt("Pour restaurer le prix, entrez une nouvelle valeur. Laissez vide pour ne pas modifier le prix actuel.", "");

    if (priceInput === null) {
      return; // User clicked Cancel
    }

    const resetCmBlock: any = {
      id_room_type: roomTypeIdToDelete, // Use the derived ID here
      id_rate: 1, // Hardcoded to 1
      cod_channel: 'BE', // Hardcoded to 'BE'
      date_from: override.start_date,
      date_to: override.end_date,
      closed: false,
      restrictions: { MINST: 2, CLARR: false, CLDEP: false },
    };

    if (priceInput.trim() !== '') {
      const price = parseFloat(priceInput);
      if (isNaN(price)) {
        toast.error("Le prix entré n'est pas un nombre valide. La suppression a été annulée.");
        return;
      }
      resetCmBlock.price = price;
    }

    const payload = { cm: { [`reset_${override.id}`]: resetCmBlock } };
    console.log(`DEBUG: Final resetCmBlock payload before sending: ${JSON.stringify(payload)}`);
    const toastId = toast.loading("Suppression en cours...");

    try {
      await saveChannelManagerSettings(payload);
      await deleteOverride(override.id);

      toast.success("Modification supprimée et valeurs par défaut restaurées.", { id: toastId });
      fetchDialogData(); // Refresh both overrides and room types
    } catch (error: any) {
      toast.error(`Erreur lors de la suppression : ${error.message}`, { id: toastId });
      console.error("Error during override deletion:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Configurer Prix & Restrictions</DialogTitle>
          <DialogDescription>
            Créez une nouvelle modification ou consultez l'historique.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Créer</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>
          <TabsContent value="create">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="roomId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chambre</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner une chambre" /></SelectTrigger></FormControl>
                      <SelectContent>{userRooms.map((room) => (<SelectItem key={room.id} value={room.room_id}>{room.room_name}</SelectItem>))}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                
                <FormField
                  control={form.control}
                  name="seasonName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Appliquer à une saison entière</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue('dateRange', { from: undefined, to: undefined });
                          form.clearErrors('dateRange');
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Optionnel: choisir une saison" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {seasons.map(season => (
                            <SelectItem key={season.name} value={season.name}>
                              {season.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Applique les paramètres à toutes les périodes de la saison. Ignore le sélecteur de dates ci-dessous.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateRange"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Ou choisir une plage de dates personnalisée</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              id="date"
                              variant={"outline"}
                              className={cn("w-full justify-start text-left font-normal", !field.value?.from && "text-muted-foreground")}
                              disabled={!!form.watch('seasonName')}
                              onClick={() => {
                                form.setValue('seasonName', '');
                                form.clearErrors('seasonName');
                              }}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value?.from ? (field.value.to ? (<>{format(field.value.from, "PPP", { locale: fr })} - {format(field.value.to, "PPP", { locale: fr })}</>) : (format(field.value.from, "PPP", { locale: fr }))) : (<span>Choisir une plage de dates</span>)}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={field.value?.from}
                            selected={field.value}
                            onSelect={field.onChange}
                            numberOfMonths={1}
                            locale={fr}
                            disabled={!!form.watch('seasonName')}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix (€)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="Laisser vide pour ne pas modifier" {...field} onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="minStay" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Séjour Minimum (nuits)</FormLabel>
                    <FormControl><Input type="number" placeholder="Par défaut : 2 nuits" {...field} onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="closed" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Fermer la disponibilité</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="closedOnArrival" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Fermé à l'arrivée</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="closedOnDeparture" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Fermé au départ</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                )} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sauvegarde...</>) : ('Sauvegarder')}</Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="history">
            <ScrollArea className="h-96 w-full rounded-md border p-4 mt-4">
              {isLoadingOverrides || isLoadingRoomTypes ? ( // Still show skeleton if room types are loading
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : overrides.length === 0 ? (
                <p className="text-center text-gray-500">Aucune modification enregistrée.</p>
              ) : (
                <div className="space-y-3">
                  {overrides.map((override) => (
                    <div key={override.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <div>
                        <p className="font-semibold">{override.room_name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {format(new Date(override.start_date), 'dd/MM/yy')} - {format(new Date(override.end_date), 'dd/MM/yy')}
                        </p>
                        <div className="text-xs text-gray-500 dark:text-gray-300">
                          {override.price && `Prix: ${override.price}€ `}
                          {override.min_stay && `Min: ${override.min_stay}n `}
                          {override.closed && `Fermé `}
                          {override.room_id_2 && `(ID2: ${override.room_id_2})`}
                        </div>
                      </div>
                      <Button variant="destructive" size="icon" onClick={() => handleDeleteOverride(override)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PriceRestrictionDialog;