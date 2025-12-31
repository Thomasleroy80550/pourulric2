"use client";

import React, { useEffect, useMemo, useState } from "react";

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
      <div className="flex items-center gap-3 md:gap-4">
        <UnitBox value={`${days}`} label="Jours" />
        <UnitBox value={pad(hours)} label="Heures" />
        <UnitBox value={pad(minutes)} label="Minutes" />
        <UnitBox value={pad(seconds)} label="Secondes" />
      </div>
    </div>
  );
};

export default Countdown;