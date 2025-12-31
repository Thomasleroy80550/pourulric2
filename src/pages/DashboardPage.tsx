"use client";

import React from "react";
import NewYear2026Cinematic from "@/components/NewYear2026Cinematic";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const DashboardPage: React.FC = () => {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Tableau de bord</h1>
      </div>

      {/* Cinématique intégrée ici pour test facile */}
      <Card className="p-4">
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Célébration 2026</h2>
          <p className="text-sm text-muted-foreground">
            La cinématique s’ouvrira automatiquement le 01/01/2026 si elle n’a jamais été vue.
            Pour tester maintenant, utilisez le bouton ci-dessous ou ajoutez ?testNy2026=1 à l’URL.
          </p>
          <NewYear2026Cinematic />
        </div>
      </Card>

      {/* Contenu existant minimal pour cohérence */}
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">
          Bienvenue sur votre tableau de bord. Utilisez la section ci-dessus pour tester la cinématique de bonne année.
        </p>
        <div className="mt-3">
          <Button variant="secondary">Action exemple</Button>
        </div>
      </Card>
    </div>
  );
};

export default DashboardPage;