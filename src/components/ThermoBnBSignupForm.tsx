"use client";

import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  city?: string;
  hasGasBoiler: boolean;
  hasNetatmo: boolean;
  consent: boolean;
  message?: string;
};

const ThermoBnBSignupForm: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [state, setState] = React.useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    hasGasBoiler: false,
    hasNetatmo: false,
    consent: false,
    message: "",
  });

  const onChange = (key: keyof FormState, value: any) => {
    setState((s) => ({ ...s, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!state.firstName || !state.lastName || !state.email) {
      toast({ title: "Veuillez remplir les champs obligatoires.", variant: "destructive" });
      return;
    }
    if (!state.hasGasBoiler || !state.hasNetatmo) {
      toast({ title: "ThermoBnB s'adresse aux logements avec une chaudière gaz et un thermostat Netatmo installés.", variant: "destructive" });
      return;
    }
    if (!state.consent) {
      toast({ title: "Veuillez accepter d'etre contacté pour que nous puissions vous répondre.", variant: "destructive" });
      return;
    }

    setLoading(true);

    const composedMessage = [
      `Ville: ${state.city || "—"}`,
      `Chaudière gaz: ${state.hasGasBoiler ? "Oui" : "Non"}`,
      `Netatmo installé: ${state.hasNetatmo ? "Oui" : "Non"}`,
      state.message ? `Message: ${state.message}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const { error } = await supabase.from("prospects").insert({
      email: state.email,
      first_name: state.firstName,
      last_name: state.lastName,
      phone: state.phone || null,
      message: composedMessage || null,
      consent: true,
      source: "thermobnb",
      page_path: typeof window !== "undefined" ? window.location.pathname : "/thermobnb",
      status: "new",
    });

    setLoading(false);

    if (error) {
      toast({ title: "Échec de l'inscription", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Inscription envoyée", description: "Nous vous recontactons très vite pour activer ThermoBnB." });
    setState({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      city: "",
      hasGasBoiler: false,
      hasNetatmo: false,
      consent: false,
      message: "",
    });
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Prénom *</Label>
              <Input
                id="firstName"
                value={state.firstName}
                onChange={(e) => onChange("firstName", e.target.value)}
                required
                placeholder="Votre prénom"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Nom *</Label>
              <Input
                id="lastName"
                value={state.lastName}
                onChange={(e) => onChange("lastName", e.target.value)}
                required
                placeholder="Votre nom"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={state.email}
                onChange={(e) => onChange("email", e.target.value)}
                required
                placeholder="vous@exemple.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={state.phone}
                onChange={(e) => onChange("phone", e.target.value)}
                placeholder="+33 ..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">Ville du logement</Label>
              <Input
                id="city"
                value={state.city}
                onChange={(e) => onChange("city", e.target.value)}
                placeholder="Ex: Berck"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasGasBoiler"
                checked={state.hasGasBoiler}
                onCheckedChange={(v) => onChange("hasGasBoiler", Boolean(v))}
              />
              <Label htmlFor="hasGasBoiler">Chaudière gaz présente *</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasNetatmo"
                checked={state.hasNetatmo}
                onCheckedChange={(v) => onChange("hasNetatmo", Boolean(v))}
              />
              <Label htmlFor="hasNetatmo">Thermostat Netatmo déjà installé *</Label>
            </div>
          </div>

          <div>
            <Label htmlFor="message">Message (facultatif)</Label>
            <Textarea
              id="message"
              value={state.message}
              onChange={(e) => onChange("message", e.target.value)}
              placeholder="Précisez votre configuration (nombre de logements, particularités, etc.)"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="consent"
              checked={state.consent}
              onCheckedChange={(v) => onChange("consent", Boolean(v))}
            />
            <Label htmlFor="consent">
              J'accepte d'etre contacté pour la mise en place de ThermoBnB *
            </Label>
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={loading} className="w-full md:w-auto">
              {loading ? "Envoi..." : "Demander l'activation"}
            </Button>
            <p className="mt-2 text-xs text-gray-500">
              Nous vous recontactons sous 24 à 48 h avec les prochaines étapes.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ThermoBnBSignupForm;