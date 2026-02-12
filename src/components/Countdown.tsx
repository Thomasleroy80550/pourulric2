"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

type CountdownProps = {
  target: Date;
  className?: string;
  onComplete?: () => void;
  compact?: boolean;
};

const pad = (n: number) => n.toString().padStart(2, "0");

// ADDED: unités stylisées avec animation
const UnitBox: React.FC<{ value: string; label: string }> = ({ value, label }) => {
  return (
    <div className="flex flex-col items-center">
      <div className="text-[10px] md:text-xs text-slate-600">{label}</div>
      <div
        key={value}
        className="
          mt-1 rounded-xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50
          px-3 py-1.5 md:px-4 md:py-2 text-slate-900 font-bold text-base md:text-xl
          shadow-sm [box-shadow:inset_0_0_8px_rgba(255,255,255,0.7)]
          animate-[flipIn_300ms_ease-out]
        "
      >
        {value}
      </div>
    </div>
  );
};

const Countdown: React.FC<CountdownProps> = ({ target, className, onComplete, compact = false }) => {
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes flipIn {
        0% { transform: rotateX(80deg); opacity: 0; }
        60% { transform: rotateX(-10deg); opacity: 1; }
        100% { transform: rotateX(0deg); opacity: 1; }
      }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      /* Festive twinkle for small sparkles */
      @keyframes twinkle {
        0%, 100% { opacity: 0.6; transform: scale(0.95) rotate(0deg); }
        50% { opacity: 1; transform: scale(1.1) rotate(8deg); }
      }
      /* Soft glow pulse for the frame */
      @keyframes glowPulse {
        0% { box-shadow: 0 0 0px rgba(255,255,255,0.0); }
        50% { box-shadow: 0 6px 18px rgba(59,130,246,0.25); }
        100% { box-shadow: 0 0 0px rgba(255,255,255,0.0); }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const targetMs = useMemo(() => target.getTime(), [target]);
  const [diff, setDiff] = useState(() => Math.max(0, targetMs - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      setDiff((prev) => {
        const next = Math.max(0, targetMs - Date.now());
        if (prev > 0 && next === 0 && onComplete) onComplete();
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [targetMs, onComplete]);

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (diff <= 0) {
    return (
      <div className={className}>
        <span className="inline-flex items-center rounded-lg bg-sky-100 text-sky-800 px-3 py-1 text-sm font-medium">
          Bonne année 2026 🎉
        </span>
      </div>
    );
  }

  // Layout compact amélioré
  if (compact) {
    return (
      <div className={className} aria-label="Compte à rebours vers 2026">
        <div className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white/70 px-3 py-2">
          <span className="text-sm md:text-base font-semibold text-slate-900">
            J-{days}
          </span>
          <span className="text-slate-700 font-mono">
            {pad(hours)}:{pad(minutes)}:{pad(seconds)}
          </span>
        </div>
      </div>
    );
  }

  // Layout plein "sexy"
  return (
    <div className={className} aria-label="Compte à rebours vers 2026">
      <div className="relative inline-block">
        {/* Cadre dégradé festif */}
        <div className="rounded-2xl p-[2px] bg-gradient-to-r from-sky-400 via-indigo-500 to-amber-400 animate-[glowPulse_3.2s_ease-in-out_infinite]">
          <div className="relative rounded-2xl bg-white/80 backdrop-blur-sm px-4 py-3 md:px-6 md:py-4 shadow-sm">
            {/* Lueur très subtile en haut */}
            <div className="pointer-events-none absolute -top-1 left-6 right-6 h-1.5 rounded-full bg-gradient-to-r from-white/70 via-white/30 to-white/70 blur-[2px]" />
            {/* Contenu du compteur */}
            <div className="flex items-center gap-3 md:gap-4">
              <UnitBox value={`${days}`} label="Jours" />
              <UnitBox value={pad(hours)} label="Heures" />
              <UnitBox value={pad(minutes)} label="Minutes" />
              <UnitBox value={pad(seconds)} label="Secondes" />
            </div>
          </div>
        </div>

        {/* Éclats décoratifs */}
        <div className="pointer-events-none absolute -top-3 -left-2 text-sky-500/80 animate-[twinkle_2.6s_ease-in-out_infinite]">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="pointer-events-none absolute -bottom-3 left-8 text-indigo-500/80 animate-[twinkle_3s_ease-in-out_infinite]">
          <Sparkles className="h-3 w-3" />
        </div>
        <div className="pointer-events-none absolute -top-2 right-6 text-amber-500/80 animate-[twinkle_2.4s_ease-in-out_infinite]">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
};

export default Countdown;