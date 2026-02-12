"use client";

import React from "react";
import MainLayout from "@/components/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import ThermoBnBSignupForm from "@/components/ThermoBnBSignupForm";
import { Thermometer, Flame, Clock, Zap, Leaf, PiggyBank, ShieldCheck } from "lucide-react";

const ThermoBnBLandingPage: React.FC = () => {
  const scrollToSignup = () => {
    document.getElementById("signup")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-blue-50 via-white to-white">
        {/* HERO minimaliste */}
        <section className="mx-auto max-w-5xl px-6 pt-14 md:pt-20 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <Badge variant="secondary">ThermoBnB</Badge>
            <Badge variant="outline">Bêta privée</Badge>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Automatisez le chauffage de vos locations
          </h1>
          <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
            Préchauffage avant l’arrivée, confort pendant le séjour, mode éco au départ — piloté par vos réservations.
            Conçu pour les logements avec chaudière gaz et thermostat Netatmo déjà installé.
          </p>
          <div className="mt-7">
            <Button size="lg" onClick={scrollToSignup}>
              Demander l’activation
            </Button>
          </div>

          {/* Points clés très concis */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-700">
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-4 h-4 text-orange-600" />
              Arrivées toujours prêtes
            </div>
            <div className="flex items-center justify-center gap-2">
              <Leaf className="w-4 h-4 text-emerald-600" />
              Économie d’énergie
            </div>
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Fonctionne en arrière-plan
            </div>
          </div>
        </section>

        {/* Bénéfices en 3 cartes */}
        <section className="mx-auto max-w-5xl px-6 mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                Passage automatique au mode éco dès l’heure de départ pour éviter la surconsommation.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Gains & économies (startup style) */}
        <section className="mx-auto max-w-5xl px-6 mt-12">
          <div className="rounded-xl border bg-white p-6 md:p-8 shadow-sm">
            <h2 className="text-xl md:text-2xl font-semibold">Gains & économies</h2>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <PiggyBank className="w-5 h-5 text-rose-600" />
                    <p className="font-medium">Chauffage optimisé</p>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    Évitez de chauffer entre les séjours grâce aux bascules automatiques.
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
                    Préchauffage ciblé pour un confort optimal sans surconsommation.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Offre de lancement */}
        <section className="mx-auto max-w-5xl px-6 mt-12">
          <Alert className="rounded-xl">
            <AlertTitle>Offre de lancement</AlertTitle>
            <AlertDescription className="mt-2 text-sm text-gray-700">
              - Actuellement gratuit: vous ne payez que les pièces et l’installation.<br />
              - Abonnement à venir: priorité aux premiers inscrits (premier arrivé, premier servi).<br />
              - Nous recherchons des testeurs pour lancer le module: inscrivez-vous ci-dessous.
            </AlertDescription>
          </Alert>
        </section>

        {/* Formulaire d’inscription */}
        <section className="mx-auto max-w-5xl px-6 pb-20 mt-12" id="signup">
          <div className="text-center mb-6">
            <h3 className="text-xl md:text-2xl font-semibold">Demander l’activation</h3>
            <p className="text-gray-600 mt-1">
              Pour les propriétaires avec chaudière gaz et thermostat Netatmo déjà installés.
            </p>
          </div>
          <ThermoBnBSignupForm />
        </section>
      </div>
    </MainLayout>
  );
};

export default ThermoBnBLandingPage;