"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Music } from "lucide-react";
import FireworksCanvas from "@/components/FireworksCanvas";
import NeonYearTitle from "@/components/NeonYearTitle";
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
  const intervalRef = useRef<number | null>(null);

  // ADDED: format euro pour le montant
  const formattedAmount = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(2143258.95);

  const next = () => setActive((a) => Math.min(a + 1, max - 1));
  const prev = () => setActive((a) => Math.max(a - 1, 0));

  useEffect(() => {
    intervalRef.current && clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setActive((a) => {
        if (a >= max - 1) {
          // fin auto => onFinish
          clearInterval(intervalRef.current!);
          setTimeout(onFinish, 800);
          return a;
        }
        return a + 1;
      });
    }, autoPlayMs);
    return () => { intervalRef.current && clearInterval(intervalRef.current); };
  }, [autoPlayMs, onFinish, max]);

  return (
    <div className={`relative w-full h-[92vh] sm:h-[94vh] overflow-hidden ${className || ""}`}>
      {/* NEW Slide 0: Merci 2025 */}
      <SlideContainer
        index={0}
        activeIndex={active}
        bgClass="bg-sky-100"
      >
        {/* Feux d'artifice légers uniquement si active */}
        {active === 0 && <FireworksCanvas muted={muted} intensity="low" />}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-6">
          <div className="text-slate-700 text-xs md:text-sm uppercase tracking-[0.25em] mb-3">
            Merci à vous
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            Hello Keys 2025
          </h2>

          {/* Stats grid */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-3xl">
            <div className="flex items-center gap-3 rounded-lg bg-white/70 border border-slate-200 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-100 text-sky-700">
                <Euro className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-600">Montant des réservations</p>
                <p className="text-lg md:text-xl font-bold text-slate-900">{formattedAmount}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg bg-white/70 border border-slate-200 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-100 text-sky-700">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-600">Clients</p>
                <p className="text-lg md:text-xl font-bold text-slate-900">13 574</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg bg-white/70 border border-slate-200 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-100 text-sky-700">
                <BedDouble className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-600">Nuits</p>
                <p className="text-lg md:text-xl font-bold text-slate-900">25 217</p>
                <p className="text-xs text-slate-500">≈ 68 ans et 6 mois</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg bg-white/70 border border-slate-200 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-100 text-sky-700">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-600">Total réservations</p>
                <p className="text-lg md:text-xl font-bold text-slate-900">4 656</p>
              </div>
            </div>
          </div>

          <p className="mt-6 text-slate-700 text-sm md:text-base text-center max-w-2xl">
            Merci à notre communauté d'utilisateurs pour leur confiance. En route pour 2026 !
          </p>
        </div>
      </SlideContainer>

      {/* Slide 1: fond bleu clair uniforme */}
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

      {/* Slide 2: fond bleu clair uniforme */}
      <SlideContainer
        index={2}
        activeIndex={active}
        bgClass="bg-sky-100"
      >
        {active === 2 && <FireworksCanvas muted={muted} intensity="low" />}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-6">
          <NeonYearTitle />
          <p className="mt-4 text-slate-700 text-xs md:text-sm max-w-2xl text-center">
            Bonheur et réussite pour une année lumineuse.
          </p>
        </div>
      </SlideContainer>

      {/* Slide 3: fond bleu clair uniforme */}
      <SlideContainer
        index={3}
        activeIndex={active}
        bgClass="bg-sky-100"
      >
        {active === 3 && <FireworksCanvas muted={muted} intensity="low" />}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-6">
          <NeonYearTitle />
          <p className="mt-4 text-slate-700 text-xs md:text-sm max-w-2xl text-center">
            2026, pleinement dans votre style Hello Keys.
          </p>
          <Button
            onClick={onFinish}
            className="mt-8 bg-yellow-400 hover:bg-yellow-500 text-black"
          >
            Entrer dans 2026
          </Button>
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