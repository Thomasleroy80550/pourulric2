"use client";

import React from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import ThermoBnBSignupForm from "@/components/ThermoBnBSignupForm";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Thermometer,
  Flame,
  Clock,
  ShieldCheck,
  Zap,
  PiggyBank,
  Leaf,
} from "lucide-react";

const ThermoBnBLandingPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-blue-50 via-white to-white">
        {/* HERO */}
        <div className="mx-auto max-w-6xl px-6 pt-12 md:pt-16">
          <div className="text-center">
            <Badge className="mb-4" variant="secondary">ThermoBnB</Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Le chauffage auto-piloté pour vos locations
            </h1>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              Préchauffage avant l’arrivée, confort pendant le séjour, éco au départ.
              ThermoBnB automatise la température selon vos réservations et scénarios — sans prise de tête.
            </p>
            <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Fonctionne en arrière-plan
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-600" />
                Gains de temps & d’énergie
              </div>
            </div>
            <p className="mt-6 text-sm text-gray-500">
              Pour les propriétaires avec chaudière gaz et thermostat Netatmo déjà installé.
            </p>
          </div>

          {/* OFFRE DE LANCEMENT */}
          <div className="mt-10">
            <Alert className="max-w-3xl mx-auto">
              <AlertTitle>Offre de lancement & recherche de testeurs</AlertTitle>
              <AlertDescription className="mt-2 text-sm text-gray-700">
                - Module gratuit pour le moment — vous ne payez que les pièces et l’installation.
                <br />
                - Un abonnement arrivera ensuite (priorité aux premiers inscrits – premier arrivé, premier servi).
                <br />
                - Nous cherchons des testeurs pour lancer le module. Si vous êtes intéressé, inscrivez-vous ci-dessous.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        {/* BÉNÉFICES PRINCIPAUX */}
        <div className="mx-auto max-w-6xl px-6 mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <Thermometer className="w-5 h-5 text-blue-600" />
                <p className="font-medium">Préchauffage intelligent</p>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Lance automatiquement la chauffe avant l’arrivée selon votre scénario.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <Flame className="w-5 h-5 text-orange-600" />
                <p className="font-medium">Confort pendant le séjour</p>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Température maintenue sans réglages complexes, pour un séjour sans surprise.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-green-600" />
                <p className="font-medium">Éco au départ</p>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Passage automatique à la température éco dès l’heure de départ.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <p className="font-medium">Autonome & fiable</p>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Fonctionne en arrière-plan — même si la page est fermée.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* GAINS & ÉCONOMIES */}
        <div className="mx-auto max-w-6xl px-6 mt-14">
          <div className="rounded-xl border bg-white p-6 md:p-8 shadow-sm">
            <h2 className="text-xl md:text-2xl font-semibold">Gains & économies</h2>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <PiggyBank className="w-5 h-5 text-rose-600" />
                    <p className="font-medium">Moins de dépenses de chauffage</p>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    Évite de chauffer inutilement entre les séjours grâce au mode éco automatique.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <Leaf className="w-5 h-5 text-emerald-600" />
                    <p className="font-medium">Énergie mieux utilisée</p>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    Préchauffage ciblé avant l’arrivée pour un confort optimal sans surconsommation.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    <p className="font-medium">Gain de temps</p>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    Moins d’allers-retours et d’ajustements manuels — tout est automatisé.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-orange-600" />
                    <p className="font-medium">Arrivées toujours prêtes</p>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    Température confortable à l’arrivée — impact positif sur les avis des voyageurs.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* COMMENT ÇA MARCHE */}
        <div className="mx-auto max-w-6xl px-6 mt-14">
          <div className="rounded-xl border bg-white p-6 md:p-8 shadow-sm">
            <h2 className="text-xl md:text-2xl font-semibold">Comment ça marche</h2>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-5">
                  <p className="font-medium">1. Votre logement</p>
                  <p className="mt-2 text-sm text-gray-600">
                    ThermoBnB s’adresse aux logements avec chaudière gaz et thermostat Netatmo.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="font-medium">2. Vos scénarios</p>
                  <p className="mt-2 text-sm text-gray-600">
                    Définissez des températures d’arrivée, de séjour et d’éco en fonction des réservations.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="font-medium">3. Automatisation</p>
                  <p className="mt-2 text-sm text-gray-600">
                    Le système ajuste automatiquement la température aux moments clefs (arrivée/départ).
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mx-auto max-w-6xl px-6 mt-14">
          <div className="rounded-xl border bg-white p-6 md:p-8 shadow-sm">
            <h2 className="text-xl md:text-2xl font-semibold">Questions fréquentes</h2>
            <Accordion type="single" collapsible className="mt-4">
              <AccordionItem value="q1">
                <AccordionTrigger>De quoi ai-je besoin pour utiliser ThermoBnB ?</AccordionTrigger>
                <AccordionContent>
                  Une chaudière gaz et un thermostat Netatmo installé. La solution automatise ensuite la température selon vos réservations.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q2">
                <AccordionTrigger>Est-ce que ça tourne même si je ferme l’application ?</AccordionTrigger>
                <AccordionContent>
                  Oui. Le système fonctionne en arrière-plan et applique les changements aux moments clefs (arrivée, séjour, départ).
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q3">
                <AccordionTrigger>Y aura-t-il un abonnement ?</AccordionTrigger>
                <AccordionContent>
                  Pour le moment, le module est gratuit (vous ne payez que les pièces et l’installation).
                  Un abonnement arrivera ensuite, avec priorité aux premiers inscrits (premier arrivé, premier servi).
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {/* FORMULAIRE D'INSCRIPTION */}
        <div className="mx-auto max-w-6xl px-6 pb-20 mt-14" id="signup">
          <h3 className="text-xl md:text-2xl font-semibold mb-4">Devenez testeur & demandez l’activation</h3>
          <p className="text-gray-600 mb-6">
            Ce service s’adresse aux propriétaires ayant une chaudière gaz et Netatmo déjà installé.
            Remplissez le formulaire — nous vous recontactons sous 24-48h.
          </p>
          <ThermoBnBSignupForm />
        </div>
      </div>
    </MainLayout>
  );
};

export default ThermoBnBLandingPage;