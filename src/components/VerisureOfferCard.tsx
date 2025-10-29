"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, KeyRound, Smartphone, CheckCircle, Lock } from "lucide-react";

const VerisureOfferCard: React.FC = () => {
  const mailtoHref = `mailto:contact@hellokeys.fr?subject=Offre%20Verisure%20Hello%20Keys&body=Bonjour%20Hello%20Keys,%0A%0AJe%20souhaite%20b%C3%A9n%C3%A9ficier%20de%20l%E2%80%99offre%20Verisure.%20Merci%20de%20me%20recontacter%20pour%20les%20modalit%C3%A9s.%0A%0ANom:%0APr%C3%A9nom:%0AT%C3%A9l%C3%A9phone:%0ALogement%20concern%C3%A9:%0A%0AMerci%20!`;

  return (
    <Card className="shadow-md border-2 border-orange-200/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-orange-600" />
          <CardTitle className="text-lg font-semibold">
            Sécurité connectée Verisure — Offre spéciale Hello Keys
          </CardTitle>
        </div>
        <Badge className="bg-orange-600 text-white">Limité aux 20 premiers clients</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <p className="mb-2">
            Chez Hello Keys, on sait que louer son logement c’est aussi gérer l’imprévu : clés égarées, portes
            ouvertes, risques d’intrusion ou de squat… Alors on a décidé d’agir.
          </p>
          <p>
            En partenariat avec Verisure, leader européen de la sécurité connectée, profitez d’une offre exclusive
            réservée aux clients Hello Keys :
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-orange-600" />
              <span className="font-medium">Installation complète</span>
            </div>
            <p className="mt-1 text-sm">
              199€ HT <span className="text-gray-500">au lieu de 1 399€ HT</span>
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-orange-600" />
              <span className="font-medium">Serrure connectée</span>
            </div>
            <p className="mt-1 text-sm">
              +99€ HT <span className="text-gray-500">avec pavé à code extérieur</span>
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-orange-600" />
              <span className="font-medium">Abonnement Verisure</span>
            </div>
            <p className="mt-1 text-sm">
              49,90€ TTC/mois <span className="text-gray-500">au lieu de 59,90€ TTC (120€ d’économie/an)</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Zéro squat, zéro intrusion
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Contrôle des entrées/sorties depuis votre téléphone
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Alarme, vidéosurveillance et intervention en cas d’alerte
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Tranquillité d’esprit, même à distance
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button asChild className="bg-orange-600 hover:bg-orange-700">
            <a href={mailtoHref}>
              Je suis intéressé(e)
            </a>
          </Button>
          <Button variant="outline" className="gap-2" asChild>
            <a href={mailtoHref}>
              <Lock className="h-4 w-4" />
              Demander plus d’infos
            </a>
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            Offre strictement limitée — après 20 installations, le tarif préférentiel ne sera plus disponible.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default VerisureOfferCard;