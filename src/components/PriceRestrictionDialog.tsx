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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { getOverrides, addOverride, deleteOverride, PriceOverride, NewPriceOverride } from '@/lib/price-override-api';
import { Skeleton } from '@/components/ui/skeleton';

interface PriceRestrictionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userRooms: UserRoom[];
  onSettingsSaved: () => void;
}

const formSchema = z.object({
  roomId: z.string().min(1, { message: 'Veuillez sélectionner une chambre.' }),
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
  closedOnArrival: z.boolean().default(false),
  closedOnDeparture: z.boolean().default(false),
});

const PriceRestrictionDialog: React.FC<PriceRestrictionDialogProps> = ({
  isOpen,
  onOpenChange,
  userRooms,
  onSettingsSaved,
}) => {
  const [overrides, setOverrides] = useState<PriceOverride[]>([]);
  const [isLoadingOverrides, setIsLoadingOverrides] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roomId: '',
      dateRange: { from: undefined, to: undefined },
      price: '',
      closed: false,
      minStay: '',
      closedOnArrival: false,
      closedOnDeparture: false,
    },
  });

  const fetchOverrides = async () => {
    setIsLoadingOverrides(true);
    try {
      const data = await getOverrides();
      setOverrides(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoadingOverrides(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOverrides();
      form.reset();
    }
  }, [isOpen, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const roomIdNumber = parseInt(values.roomId);
    if (isNaN(roomIdNumber)) {
      toast.error(`ID de chambre invalide sélectionné (${values.roomId}).`);
      return;
    }

    const formattedDateFrom = format(values.dateRange.from, 'yyyy-MM-dd');
    const formattedDateTo = format(values.dateRange.to!, 'yyyy-MM-dd');

    const cmBlock: any = {
      id_room_type: roomIdNumber,
      id_rate: 1,
      cod_channel: 'BE',
      date_from: formattedDateFrom,
      date_to: formattedDateTo,
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

    const payload = { cm: { [`block_${Date.now()}`]: cmBlock } };

    try {
      await saveChannelManagerSettings(payload);

      const selectedRoom = userRooms.find(r => r.room_id === values.roomId);
      const overrideToSave: NewPriceOverride = {
        room_id: values.roomId,
        room_name: selectedRoom?.room_name || 'N/A',
        start_date: formattedDateFrom,
        end_date: formattedDateTo,
        price: values.price !== '' ? values.price : undefined,
        closed: values.closed,
        min_stay: values.minStay !== '' ? values.minStay : undefined,
        closed_on_arrival: values.closedOnArrival,
        closed_on_departure: values.closedOnDeparture,
      };
      await addOverride(overrideToSave);

      toast.success("Prix et restrictions mis à jour avec succès !");
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

    const priceInput = window.prompt("Pour restaurer le prix, entrez une nouvelle valeur. Laissez vide pour ne pas modifier le prix actuel.", "");

    if (priceInput === null) {
      return; // User clicked Cancel
    }

    const roomIdNumber = parseInt(override.room_id);
    if (isNaN(roomIdNumber)) {
      toast.error(`ID de chambre invalide dans l'historique (${override.room_id}). Impossible de continuer.`);
      return;
    }

    const resetCmBlock: any = {
      id_room_type: roomIdNumber,
      id_rate: 1,
      cod_channel: 'BE',
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
    const toastId = toast.loading("Suppression en cours...");

    try {
      await saveChannelManagerSettings(payload);
      await deleteOverride(override.id);

      toast.success("Modification supprimée et valeurs par défaut restaurées.", { id: toastId });
      fetchOverrides();
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
                <FormField control={form.control} name="dateRange" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Dates</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value.from && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value.from ? (field.value.to ? (<>{format(field.value.from, "PPP", { locale: fr })} - {format(field.value.to, "PPP", { locale: fr })}</>) : (format(field.value.from, "PPP", { locale: fr }))) : (<span>Choisir une plage de dates</span>)}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={field.value.from} selected={field.value} onSelect={field.onChange} numberOfMonths={1} locale={fr} /></PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
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
              {isLoadingOverrides ? (
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