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

const StarField: React.FC<{ density?: number }> = ({ density = 120 }) => {
  const stars = useMemo(() => Array.from({ length: density }).map((_, i) => {
    const size = Math.random() * 2 + 0.5;
    return {
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size,
      opacity: 0.7 + Math.random() * 0.3,
      twinkleDelay: Math.random() * 2000,
      twinkleDuration: 1500 + Math.random() * 1200,
    };
  }), [density]);

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes twinkle {
        0%, 100% { opacity: 0.4; filter: drop-shadow(0 0 2px rgba(255,255,255,0.4)); }
        50% { opacity: 1; filter: drop-shadow(0 0 6px rgba(255,255,255,0.9)); }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  return (
    <div className="absolute inset-0">
      {stars.map(s => (
        <div
          key={s.id}
          className="absolute bg-white rounded-full"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            animation: `twinkle ${s.twinkleDuration}ms ease-in-out infinite`,
            animationDelay: `${s.twinkleDelay}ms`,
          }}
        />
      ))}
    </div>
  );
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
    <div className={`relative w-full h-[78vh] sm:h-[82vh] overflow-hidden ${className || ""}`}>
      {/* Slides */}
      <SlideContainer
        index={0}
        activeIndex={active}
        bgClass="bg-gradient-to-b from-[#0b1023] via-[#0a0f1d] to-black"
      >
        <StarField density={140} />
        <FireworksCanvas />
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-6">
          <NeonYearTitle />
          <p className="mt-4 text-white/80 text-xs md:text-sm max-w-2xl text-center">
            Embarquez dans un voyage cosmique pour accueillir 2026.
          </p>
        </div>
      </SlideContainer>

      <SlideContainer
        index={1}
        activeIndex={active}
        bgClass="bg-gradient-to-b from-[#091a2b] via-[#0b2238] to-[#0d2742]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.08),transparent_60%)]" />
        <FireworksCanvas />
        <div className="absolute bottom-0 left-0 right-0 h-40 opacity-30">
          {/* skyline simple */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 flex gap-2 px-6">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="bg-black/60" style={{ height: 20 + Math.random() * 80, width: 16 + Math.random() * 14 }} />
            ))}
          </div>
        </div>
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-6">
          <NeonYearTitle />
          <p className="mt-4 text-white/85 text-xs md:text-sm max-w-2xl text-center">
            La ville s’illumine, le ciel explose de couleurs. Bonheur et réussite au rendez-vous.
          </p>
        </div>
      </SlideContainer>

      <SlideContainer
        index={2}
        activeIndex={active}
        bgClass="bg-[radial-gradient(circle_at_top,rgba(39,148,208,0.35),transparent_50%)] bg-gradient-to-b from-[#0a1020] via-[#0f1b2e] to-[#081018]"
      >
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[conic-gradient(from_180deg_at_50%_20%,#60a5fa_0%,#22c55e_40%,#fde047_80%,#60a5fa_100%)] opacity-10 animate-[spin_24s_linear_infinite]" />
        </div>
        <FireworksCanvas />
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-6">
          <NeonYearTitle />
          <p className="mt-4 text-white/85 text-xs md:text-sm max-w-2xl text-center">
            Une aurore boréale de promesses pour une année exceptionnelle.
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