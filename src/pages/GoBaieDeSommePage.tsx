"use client";

import React from "react";
import MainLayout from "@/components/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  BadgeCheck,
  Eye,
  Handshake,
  Shell,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

const GoBaieDeSommePage: React.FC = () => {
  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-teal-50 via-background to-background">
        <div className="mx-auto max-w-4xl px-6 py-14 md:py-20">
          <div className="text-center">
            <div className="inline-flex flex-wrap items-center justify-center gap-2">
              <Badge className="bg-teal-600 text-white hover:bg-teal-600">Nouveau</Badge>
              <Badge variant="outline">Go Baie de Somme</Badge>
              <Badge className="bg-green-600 text-white hover:bg-green-600">
                Inclus - 0 % de commission
              </Badge>
            </div>

            <h1 className="mt-5 text-3xl font-bold tracking-tight md:text-4xl">
              📣 Une nouvelle plateforme pour booster vos réservations en direct
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base text-muted-foreground md:text-lg">
              Chez Hello Keys, nous avons une conviction simple : votre bien mérite d'être vu,
              réservé et rentabilisé au maximum — sans que les commissions des grandes plateformes
              ne grignotent vos revenus.
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-base text-muted-foreground md:text-lg">
              C'est pourquoi nous avons investi dans une toute nouvelle plateforme dédiée :{" "}
              <span className="font-semibold text-foreground">Go Baie de Somme</span>.
            </p>
          </div>

          {/* Objectif */}
          <div className="mt-12 rounded-2xl border bg-card p-6 shadow-sm md:p-8">
            <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Target className="h-6 w-6 text-teal-600" />
              🎯 Notre objectif
            </h2>
            <p className="mt-4 text-muted-foreground">
              Développer vos réservations en direct, avec une vitrine moderne, locale et pensée pour
              convertir les voyageurs qui rêvent d'un séjour en Baie de Somme.
            </p>
          </div>

          {/* Ce que ça change */}
          <div className="mt-8">
            <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <BadgeCheck className="h-6 w-6 text-green-600" />
              Ce que ça change pour vous, propriétaires Hello Keys
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Card className="shadow-sm">
                <CardContent className="flex gap-3 p-6">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
                  <div>
                    <p className="font-medium">Aucun frais supplémentaire</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Rien ne vous sera facturé. Cet investissement, nous le prenons à notre charge.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="flex gap-3 p-6">
                  <Eye className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
                  <div>
                    <p className="font-medium">Visibilité premium</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Votre logement bénéficie d'une mise en avant premium sur la plateforme.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="flex gap-3 p-6">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
                  <div>
                    <p className="font-medium">Réservation & gestion assurées</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Réservation instantanée, paiement sécurisé, gestion par notre équipe locale —
                      comme d'habitude, mais avec un canal de vente en plus.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="flex gap-3 p-6">
                  <Shell className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
                  <div>
                    <p className="font-medium">Un séjour plus complet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Activités et expériences locales proposées à vos voyageurs, pour des clients
                      plus satisfaits et de meilleurs avis.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 rounded-xl bg-teal-50 p-5 text-sm text-teal-950">
              <p className="font-medium">En clair :</p>
              <p className="mt-1 text-teal-900/80">
                Plus de réservations directes, zéro commission en plus, zéro effort supplémentaire de
                votre part.
              </p>
            </div>
          </div>

          {/* Propriétaires extérieurs */}
          <div className="mt-8 rounded-2xl border bg-card p-6 shadow-sm md:p-8">
            <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Handshake className="h-6 w-6 text-teal-600" />
              🤝 Et pour les propriétaires extérieurs ?
            </h2>
            <p className="mt-4 text-muted-foreground">
              La plateforme est aussi ouverte aux propriétaires qui ne sont pas encore gérés par
              Hello Keys. Ils peuvent s'y inscrire librement, avec une commission de 8 à 12 % par
              réservation.
            </p>
            <p className="mt-4 text-muted-foreground">
              Un avantage exclusif, donc, réservé à nos propriétaires Hello Keys :{" "}
              <span className="font-semibold text-foreground">
                la même exposition, sans aucune commission supplémentaire.
              </span>
            </p>
          </div>

          <div className="mt-10 text-center text-muted-foreground">
            <p>
              Merci de votre confiance — c'est elle qui nous pousse à investir toujours plus pour la
              valeur de votre bien.
            </p>
            <p className="mt-3 font-medium text-foreground">L'équipe Hello Keys 🐚</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default GoBaieDeSommePage;
