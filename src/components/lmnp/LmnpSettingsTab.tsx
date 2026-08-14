import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { LmnpSettings, upsertLmnpSettings } from "@/lib/lmnp-api";

const settingsSchema = z.object({
  declarant_name: z.string().optional(),
  siret: z.string().optional(),
  activity_start_date: z.string().optional(),
  property_address: z.string().optional(),
  deferred_amortization: z.coerce.number().min(0).optional(),
  prior_deficits: z.coerce.number().min(0).optional(),
});

interface Props {
  settings: LmnpSettings | null;
  onSaved: () => void;
}

const LmnpSettingsTab: React.FC<Props> = ({ settings, onSaved }) => {
  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      declarant_name: settings?.declarant_name || "",
      siret: settings?.siret || "",
      activity_start_date: settings?.activity_start_date || "",
      property_address: settings?.property_address || "",
      deferred_amortization: settings?.deferred_amortization ?? 0,
      prior_deficits: settings?.prior_deficits ?? 0,
    },
  });

  const onSubmit = async (values: z.infer<typeof settingsSchema>) => {
    try {
      await upsertLmnpSettings({
        declarant_name: values.declarant_name || null,
        siret: values.siret || null,
        activity_start_date: values.activity_start_date || null,
        property_address: values.property_address || null,
        regime: "reel_simplifie",
        deferred_amortization: values.deferred_amortization ?? 0,
        prior_deficits: values.prior_deficits ?? 0,
      });
      toast.success("Paramètres LMNP enregistrés.");
      onSaved();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="mt-6 max-w-2xl">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Informations du déclarant</CardTitle>
          <CardDescription>
            Ces informations apparaissent sur votre liasse fiscale (formulaire 2031).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="declarant_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du déclarant</FormLabel>
                  <FormControl><Input placeholder="Ex : Jean Dupont" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="siret" render={({ field }) => (
                <FormItem>
                  <FormLabel>N° SIRET</FormLabel>
                  <FormControl><Input placeholder="14 chiffres" {...field} /></FormControl>
                  <FormDescription>Obtenu lors de votre immatriculation LMNP (guichet unique INPI).</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="property_address" render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse du bien exploité</FormLabel>
                  <FormControl><Input placeholder="Adresse complète du logement meublé" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="activity_start_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date de début d'activité</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="deferred_amortization" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amortissements différés antérieurs (€)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormDescription>Stock au 1er janvier (art. 39 C), si vous déclariez déjà au réel.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="prior_deficits" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Déficits LMNP antérieurs (€)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormDescription>Déficits non encore imputés (reportables 10 ans).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                Enregistrer
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LmnpSettingsTab;
