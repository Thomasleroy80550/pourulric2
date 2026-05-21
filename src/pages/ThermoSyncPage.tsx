"use client";

import React from "react";
import MainLayout from "@/components/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, Flame, Home, Leaf, Thermometer, Zap } from "lucide-react";

const ThermoSyncPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-orange-50 via-background to-background">
        <div className="mx-auto max-w-5xl px-6 py-14 md:py-20">
          <div className="text-center">
            <div className="inline-flex items-center gap-2">
              <Badge variant="secondary">Nouveau</Badge>
              <Badge variant="outline">Thermo Sync</Badge>
            </div>

            <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">
              Thermo Sync est enfin disponible
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base text-muted-foreground md:text-lg">
              La nouvelle solution pensée pour piloter le chauffage de vos locations courte durée,
              préparer les arrivées, réduire les dépenses inutiles entre deux réservations
              et garder une vraie visibilité sur votre parc.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <a href="https://thermosync.fr/" target="_blank" rel="noopener noreferrer">
                  Découvrir le site
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="https://thermosync.fr/demo" target="_blank" rel="noopener noreferrer">
                  Voir la démo
                </a>
              </Button>
            </div>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <Thermometer className="h-5 w-5 text-orange-600" />
                <h2 className="mt-4 text-lg font-semibold">Chauffage synchronisé</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Anticipez les arrivées, maintenez le confort pendant le séjour et repassez en mode éco au bon moment.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-6">
                <Home className="h-5 w-5 text-orange-600" />
                <h2 className="mt-4 text-lg font-semibold">Vue multi-logements</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Suivez plusieurs biens depuis une seule interface avec des scénarios clairs et une lecture opérationnelle rapide.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-6">
                <Leaf className="h-5 w-5 text-orange-600" />
                <h2 className="mt-4 text-lg font-semibold">Jusqu'à 25% d'économies visées</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Réduisez les consommations inutiles pendant les périodes vacantes sans dégrader l'expérience voyageur.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-10 rounded-2xl border bg-card p-6 shadow-sm md:p-8">
            <h3 className="text-2xl font-semibold tracking-tight">Pourquoi aller voir Thermo Sync ?</h3>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="flex gap-3 rounded-xl border bg-background p-4">
                <Zap className="mt-0.5 h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium">Pilotage à distance</p>
                  <p className="text-sm text-muted-foreground">
                    Contrôlez la chauffe sans déplacement et gardez vos logements prêts avant chaque arrivée.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-xl border bg-background p-4">
                <Flame className="mt-0.5 h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium">Scénarios simples</p>
                  <p className="text-sm text-muted-foreground">
                    Paramétrez des logiques de préchauffage, séjour et départ adaptées à votre exploitation.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-xl bg-orange-50 p-5 text-sm text-orange-950">
              <p className="font-medium">C'est en ligne dès maintenant.</p>
              <p className="mt-1 text-orange-900/80">
                Cliquez ci-dessous pour accéder au site officiel et découvrir la présentation complète de Thermo Sync.
              </p>
              <Button asChild className="mt-4">
                <a href="https://thermosync.fr/" target="_blank" rel="noopener noreferrer">
                  Aller sur thermosync.fr
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ThermoSyncPage;
