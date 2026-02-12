"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Music } from "lucide-react";
import FireworksCanvas from "@/components/FireworksCanvas";
import NeonYearTitle from "@/components/NeonYearTitle";
import NY2025Stats from "@/components/NY2025Stats";
import NYQuote from "@/components/NYQuote";
import NYHighlights from "@/components/NYHighlights";
import NYCallToAction from "@/components/NYCallToAction";
import { Users, CalendarDays, BedDouble, Euro } from "lucide-react";

type ImmersiveSlidesProps = {
  muted: boolean;
  onToggleMute: () => void;
  onFinish: () => void;
  autoPlayMs?: number;
  className?: string;
};

const SlideContainer: React.FC<{ index: number; activeIndex: number; children: React.ReactNode; bgClass: string }> = ({ index, activeIndex, children, bgClass }) => {
  return (
    <div
      className={`absolute inset-0 transition-transform duration-700 ease-in-out will-change-transform ${bgClass}`}
      style={{ transform: `translateX(${(index - activeIndex) * 100}%)` }}
    >
      {children}
    </div>
  );
};

const ImmersiveSlides: React.FC<ImmersiveSlidesProps> = ({
  muted,
  onToggleMute,
  onFinish,
  autoPlayMs = 7000,
  className,
}) => {
  const [active, setActive] = useState(0);
  const max = 4;

  // ADDED: format euro pour le montant
  const formattedAmount = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(2143258.95);

  const next = () => setActive((a) => Math.min(a + 1, max - 1));
  const prev = () => setActive((a) => Math.max(a - 1, 0));

  // AJOUT: bouton Continuer (ou Terminer sur la dernière slide)
  const handleContinue = () => {
    setActive((a) => {
      if (a >= max - 1) {
        onFinish();
        return a;
      }
      return a + 1;
    });
  };

  return (
    <div className={`relative w-full h-[92vh] sm:h-[94vh] overflow-hidden ${className || ""}`}>
      {/* Slide 0: Merci 2025 (stats) */}
      <SlideContainer
        index={0}
        activeIndex={active}
        bgClass="bg-sky-100"
      >
        {/* Pas de feux d'artifice ici pour lisibilité */}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-6">
          <NY2025Stats
            amount={2143258.95}
            clients={13574}
            nights={25217}
            reservations={4656}
            nightsEquivalence="≈ 68 ans et 6 mois"
          />
        </div>
      </SlideContainer>

      {/* Slide 1: Vœux 2026 + feux d'artifice (wow léger) */}
      <SlideContainer
        index={1}
        activeIndex={active}
        bgClass="bg-sky-100"
      >
        {active === 1 && <FireworksCanvas muted={muted} intensity="low" />}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-6">
          <NeonYearTitle />
          <p className="mt-4 text-slate-700 text-xs md:text-sm max-w-2xl text-center">
            Une célébration immersive aux couleurs de votre univers.
          </p>
        </div>
      </SlideContainer>

      {/* Slide 2: Citation + Highlights (sans feu d'artifice pour varier) */}
      <SlideContainer
        index={2}
        activeIndex={active}
        bgClass="bg-sky-100"
      >
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-6">
          <NYQuote />
          <div className="mt-8 w-full">
            <NYHighlights />
          </div>
        </div>
      </SlideContainer>

      {/* Slide 3: CTA + feux d'artifice léger */}
      <SlideContainer
        index={3}
        activeIndex={active}
        bgClass="bg-sky-100"
      >
        {active === 3 && <FireworksCanvas muted={muted} intensity="low" />}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-6">
          <NYCallToAction onFinish={onFinish} />
        </div>
      </SlideContainer>

      {/* Indicateurs et contrôles */}
      <div className="absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-3">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-8 rounded-full transition-all ${i === active ? "bg-slate-800" : "bg-slate-400/40"}`}
          />
        ))}
      </div>

      {/* AJOUT: Bouton Continuer centré en bas */}
      <div className="absolute inset-x-0 bottom-24 z-10 flex justify-center">
        <Button
          onClick={handleContinue}
          className="px-6 bg-blue-600 text-white hover:bg-blue-700"
        >
          {active < max - 1 ? "Continuer" : "Terminer"}
        </Button>
      </div>

      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={prev}
          className="border-slate-300 text-slate-800 hover:bg-slate-100"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={next}
          className="border-slate-300 text-slate-800 hover:bg-slate-100"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="absolute top-3 right-3 z-10">
        <Button
          variant="outline"
          onClick={onToggleMute}
          className="border-slate-300 text-slate-800 hover:bg-slate-100"
        >
          {muted ? "Activer son" : "Couper son"} <Music className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ImmersiveSlides;