"use client";

import React from "react";
import MainLayout from "@/components/MainLayout";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Thermometer, Flame, Clock, ShieldCheck } from "lucide-react";

const ThermoBnBLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [accessGranted, setAccessGranted] = React.useState<boolean>(false);

  React.useEffect(() => {
    const allowed = localStorage.getItem("thermobnb_access_granted");
    setAccessGranted(allowed === "true");
  }, []);

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-blue-50 to-white">
        {/* HERO */}
        <div className="mx-auto max-w-5xl px-6 pt-10">
          <div className="text-center">
            <Badge className="mb-3" variant="secondary">ThermoBnB</Badge>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Chauffage simple, automatique, et fiable
            </h1>
            <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
              Préchauffage avant l’arrivée, maintien pendant le séjour, passage en éco au départ. 
              Tout est géré pour vous, sans prise de tête.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button className="w-full sm:w-auto" onClick={() => navigate("/thermobnb-access")}>
                Entrer le mot de passe
              </Button>
              <Button className="w-full sm:w-auto" variant="outline" onClick={() => navigate("/login")}>
                Se connecter
              </Button>
              {accessGranted && (
                <Button className="w-full sm:w-auto" variant="secondary" onClick={() => navigate("/integrations/netatmo/dashboard")}>
                  Accéder au tableau de bord
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* FEATURES */}
        <div className="mx-auto max-w-5xl px-6 pb-12 mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Thermometer className="w-5 h-5 text-blue-600" />
                <p className="font-medium">Préchauffage intelligent</p>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Lance la chauffe avant l’arrivée selon votre scénario.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Flame className="w-5 h-5 text-orange-600" />
                <p className="font-medium">Maintien pendant le séjour</p>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Confort constant, sans réglages compliqués.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-green-600" />
                <p className="font-medium">Éco au départ</p>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Passage automatique à la température éco à l’heure de départ.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <p className="font-medium">Mode autonome</p>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Fonctionne en arrière-plan même si la page est fermée.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA SECTION */}
        <div className="mx-auto max-w-5xl px-6 pb-16">
          <div className="rounded-xl border bg-white p-6 md:p-8 shadow-sm">
            <h2 className="text-xl font-semibold">Prêt à démarrer ?</h2>
            <p className="mt-2 text-gray-600">
              Entrez le mot de passe pour visualiser ThermoBnB ou connectez-vous pour gérer votre scénario.
            </p>
            <div className="mt-5 flex flex-col sm:flex-row items-center gap-3">
              <Button className="w-full sm:w-auto" onClick={() => navigate("/thermobnb-access")}>
                Entrer le mot de passe
              </Button>
              <Button className="w-full sm:w-auto" variant="outline" onClick={() => navigate("/login")}>
                Se connecter
              </Button>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Mot de passe actuel: Yolo80550 (modifiable par l’admin dans les paramètres).
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ThermoBnBLandingPage;