"use client";

import React from "react";
import MainLayout from "@/components/MainLayout";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ThermoBnBLandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>ThermoBnB — Lancement du service</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              Bienvenue sur ThermoBnB. Ce service pilote le chauffage selon vos réservations:
              préchauffage avant l’arrivée, consigne pendant le séjour, mode éco au départ.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button className="w-full" onClick={() => navigate("/thermobnb-access")}>
                Entrer un mot de passe
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
                Se connecter
              </Button>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              Astuce: après validation du mot de passe, l’accès est mémorisé sur votre appareil.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ThermoBnBLandingPage;