"use client";

import React, { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Sparkles, CheckCircle2 } from "lucide-react";
import { sendUnauthenticatedEmail } from "@/lib/unauthenticated-email-api";

const prospectSchema = z.object({
  first_name: z.string().min(1, "Prénom requis"),
  last_name: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  message: z.string().optional(),
  consent: z.boolean().refine(val => val === true, { message: "Vous devez accepter pour continuer." })
});

type ProspectFormValues = z.infer<typeof prospectSchema>;

const ProspectSignupPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const utm = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      utm_source: params.get("utm_source") || undefined,
      utm_medium: params.get("utm_medium") || undefined,
      utm_campaign: params.get("utm_campaign") || undefined,
      source: params.get("source") || undefined,
      page_path: location.pathname + location.search,
    };
  }, [location.search, location.pathname]);

  const form = useForm<ProspectFormValues>({
    resolver: zodResolver(prospectSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      message: "",
      consent: false
    }
  });

  const onSubmit = async (values: ProspectFormValues) => {
    const payload = {
      email: values.email,
      first_name: values.first_name,
      last_name: values.last_name,
      phone: values.phone,
      message: values.message,
      consent: values.consent,
      ...utm
    };

    const { error } = await supabase.from("prospects").insert([payload]);

    if (error) {
      toast.error(`Erreur: ${error.message}`);
      return;
    }

    // Email de notification à Hello Keys
    const adminSubject = `Nouveau prospect – ${values.first_name} ${values.last_name}`;
    const adminHtml = `
      <h2>Nouveau prospect</h2>
      <p><strong>Nom:</strong> ${values.first_name} ${values.last_name}</p>
      <p><strong>Email:</strong> ${values.email}</p>
      <p><strong>Téléphone:</strong> ${values.phone || "-"}</p>
      <p><strong>Message:</strong><br/>${(values.message || "").replace(/\n/g, "<br/>")}</p>
      <hr/>
      <p><strong>UTM:</strong> source=${utm.utm_source || "-"}, medium=${utm.utm_medium || "-"}, campaign=${utm.utm_campaign || "-"}</p>
      <p><strong>Source:</strong> ${utm.source || "-"}</p>
      <p><strong>Page:</strong> ${utm.page_path}</p>
    `;

    // Email de confirmation au prospect
    const prospectSubject = "Votre demande Hello Keys a bien été reçue";
    const prospectHtml = `
      <p>Bonjour ${values.first_name},</p>
      <p>Merci pour votre intérêt pour Hello Keys. Nous avons bien reçu votre demande et nous revenons vers vous très vite.</p>
      <p>En attendant, découvrez nos avantages&nbsp;:</p>
      <ul>
        <li>Optimisation des revenus (tarifs dynamiques saisonniers)</li>
        <li>Gestion complète des annonces et voyageurs</li>
        <li>Check-in/out, ménage et blanchisserie</li>
        <li>Support réactif et suivi propriétaire</li>
      </ul>
      <p>À très bientôt,<br/>L'équipe Hello Keys</p>
    `;

    await Promise.all([
      sendUnauthenticatedEmail("contact@hellokeys.fr", adminSubject, adminHtml),
      sendUnauthenticatedEmail(values.email, prospectSubject, prospectHtml),
    ]);

    toast.success("Merci ! Votre demande a bien été enregistrée.");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Rejoindre Hello Keys</h1>
          </div>
          <p className="text-muted-foreground mt-1">Boostez vos revenus locatifs et déléguez la gestion au quotidien.</p>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 mb-6">
          <div className="grid gap-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Maximisation des revenus</p>
                <p className="text-sm text-muted-foreground">Tarifs optimisés selon la saisonnalité et la demande.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Gestion clés en main</p>
                <p className="text-sm text-muted-foreground">Annonces, voyageurs, check-in/out, ménage et maintenance.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Accompagnement pro</p>
                <p className="text-sm text-muted-foreground">Support réactif et tableau de bord propriétaire.</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Demande d'inscription</CardTitle>
            <CardDescription>
              Laissez-nous vos coordonnées pour être recontacté. Vous serez ensuite redirigé vers la page d'inscription.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prénom</FormLabel>
                        <FormControl>
                          <Input placeholder="Votre prénom" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom</FormLabel>
                        <FormControl>
                          <Input placeholder="Votre nom" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="vous@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone (optionnel)</FormLabel>
                      <FormControl>
                        <Input placeholder="+33 6 12 34 56 78" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message (optionnel)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Quelques mots sur votre projet..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="consent"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-start gap-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(val) => field.onChange(Boolean(val))}
                          />
                        </FormControl>
                        <div className="space-y-1">
                          <FormLabel className="text-sm">J'accepte d'être contacté(e) par Hello Keys</FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Vos données ne seront utilisées que pour vous recontacter au sujet de votre demande.
                          </p>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Envoyer et aller à l'inscription
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProspectSignupPage;