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
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Shield, Sparkles, CheckCircle2, TrendingUp, Calendar, Wand2, Stars, PhoneCall, CalendarCheck } from "lucide-react";
import { sendUnauthenticatedEmail } from "@/lib/unauthenticated-email-api";
import EmailSendEffect from "@/components/EmailSendEffect";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const prospectSchema = z.object({
  first_name: z.string().min(1, "Prénom requis"),
  last_name: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  message: z.string().optional(),
  consent: z.boolean().refine(val => val === true, { message: "Vous devez accepter pour continuer." })
});

type ProspectFormValues = z.infer<typeof prospectSchema>;

type TransitionState = { transition?: "push" | "pop" } | null;

const ProspectSignupPage: React.FC = () => {
  const [sendingEffect, setSendingEffect] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const transition = (location.state as TransitionState)?.transition;
  const calendlyUrl = "https://calendly.com/contach-hellokeys";

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
    setSendingEffect(true);
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
      setSendingEffect(false);
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

    setTimeout(() => {
      setSendingEffect(false);
      toast.success("Merci ! Votre demande a bien été enregistrée.");
      navigate("/login", { state: { transition: "pop" } });
    }, 900);
  };

  const handleBackToLogin = () => {
    navigate("/login", { state: { transition: "pop" } });
  };

  return (
    <div
      className={cn(
        "min-h-screen bg-background",
        isMobile && transition === "push" && "animate-auth-slide-in-from-right",
        isMobile && transition === "pop" && "animate-auth-slide-in-from-left"
      )}
    >
      <EmailSendEffect show={sendingEffect} />
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="mx-auto max-w-6xl px-4 pt-10 pb-12">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="sm" onClick={handleBackToLogin}>
              ← Retour
            </Button>
          </div>
          <div className="grid gap-8 md:grid-cols-2 items-center">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-6 w-6 text-primary" />
                <Badge variant="secondary" className="rounded-full">Gestion locative premium</Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                Maximisez vos revenus, déléguez la gestion, offrez une expérience 5⭐
              </h1>
              <p className="text-muted-foreground mt-3">
                Hello Keys optimise vos tarifs, gère vos voyageurs et vos opérations (check-in/out, ménage, maintenance)
                pour des revenus stables et une tranquillité totale.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button size="lg" onClick={() => document.getElementById("signup-form")?.scrollIntoView({ behavior: "smooth" })}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Demander mon inscription
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href={calendlyUrl} target="_blank" rel="noreferrer">
                    <CalendarCheck className="mr-2 h-4 w-4" />
                    Prendre rendez-vous
                  </a>
                </Button>
                <Button variant="ghost" size="lg" onClick={() => document.getElementById("highlights")?.scrollIntoView({ behavior: "smooth" })}>
                  En savoir plus
                </Button>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                Vous préférez échanger directement ? Réservez un créneau avec nous sur Calendly.
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                <Stars className="h-4 w-4 text-yellow-500" />
                <span>Propriétaires satisfaits • Support réactif • Pilotage transparent</span>
              </div>
            </div>
            <div className="relative">
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <img src="/logo.png" alt="Hello Keys" className="mx-auto h-16 w-auto opacity-80" />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <p className="font-medium">Tarifs dynamiques</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Optimisation saisonnière et selon la demande.</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <p className="font-medium">Gestion complète</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Annonces, voyageurs, planning, ménage.</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <Wand2 className="h-5 w-5 text-primary" />
                      <p className="font-medium">Expérience 5⭐</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Check-in/out fluide, qualité hôtel.</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <PhoneCall className="h-5 w-5 text-primary" />
                      <p className="font-medium">Support réactif</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Suivi propriétaire et assistance rapide.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section id="highlights">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="rounded-lg border bg-muted/20 p-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Maximisation des revenus</p>
                  <p className="text-sm text-muted-foreground">Tarifs ajustés en continu selon saisonnalité et demande.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Gestion clés en main</p>
                  <p className="text-sm text-muted-foreground">Annonces, voyageurs, check-in/out, ménage et maintenance.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Accompagnement pro</p>
                  <p className="text-sm text-muted-foreground">Support réactif et tableau de bord propriétaire.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader><CardTitle>1. Analyse & Estimation</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  On étudie votre bien, vos objectifs et les données de marché pour estimer vos revenus.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>2. Mise en place & Optimisation</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Création/optimisation des annonces, paramétrage des tarifs, organisation des opérations.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>3. Gestion & Suivi</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Gestion quotidienne, qualité d'accueil, reporting propriétaire et optimisation continue.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Questions fréquentes</h2>
          </div>
          <div className="mt-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Quels sont les frais ?</AccordionTrigger>
                <AccordionContent>
                  Nos frais dépendent de votre bien et de la formule choisie. Contactez-nous pour une estimation personnalisée.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Dans quelles villes intervenez-vous ?</AccordionTrigger>
                <AccordionContent>
                  Nous intervenons principalement sur la Côte d'Opale et zones limitrophes. D'autres villes sur demande.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Comment se déroule l'onboarding ?</AccordionTrigger>
                <AccordionContent>
                  Après votre demande, nous planifions un appel et mettons en place votre compte, vos accès et votre stratégie.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Signup form */}
      <section id="signup-form">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-semibold">Besoin d'un échange rapide avant de vous inscrire ?</p>
                <p className="text-sm text-muted-foreground">
                  Planifiez directement un rendez-vous avec notre équipe via Calendly.
                </p>
              </div>
              <Button asChild>
                <a href={calendlyUrl} target="_blank" rel="noreferrer">
                  <CalendarCheck className="mr-2 h-4 w-4" />
                  Ouvrir Calendly
                </a>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Demander mon inscription</CardTitle>
              <CardDescription>
                Laissez-nous vos coordonnées, nous vous recontactons très vite.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prénom</FormLabel>
                          <FormControl>
                            <Input placeholder="Prénom" {...field} />
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
                            <Input placeholder="Nom" {...field} />
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
                          <Input placeholder="vous@exemple.com" {...field} />
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
                          <Input placeholder="06 00 00 00 00" {...field} />
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
                          <Textarea placeholder="Décrivez votre bien et vos objectifs" {...field} />
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
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          <div>
                            <FormLabel>Consentement</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              J'accepte que mes informations soient utilisées pour être recontacté.
                            </p>
                            <FormMessage />
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full">
                    Envoyer ma demande
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default ProspectSignupPage;