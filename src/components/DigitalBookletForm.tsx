import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useEffect } from "react";
import { PlusCircle, Trash2 } from "lucide-react";
import IconPicker from "./IconPicker"; // Import du nouveau composant

const customSectionSchema = z.object({
  title: z.string().min(1, "Le titre est requis."),
  description: z.string().min(1, "La description est requise."),
  icon: z.string().optional(),
});

const bookletSchema = z.object({
  welcomeMessage: z.string().min(1, "Le message de bienvenue est requis."),
  wifiSsid: z.string().min(1, "Le nom du Wi-Fi est requis."),
  wifiPassword: z.string().min(1, "Le mot de passe du Wi-Fi est requis."),
  houseRules: z.string().optional(),
  emergencyContactName: z.string().min(1, "Le nom du contact d'urgence est requis."),
  emergencyContactPhone: z.string().min(1, "Le téléphone du contact d'urgence est requis."),
  checkOutInstructions: z.string().optional(),
  customSections: z.array(customSectionSchema).optional(),
});

export type TBookletSchema = z.infer<typeof bookletSchema>;

interface DigitalBookletFormProps {
  initialData: TBookletSchema | null;
  onSave: (data: TBookletSchema) => Promise<void>;
  isSaving: boolean;
  onDataChange: (data: TBookletSchema) => void;
}

export default function DigitalBookletForm({ initialData, onSave, isSaving, onDataChange }: DigitalBookletFormProps) {
  const form = useForm<TBookletSchema>({
    resolver: zodResolver(bookletSchema),
    defaultValues: initialData || {
      welcomeMessage: "",
      wifiSsid: "",
      wifiPassword: "",
      houseRules: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      checkOutInstructions: "",
      customSections: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "customSections",
  });

  const watchedData = form.watch();
  useEffect(() => {
    onDataChange(watchedData);
  }, [watchedData, onDataChange]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-8">
        <Card>
          <CardHeader><CardTitle>Informations Générales</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="welcomeMessage" render={({ field }) => (
              <FormItem>
                <FormLabel>Message de bienvenue</FormLabel>
                <FormControl><Textarea placeholder="Bienvenue dans notre logement ! Nous espérons que vous passerez un excellent séjour." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Accès Internet</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="wifiSsid" render={({ field }) => (
              <FormItem>
                <FormLabel>Nom du réseau Wi-Fi (SSID)</FormLabel>
                <FormControl><Input placeholder="Livebox-1234" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="wifiPassword" render={({ field }) => (
              <FormItem>
                <FormLabel>Mot de passe du Wi-Fi</FormLabel>
                <FormControl><Input placeholder="VotreMotDePasseSecret" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Règles et Instructions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="houseRules" render={({ field }) => (
              <FormItem>
                <FormLabel>Règlement intérieur</FormLabel>
                <FormControl><Textarea placeholder="Ex: Non-fumeur, pas de fêtes, etc." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="checkOutInstructions" render={({ field }) => (
              <FormItem>
                <FormLabel>Instructions de départ</FormLabel>
                <FormControl><Textarea placeholder="Ex: Merci de laisser les clés sur la table, sortir les poubelles..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Sections Personnalisées</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ title: "", description: "", icon: "" })}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </div>
            <FormDescription>Ajoutez des informations utiles comme vos restaurants préférés, les lieux à visiter, etc.</FormDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg relative space-y-4 bg-muted/50">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 text-muted-foreground hover:text-destructive"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <FormField
                  control={form.control}
                  name={`customSections.${index}.title`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titre de la section</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Restaurants recommandés" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`customSections.${index}.description`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Listez ici vos recommandations..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`customSections.${index}.icon`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icône</FormLabel>
                      <FormControl>
                        <IconPicker value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormDescription>Choisissez une icône pour représenter cette section.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune section personnalisée.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Contacts d'Urgence</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="emergencyContactName" render={({ field }) => (
              <FormItem>
                <FormLabel>Nom du contact</FormLabel>
                <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="emergencyContactPhone" render={({ field }) => (
              <FormItem>
                <FormLabel>Numéro de téléphone</FormLabel>
                <FormControl><Input placeholder="06 12 34 56 78" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Button type="submit" disabled={isSaving} size="lg" className="w-full">
          {isSaving ? "Enregistrement..." : "Enregistrer le livret"}
        </Button>
      </form>
    </Form>
  );
}