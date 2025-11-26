"use client";

import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { createHivernageRequest, HivernageInstructions } from '@/lib/hivernage-api';
import { getUserRooms, UserRoom } from '@/lib/user-room-api';
import { Snowflake, ChevronLeft, ChevronRight, Droplet, Flame, Trash2, Shirt, Lock, Ban } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';

type FormValues = {
  user_room_id?: string | null;
  instructions: HivernageInstructions;
  comments?: string;
};

const Hivernage2026Page: React.FC = () => {
  const form = useForm<FormValues>({
    defaultValues: {
      user_room_id: undefined,
      instructions: {
        cut_water: false,
        cut_water_heater: false,
        heating_frost_mode: true,
        empty_fridge: false,
        remove_linen: false,
        put_linen: false,
        close_shutters: true,
        no_change: false,
      },
      comments: '',
    },
    shouldUnregister: false,
  });

  const [rooms, setRooms] = useState<UserRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  const steps = ["Logement", "Consignes", "Commentaires", "Résumé"];
  const [step, setStep] = useState(0);
  const isLastStep = step === steps.length - 1;
  const progressValue = Math.round(((step + 1) / steps.length) * 100);

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  // AJOUT: Empêcher la soumission si on n'est pas à la dernière étape
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!isLastStep) {
      e.preventDefault();
      toast.error("Veuillez terminer les étapes avant d'envoyer.");
      return;
    }
    // seulement à la dernière étape, on délègue à react-hook-form
    form.handleSubmit(onSubmit)(e);
  };

  // AJOUT: Bloquer la touche Entrée qui déclenche une soumission implicite, sauf dans la textarea
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && !isLastStep) {
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      const isTextArea = tagName === 'textarea';
      if (!isTextArea) {
        e.preventDefault();
      }
    }
  };

  // AJOUT: bouton de validation d'étape
  const validateCurrentStep = async () => {
    const isValid = await form.trigger(); // valide les champs montés à l'écran
    if (isValid) {
      toast.success("Étape validée");
    } else {
      toast.error("Veuillez corriger les erreurs avant de continuer");
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const list = await getUserRooms();
        setRooms(list);
      } catch (e: any) {
        toast.error(`Erreur de chargement des logements: ${e.message}`);
      } finally {
        setLoadingRooms(false);
      }
    })();
  }, []);

  const onSubmit = async (values: FormValues) => {
    await createHivernageRequest({
      user_room_id: values.user_room_id || null,
      instructions: values.instructions,
      comments: values.comments,
    });
    toast.success("Votre demande d'hivernage a été envoyée !");
    form.reset();
    setStep(0);
  };

  // Watch pour afficher un résumé toujours à jour sans setter d'état
  const watchedRoomId = useWatch({ control: form.control, name: 'user_room_id' });
  const watchedInstructions = useWatch({ control: form.control, name: 'instructions' }) as HivernageInstructions;
  const watchedComments = useWatch({ control: form.control, name: 'comments' });

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <Snowflake className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold">Hivernage 2026</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          La conciergerie sera fermée du <strong>dimanche 4 janvier</strong> au <strong>mercredi 11</strong> inclus.
          Merci d'indiquer vos consignes pour votre logement afin que tout soit en ordre avant notre pause hivernale.
        </p>

        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Formulaire de consignes</CardTitle>
            <CardDescription>Choisissez le logement et les actions souhaitées, puis envoyez-nous vos instructions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{steps[step]}</span>
                <span className="text-xs text-muted-foreground">{step + 1} / {steps.length}</span>
              </div>
              <Progress value={progressValue} />
            </div>

            <Form {...form}>
              <form 
                onSubmit={handleFormSubmit} 
                onKeyDown={handleFormKeyDown}
                className="space-y-6"
              >
                {/* Étape 1: choix du logement */}
                {step === 0 && (
                  <FormItem>
                    <FormLabel>Logement (optionnel)</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        disabled={loadingRooms}
                        {...form.register('user_room_id')}
                      >
                        <option value="">— Sélectionner un logement —</option>
                        {rooms.map((r) => (
                          <option key={r.id} value={r.id}>{r.room_name}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}

                {/* Étape 2: consignes */}
                {step === 1 && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Activez les actions à effectuer pour votre logement.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="instructions.cut_water"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center gap-3">
                              <Droplet className={`h-5 w-5 ${field.value ? 'text-primary' : 'text-muted-foreground'}`} />
                              <FormLabel className="text-sm font-medium">Couper l'eau</FormLabel>
                            </div>
                            <FormControl>
                              <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="instructions.cut_water_heater"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center gap-3">
                              <Flame className={`h-5 w-5 ${field.value ? 'text-primary' : 'text-muted-foreground'}`} />
                              <FormLabel className="text-sm font-medium">Couper le chauffe-eau</FormLabel>
                            </div>
                            <FormControl>
                              <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="instructions.heating_frost_mode"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center gap-3">
                              <Snowflake className={`h-5 w-5 ${field.value ? 'text-primary' : 'text-muted-foreground'}`} />
                              <FormLabel className="text-sm font-medium">Chauffage en hors-gel</FormLabel>
                            </div>
                            <FormControl>
                              <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="instructions.empty_fridge"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center gap-3">
                              <Trash2 className={`h-5 w-5 ${field.value ? 'text-primary' : 'text-muted-foreground'}`} />
                              <FormLabel className="text-sm font-medium">Vider le réfrigérateur</FormLabel>
                            </div>
                            <FormControl>
                              <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="instructions.remove_linen"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center gap-3">
                              <Shirt className={`h-5 w-5 ${field.value ? 'text-primary' : 'text-muted-foreground'}`} />
                              <FormLabel className="text-sm font-medium">Enlever le linge</FormLabel>
                            </div>
                            <FormControl>
                              <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="instructions.put_linen"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center gap-3">
                              <Shirt className={`h-5 w-5 ${field.value ? 'text-primary' : 'text-muted-foreground'}`} />
                              <FormLabel className="text-sm font-medium">Mettre le linge</FormLabel>
                            </div>
                            <FormControl>
                              <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="instructions.close_shutters"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center gap-3">
                              <Lock className={`h-5 w-5 ${field.value ? 'text-primary' : 'text-muted-foreground'}`} />
                              <FormLabel className="text-sm font-medium">Fermer les volets</FormLabel>
                            </div>
                            <FormControl>
                              <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="instructions.no_change"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center gap-3">
                              <Ban className={`h-5 w-5 ${field.value ? 'text-primary' : 'text-muted-foreground'}`} />
                              <FormLabel className="text-sm font-medium">Ne rien modifier</FormLabel>
                            </div>
                            <FormControl>
                              <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Étape 3: commentaires */}
                {step === 2 && (
                  <FormField
                    control={form.control}
                    name="comments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Commentaires (optionnel)</FormLabel>
                        <FormControl>
                          <Textarea rows={5} placeholder="Ajoutez des précisions..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Étape 4: résumé */}
                {step === 3 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Résumé de votre demande</h3>
                    <div className="rounded-md border p-4 space-y-3 bg-muted/40">
                      <div>
                        <span className="text-sm font-medium">Logement:</span>{' '}
                        <span className="text-sm text-muted-foreground">
                          {(() => {
                            const found = rooms.find((r) => r.id === watchedRoomId);
                            return found ? found.room_name : "Non spécifié";
                          })()}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Consignes:</span>
                        <ul className="mt-2 list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {!watchedInstructions || Object.values(watchedInstructions).filter(Boolean).length === 0 ? (
                            <li>Aucune consigne sélectionnée</li>
                          ) : (
                            <>
                              {watchedInstructions.cut_water && <li>Couper l'eau</li>}
                              {watchedInstructions.cut_water_heater && <li>Couper le chauffe-eau</li>}
                              {watchedInstructions.heating_frost_mode && <li>Laisser le chauffage en hors-gel</li>}
                              {watchedInstructions.empty_fridge && <li>Vider le réfrigérateur</li>}
                              {watchedInstructions.remove_linen && <li>Enlever le linge</li>}
                              {watchedInstructions.put_linen && <li>Mettre le linge</li>}
                              {watchedInstructions.close_shutters && <li>Fermer les volets</li>}
                              {watchedInstructions.no_change && <li>Ne rien modifier</li>}
                            </>
                          )}
                        </ul>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Commentaires:</span>{' '}
                        <span className="text-sm text-muted-foreground">
                          {watchedComments ? watchedComments : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-1"
                    onClick={prev}
                    disabled={step === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Précédent
                  </Button>

                  <div className="flex items-center gap-2">
                    {/* AJOUT: bouton Valider */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={validateCurrentStep}
                    >
                      Valider
                    </Button>

                    {!isLastStep ? (
                      <Button
                        type="button"
                        variant="default"
                        className="flex items-center gap-1"
                        onClick={next}
                      >
                        Suivant
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button type="submit" variant="default">
                        Envoyer ma demande
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Hivernage2026Page;