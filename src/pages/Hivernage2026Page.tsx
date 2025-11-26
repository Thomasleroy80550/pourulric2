"use client";

import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { createHivernageRequest, HivernageInstructions } from '@/lib/hivernage-api';
import { getUserRooms, UserRoom } from '@/lib/user-room-api';
import { Snowflake } from 'lucide-react';

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

  const [rooms, setRooms] = useState<UserRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

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
    toast.success("Votre demande d’hivernage a été envoyée !");
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
          Merci d’indiquer vos consignes pour votre logement afin que tout soit en ordre avant notre pause hivernale.
        </p>

        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Formulaire de consignes</CardTitle>
            <CardDescription>Choisissez le logement et les actions souhaitées, puis envoyez-nous vos instructions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormItem>
                  <FormLabel>Logement</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      disabled={loadingRooms}
                      {...form.register('user_room_id')}
                    >
                      <option value="">— Sélectionner un logement (optionnel) —</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>{r.room_name}</option>
                      ))}
                    </select>
                  </FormControl>
                </FormItem>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="instructions.cut_water"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!m-0">Couper l’eau</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="instructions.cut_water_heater"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!m-0">Couper le chauffe-eau</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="instructions.heating_frost_mode"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!m-0">Laisser le chauffage en hors-gel</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="instructions.empty_fridge"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!m-0">Vider le réfrigérateur</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="instructions.remove_linen"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!m-0">Enlever le linge</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="instructions.put_linen"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!m-0">Mettre le linge</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="instructions.close_shutters"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!m-0">Fermer les volets</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="instructions.no_change"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!m-0">Ne rien modifier</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

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

                <div className="flex justify-end gap-2">
                  <Button type="submit">Envoyer ma demande</Button>
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