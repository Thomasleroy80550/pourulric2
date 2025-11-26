"use client";

import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { createHivernageRequest, HivernageInstructions } from '@/lib/hivernage-api';
import { getUserRooms, UserRoom } from '@/lib/user-room-api';
import { Snowflake, ChevronLeft, ChevronRight, Droplet, Flame, Trash2, Shirt, Lock, Ban } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import ToggleTile from '@/components/ToggleTile';

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
  });

  // ADDED: watchers to avoid render-time updates loops
  const selectedRoomId = useWatch({ control: form.control, name: 'user_room_id' });
  const instructions = useWatch({ control: form.control, name: 'instructions' }) as HivernageInstructions;
  const commentsVal = useWatch({ control: form.control, name: 'comments' });

  const [rooms, setRooms] = useState<UserRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  // AJOUT: gestion des étapes
  const steps = ["Logement", "Consignes", "Commentaires", "Résumé"];
  const [step, setStep] = useState(0);
  const isLastStep = step === steps.length - 1;
  const progressValue = Math.round(((step + 1) / steps.length) * 100);

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

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
  };

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
            {/* Barre de progression + titre d'étape */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{steps[step]}</span>
                <span className="text-xs text-muted-foreground">{step + 1} / {steps.length}</span>
              </div>
              <Progress value={progressValue} />
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <p className="text-sm text-muted-foreground">
                      Cochez les actions à effectuer pour votre logement.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="instructions.cut_water"
                        render={({ field }) => (
                          <FormItem>
                            <ToggleTile
                              label="Couper l'eau"
                              Icon={Droplet}
                              checked={field.value}
                              onToggle={() => field.onChange(!field.value)}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="instructions.cut_water_heater"
                        render={({ field }) => (
                          <FormItem>
                            <ToggleTile
                              label="Couper le chauffe-eau"
                              Icon={Flame}
                              checked={field.value}
                              onToggle={() => field.onChange(!field.value)}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="instructions.heating_frost_mode"
                        render={({ field }) => (
                          <FormItem>
                            <ToggleTile
                              label="Chauffage en hors-gel"
                              Icon={Snowflake}
                              checked={field.value}
                              onToggle={() => field.onChange(!field.value)}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="instructions.empty_fridge"
                        render={({ field }) => (
                          <FormItem>
                            <ToggleTile
                              label="Vider le réfrigérateur"
                              Icon={Trash2}
                              checked={field.value}
                              onToggle={() => field.onChange(!field.value)}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="instructions.remove_linen"
                        render={({ field }) => (
                          <FormItem>
                            <ToggleTile
                              label="Enlever le linge"
                              Icon={Shirt}
                              checked={field.value}
                              onToggle={() => field.onChange(!field.value)}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="instructions.put_linen"
                        render={({ field }) => (
                          <FormItem>
                            <ToggleTile
                              label="Mettre le linge"
                              Icon={Shirt}
                              checked={field.value}
                              onToggle={() => field.onChange(!field.value)}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="instructions.close_shutters"
                        render={({ field }) => (
                          <FormItem>
                            <ToggleTile
                              label="Fermer les volets"
                              Icon={Lock}
                              checked={field.value}
                              onToggle={() => field.onChange(!field.value)}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="instructions.no_change"
                        render={({ field }) => (
                          <FormItem>
                            <ToggleTile
                              label="Ne rien modifier"
                              Icon={Ban}
                              checked={field.value}
                              onToggle={() => field.onChange(!field.value)}
                            />
                            <FormMessage />
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
                            const found = rooms.find((r) => r.id === selectedRoomId);
                            return found ? found.room_name : "Non spécifié";
                          })()}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Consignes:</span>
                        <ul className="mt-2 list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {!instructions || Object.entries(instructions).filter(([_, v]) => !!v).length === 0 ? (
                            <li>Aucune consigne sélectionnée</li>
                          ) : (
                            <>
                              {instructions.cut_water && <li>Couper l'eau</li>}
                              {instructions.cut_water_heater && <li>Couper le chauffe-eau</li>}
                              {instructions.heating_frost_mode && <li>Laisser le chauffage en hors-gel</li>}
                              {instructions.empty_fridge && <li>Vider le réfrigérateur</li>}
                              {instructions.remove_linen && <li>Enlever le linge</li>}
                              {instructions.put_linen && <li>Mettre le linge</li>}
                              {instructions.close_shutters && <li>Fermer les volets</li>}
                              {instructions.no_change && <li>Ne rien modifier</li>}
                            </>
                          )}
                        </ul>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Commentaires:</span>{' '}
                        <span className="text-sm text-muted-foreground">
                          {commentsVal ? commentsVal : "—"}
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
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Hivernage2026Page;