"use client";

import React from "react";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Film, Sparkles, Flame, Star, Zap, ArrowRight } from "lucide-react";

const FeatureCard = ({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
}) => (
  <Card className="bg-slate-900/70 border-slate-800 text-slate-100 hover:border-slate-700 transition-colors">
    <CardContent className="p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-red-600/20 border border-red-700/40 flex items-center justify-center">
          <Icon className="h-5 w-5 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold tracking-wide">{title}</h3>
      </div>
      <p className="text-slate-300 text-sm leading-relaxed">{text}</p>
    </CardContent>
  </Card>
);

const Marvel2026Landing: React.FC = () => {
  return (
    <MainLayout>
      <div className="relative min-h-screen">
        {/* Cinematic background */}
        <div className="absolute inset-0 aurora-background opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/80" />

        <section className="relative z-10 container mx-auto px-4 py-12 md:py-16">
          {/* Hero */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-700/50 text-red-300 mb-4">
              <Film className="h-4 w-4" />
              <span className="text-xs font-medium tracking-wider">Studio Marvel</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
              Saison 2026 — Préparez-vous
            </h1>
            <p className="mt-3 md:mt-4 text-slate-300 max-w-2xl mx-auto">
              Une expérience cinématographique pour vos réservations, vos performances et vos finances.
              Design héroïque, rapidité, et puissance au service de votre pilotage.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link to="/new-version">
                <Button className="bg-red-600 hover:bg-red-700 text-white">
                  Découvrir les nouveautés
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link to="/marketplace">
                <Button variant="outline" className="border-red-600 text-red-500 hover:bg-red-600/10">
                  Marketplace 2026
                </Button>
              </Link>
            </div>
          </div>

          {/* Feature grid */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={Sparkles}
              title="Planning cinématique"
              text="Vue ultra compacte, performances améliorées, navigation fluide — votre calendrier devient un vrai story-board."
            />
            <FeatureCard
              icon={Flame}
              title="Tarifs héroïques"
              text="Suggestions intelligentes et optimisations dynamiques pour maximiser vos revenus, sans efforts."
            />
            <FeatureCard
              icon={Star}
              title="Expérience invitée"
              text="Guides, accès, et communications unifiées pour des séjours mémorables et sans friction."
            />
            <FeatureCard
              icon={Zap}
              title="Energie & éco"
              text="Heatmap Ecowatt et planification éco-responsable pour réduire coûts et impact."
            />
            <FeatureCard
              icon={Film}
              title="Studio Mode"
              text="Thème sombre, effets lumineux et animations subtiles pour une ambiance blockbuster."
            />
            <FeatureCard
              icon={ArrowRight}
              title="Prêt pour 2026"
              text="Routes dédiées, intégrations, et outils d’automatisation pour démarrer fort."
            />
          </div>

          {/* Footer CTA */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            <Link to="/calendar">
              <Button variant="secondary" className="bg-slate-800 text-slate-100 hover:bg-slate-700">
                Voir le planning
              </Button>
            </Link>
            <Link to="/finances">
              <Button variant="secondary" className="bg-slate-800 text-slate-100 hover:bg-slate-700">
                Ouvrir Finances
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </MainLayout>
  );
};

export default Marvel2026Landing;