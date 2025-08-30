import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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

const bookletSchema = z.object({
  welcomeMessage: z.string().min(1, "Le message de bienvenue est requis."),
  wifiSsid: z.string().min(1, "Le nom du Wi-Fi est requis."),
  wifiPassword: z.string().min(1, "Le mot de passe du Wi-Fi est requis."),
  houseRules: z.string().optional(),
  emergencyContactName: z.string().min(1, "Le nom du contact d'urgence est requis."),
  emergencyContactPhone: z.string().min(1, "Le téléphone du contact d'urgence est requis."),
  checkOutInstructions: z.string().optional(),
});

export type TBookletSchema = z.infer<typeof bookletSchema>;

interface DigitalBookletFormProps {
  initialData: TBookletSchema | null;
  onSave: (data: TBookletSchema) => Promise<void>;
  isSaving: boolean;
}

export default function DigitalBookletForm({ initialData, onSave, isSaving }: DigitalBookletFormProps) {
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
    },
  });

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

        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Enregistrement..." : "Enregistrer le livret"}
        </Button>
      </form>
    </Form>
  );
}