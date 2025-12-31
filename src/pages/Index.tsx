"use client";

import React from "react";
import NewYear2026Cinematic from "@/components/NewYear2026Cinematic";

const Index: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-5xl px-4 md:px-6 py-10 md:py-16">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Bienvenue</h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground">
            Cette page affiche la cinématique de nouvelle année pour que vous puissiez la tester facilement.
            Ajoutez ?testNy2026=1 à l’URL pour forcer l’ouverture, même si vous l’avez déjà vue.
          </p>
        </div>

        <NewYear2026Cinematic />

        <div className="mt-8 text-sm text-muted-foreground">
          Astuce: La cinématique ne s’ouvrira automatiquement qu’une seule fois par utilisateur le 01/01/2026.
        </div>
      </div>
    </div>
  );
};

export default Index;