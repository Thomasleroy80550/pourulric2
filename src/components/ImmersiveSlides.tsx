"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Music } from "lucide-react";
import FireworksCanvas from "@/components/FireworksCanvas";
import NeonYearTitle from "@/components/NeonYearTitle";

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
  const max = 3;
  const intervalRef = useRef<number | null>(null);

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
    <div className={`relative w-full h-[90vh] sm:h-[92vh] overflow-hidden ${className || ""}`}>
      {/* Slide 1: Gradient brand + motifs diagonaux subtils */}
      <SlideContainer
        index={0}
        activeIndex={active}
        bgClass="bg-gradient-to-b from-indigo-900 via-slate-900 to-black"
      >
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.15) 0, rgba(255,255,255,0.15) 2px, transparent 2px, transparent 12px)" }} />
        <FireworksCanvas />
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-6">
          <NeonYearTitle />
          <p className="mt-4 text-white/80 text-xs md:text-sm max-w-2xl text-center">
            Une célébration immersive aux couleurs de votre univers.
          </p>
        </div>
      </SlideContainer>

      {/* Slide 2: Radial glow + grille légère */}
      <SlideContainer
        index={1}
        activeIndex={active}
        bgClass="bg-gradient-to-b from-[#0b1b33] via-[#0a1930] to-[#09162a]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.18),transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <FireworksCanvas />
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-6">
          <NeonYearTitle />
          <p className="mt-4 text-white/85 text-xs md:text-sm max-w-2xl text-center">
            Un halo doré pour accueillir une année de réussites.
          </p>
        </div>
      </SlideContainer>

      {/* Slide 3: Aurore stylisée brand + bouton final */}
      <SlideContainer
        index={2}
        activeIndex={active}
        bgClass="bg-gradient-to-b from-[#0a1020] via-[#0f1b2e] to-[#081018]"
      >
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[conic-gradient(from_180deg_at_50%_20%,#4f46e5_0%,#0ea5e9_35%,#f59e0b_70%,#4f46e5_100%)] opacity-10 animate-[spin_24s_linear_infinite]" />
        </div>
        <FireworksCanvas />
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-6">
          <NeonYearTitle />
          <p className="mt-4 text-white/85 text-xs md:text-sm max-w-2xl text-center">
            Une vibration de couleurs pour 2026, totalement intégrée à votre charte.
          </p>
          <Button
            onClick={onFinish}
            className="mt-8 bg-yellow-400 hover:bg-yellow-500 text-black"
          >
            Entrer dans 2026
          </Button>
        </div>
      </SlideContainer>

      {/* Controls */}
      <div className="absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-3">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-8 rounded-full transition-all ${i === active ? "bg-white" : "bg-white/30"}`}
          />
        ))}
      </div>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={prev}
          className="border-white/30 text-white hover:bg-white/10"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={next}
          className="border-white/30 text-white hover:bg-white/10"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Mute toggle */}
      <div className="absolute top-3 right-3 z-10">
        <Button
          variant="outline"
          onClick={onToggleMute}
          className="border-white/30 text-white hover:bg-white/10"
        >
          {muted ? "Activer son" : "Couper son"} <Music className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ImmersiveSlides;