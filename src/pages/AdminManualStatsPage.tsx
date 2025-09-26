import React, { useState, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllProfiles, addManualStatements } from '@/lib/admin-api';
import { UserProfile } from '@/lib/profile-api';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronDown, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const statementSchema = z.object({
  year: z.string().min(1, "Année requise."),
  month: z.string().min(1, "Mois requis."),
  totalCA: z.number().min(0, "Le CA doit être positif."),
  totalMontantVerse: z.number().min(0, "Le montant versé doit être positif."),
  totalFacture: z.number().min(0, "La facture doit être positive."),
  totalNuits: z.number().int().min(0, "Le nombre de nuits doit être un entier positif."),
  totalVoyageurs: z.number().int().min(0, "Le nombre de voyageurs doit être un entier positif."),
  totalReservations: z.number().int().min(0, "Le nombre de réservations doit être un entier positif."),
});

const formSchema = z.object({
  userId: z.string().min(1, "Veuillez sélectionner un client."),
  statements: z.array(statementSchema).min(1, "Veuillez ajouter au moins une période."),
});

type FormSchema = z.infer<typeof formSchema>;

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => (currentYear - i).toString());
const months = Array.from({ length: 12 }, (_, i) => {
  const monthName = format(new Date(2000, i, 1), 'MMMM', { locale: fr });
  return {
    value: i.toString(),
    label: monthName.charAt(0).toUpperCase() + monthName.slice(1),
  };
});

const AdminManualStatsPage: React.FC = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: '',
      statements: [{
        year: currentYear.toString(),
        month: (new Date().getMonth()).toString(),
        totalCA: 0,
        totalMontantVerse: 0,
        totalFacture: 0,
        totalNuits: 0,
        totalVoyageurs: 0,
        totalReservations: 0,
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "statements",
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

  const onSubmit = async (data: FormSchema) => {
    setIsSubmitting(true);
    const toastId = toast.loading("Ajout des statistiques en cours...");
    try {
      const { userId, statements } = data;
      const formattedStatements = statements.map(s => ({
        period: `${months[parseInt(s.month)].label} ${s.year}`,
        totalCA: s.totalCA,
        totalMontantVerse: s.totalMontantVerse,
        totalFacture: s.totalFacture,
        totalNuits: s.totalNuits,
        totalVoyageurs: s.totalVoyageurs,
        totalReservations: s.totalReservations,
      }));

      await addManualStatements(userId, formattedStatements);
      toast.success("Statistiques manuelles ajoutées avec succès !", { id: toastId });
      form.reset();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <Card className="max-w-4xl mx-auto shadow-md">
          <CardHeader>
            <CardTitle>Ajout de Statistiques Manuelles</CardTitle>
            <CardDescription>
              Ajoutez les données des relevés passés pour un client. Vous pouvez ajouter plusieurs mois à la fois.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-2">
                <Label htmlFor="client-select">Client</Label>
                <Controller
                  name="userId"
                  control={form.control}
                  render={({ field }) => (
                    <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isComboboxOpen}
                          className="w-full md:w-1/2 justify-between"
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
                {form.formState.errors.userId && <p className="text-sm text-red-500">{form.formState.errors.userId.message}</p>}
              </div>

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <Card key={field.id} className="bg-slate-50 dark:bg-slate-800/50">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <Controller
                          name={`statements.${index}.year`}
                          control={form.control}
                          render={({ field }) => (
                            <div className="space-y-2">
                              <Label>Année</Label>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger><SelectValue placeholder="Année" /></SelectTrigger>
                                <SelectContent>
                                  {years.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        />
                        <Controller
                          name={`statements.${index}.month`}
                          control={form.control}
                          render={({ field }) => (
                            <div className="space-y-2">
                              <Label>Mois</Label>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger><SelectValue placeholder="Mois" /></SelectTrigger>
                                <SelectContent>
                                  {months.map(month => <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Chiffre d'Affaires (€)</Label>
                          <Input type="number" step="0.01" {...form.register(`statements.${index}.totalCA`, { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Montant Versé (€)</Label>
                          <Input type="number" step="0.01" {...form.register(`statements.${index}.totalMontantVerse`, { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Total Facture HK (€)</Label>
                          <Input type="number" step="0.01" {...form.register(`statements.${index}.totalFacture`, { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Nuits</Label>
                          <Input type="number" {...form.register(`statements.${index}.totalNuits`, { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Voyageurs</Label>                          
                          <Input type="number" {...form.register(`statements.${index}.totalVoyageurs`, { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Réservations</Label>
                          <Input type="number" {...form.register(`statements.${index}.totalReservations`, { valueAsNumber: true })} />
                        </div>
                      </div>
                      <div className="flex justify-end mt-4">
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({
                    year: currentYear.toString(),
                    month: (new Date().getMonth()).toString(),
                    totalCA: 0, totalMontantVerse: 0, totalFacture: 0, totalNuits: 0, totalVoyageurs: 0, totalReservations: 0
                  })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Ajouter un autre mois
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Ajouter les statistiques
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminManualStatsPage;