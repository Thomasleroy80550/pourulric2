"use client";

import React from "react";
import { Shield, KeyRound, Smartphone, CheckCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

const VerisureOfferBanner: React.FC = () => {
  const mailtoHref = `mailto:contact@hellokeys.fr?subject=Offre%20Verisure%20Hello%20Keys&body=Bonjour%20Hello%20Keys,%0A%0AJe%20souhaite%20b%C3%A9n%C3%A9ficier%20de%20l%E2%80%99offre%20Verisure.%20Merci%20de%20me%20recontacter%20pour%20les%20modalit%C3%A9s.%0A%0ANom:%0APr%C3%A9nom:%0AT%C3%A9l%C3%A9phone:%0ALogement%20concern%C3%A9:%0A%0AMerci%20!`;

  return (
    <Dialog>
      <div className="rounded-lg border border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-200 px-3 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="h-4 w-4 text-orange-600 flex-shrink-0" />
          <p className="text-sm font-medium truncate">
            Sécurité connectée Verisure — Offre spéciale Hello Keys
          </p>
        </div>
        <DialogTrigger asChild>
          <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
            Découvrir l’offre
          </Button>
        </DialogTrigger>
      </div>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-600" />
            Sécurité connectée Verisure — Offre spéciale Hello Keys
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge className="bg-orange-600 text-white">Limité aux 20 premiers clients</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <p>
              Hello 👋 Chez Hello Keys, on sait qu’être propriétaire d’un logement Airbnb, c’est aussi vivre avec une petite boule au ventre à chaque réservation…
            </p>
            <p>
              🔑 Clés égarées, 🚪 portes laissées ouvertes, 😬 peur du squat ou d’une intrusion pendant la basse saison… Alors on a décidé d’agir 💪
            </p>
            <p>
              En partenariat avec Verisure, le leader européen de la sécurité connectée, on vous a négocié une offre exceptionnelle réservée aux clients Hello Keys :
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
              Contrôle total des entrées/sorties depuis votre téléphone
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Alarme, vidéosurveillance et intervention en cas d’alerte
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Tranquillité d’esprit, même à distance 😌
            </div>
          </div>

          <p className="text-xs text-gray-500">
            ⚠️ Offre strictement limitée aux 20 premiers clients Hello Keys. Après, le tarif préférentiel ne sera plus disponible.
          </p>
        </div>

        <DialogFooter className="mt-2">
          <Button asChild className="bg-orange-600 hover:bg-orange-700">
            <a href={mailtoHref}>Je suis intéressé(e)</a>
          </Button>
          <Button variant="outline" className="gap-2" asChild>
            <a href={mailtoHref}>
              <Lock className="h-4 w-4" />
              Demander plus d’infos
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VerisureOfferBanner;