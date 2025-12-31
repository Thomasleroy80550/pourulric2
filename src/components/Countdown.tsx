"use client";

import React, { useEffect, useMemo, useState } from "react";

type CountdownProps = {
  target: Date;
  className?: string;
  onComplete?: () => void;
  compact?: boolean;
};

const pad = (n: number) => n.toString().padStart(2, "0");

const Countdown: React.FC<CountdownProps> = ({ target, className, onComplete, compact = false }) => {
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

  return (
    <div className={className} aria-label="Compte à rebours vers 2026">
      {compact ? (
        <div className="inline-flex items-center gap-2 rounded-lg bg-white/70 border border-slate-200 px-3 py-1 text-sm">
          <span className="font-semibold text-slate-900">J-{days}</span>
          <span className="text-slate-700">{pad(hours)}:{pad(minutes)}:{pad(seconds)}</span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-3 rounded-xl bg-white/70 border border-slate-200 px-3 py-2">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-xs text-slate-600">Jours</div>
              <div className="text-lg font-bold text-slate-900">{days}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-600">Heures</div>
              <div className="text-lg font-bold text-slate-900">{pad(hours)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-600">Minutes</div>
              <div className="text-lg font-bold text-slate-900">{pad(minutes)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-600">Secondes</div>
              <div className="text-lg font-bold text-slate-900">{pad(seconds)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Countdown;