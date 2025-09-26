import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAllProfiles, addManualStatement } from '@/lib/admin-api';
import { UserProfile } from '@/lib/profile-api';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const statsSchema = z.object({
  userId: z.string().min(1, "Veuillez sélectionner un client."),
  period: z.string().min(1, "La période est requise."),
  totalCA: z.number().min(0, "Le CA doit être positif."),
  totalMontantVerse: z.number().min(0, "Le montant versé doit être positif."),
  totalFacture: z.number().min(0, "La facture doit être positive."),
  totalNuits: z.number().int().min(0, "Le nombre de nuits doit être un entier positif."),
  totalVoyageurs: z.number().int().min(0, "Le nombre de voyageurs doit être un entier positif."),
  totalReservations: z.number().int().min(0, "Le nombre de réservations doit être un entier positif."),
});

type StatsFormData = z.infer<typeof statsSchema>;

const AdminManualStatsPage: React.FC = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<StatsFormData>({
    resolver: zodResolver(statsSchema),
    defaultValues: {
      userId: '',
      period: '',
      totalCA: 0,
      totalMontantVerse: 0,
      totalFacture: 0,
      totalNuits: 0,
      totalVoyageurs: 0,
      totalReservations: 0,
    },
  });

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const fetchedProfiles = await getAllProfiles();
        setProfiles(fetchedProfiles);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoadingProfiles(false);
      }
    };
    fetchProfiles();
  }, []);

  const onSubmit = async (data: StatsFormData) => {
    setIsSubmitting(true);
    const toastId = toast.loading("Ajout des statistiques en cours...");
    try {
      await addManualStatement(data);
      toast.success("Statistiques manuelles ajoutées avec succès !", { id: toastId });
      reset();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Ajout de Statistiques Manuelles</h1>
        <Card className="max-w-2xl mx-auto shadow-md">
          <CardHeader>
            <CardTitle>Saisir les données mensuelles</CardTitle>
            <CardDescription>
              Utilisez ce formulaire pour ajouter les données des relevés passés qui n'ont pas été générés par le système.
              Cela mettra à jour les tableaux de bord de performance sans créer de facture.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="client-select">Client</Label>
                <Controller
                  name="userId"
                  control={control}
                  render={({ field }) => (
                    <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isComboboxOpen}
                          className="w-full justify-between"
                          disabled={loadingProfiles}
                        >
                          {field.value
                            ? profiles.find((p) => p.id === field.value)?.first_name + " " + profiles.find((p) => p.id === field.value)?.last_name
                            : "Choisir un client..."}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Rechercher un client..." />
                          <CommandList>
                            <CommandEmpty>Aucun client trouvé.</CommandEmpty>
                            <CommandGroup>
                              {profiles.map((profile) => (
                                <CommandItem
                                  key={profile.id}
                                  value={`${profile.first_name} ${profile.last_name}`}
                                  onSelect={() => {
                                    field.onChange(profile.id);
                                    setIsComboboxOpen(false);
                                  }}
                                >
                                  {profile.first_name} {profile.last_name}
                                  <Check className={cn("ml-auto h-4 w-4", profile.id === field.value ? "opacity-100" : "opacity-0")} />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.userId && <p className="text-sm text-red-500">{errors.userId.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="period">Période</Label>
                <Input id="period" placeholder="Ex: Juillet 2023" {...register('period')} />
                {errors.period && <p className="text-sm text-red-500">{errors.period.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="totalCA">Chiffre d'Affaires (€)</Label>
                  <Input id="totalCA" type="number" step="0.01" {...register('totalCA', { valueAsNumber: true })} />
                  {errors.totalCA && <p className="text-sm text-red-500">{errors.totalCA.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalMontantVerse">Montant Versé (€)</Label>
                  <Input id="totalMontantVerse" type="number" step="0.01" {...register('totalMontantVerse', { valueAsNumber: true })} />
                  {errors.totalMontantVerse && <p className="text-sm text-red-500">{errors.totalMontantVerse.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalFacture">Total Facture HK (€)</Label>
                  <Input id="totalFacture" type="number" step="0.01" {...register('totalFacture', { valueAsNumber: true })} />
                  {errors.totalFacture && <p className="text-sm text-red-500">{errors.totalFacture.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalNuits">Nombre de Nuits</Label>
                  <Input id="totalNuits" type="number" {...register('totalNuits', { valueAsNumber: true })} />
                  {errors.totalNuits && <p className="text-sm text-red-500">{errors.totalNuits.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalVoyageurs">Nombre de Voyageurs</Label>
                  <Input id="totalVoyageurs" type="number" {...register('totalVoyageurs', { valueAsNumber: true })} />
                  {errors.totalVoyageurs && <p className="text-sm text-red-500">{errors.totalVoyageurs.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalReservations">Nombre de Réservations</Label>
                  <Input id="totalReservations" type="number" {...register('totalReservations', { valueAsNumber: true })} />
                  {errors.totalReservations && <p className="text-sm text-red-500">{errors.totalReservations.message}</p>}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ajouter les statistiques
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminManualStatsPage;