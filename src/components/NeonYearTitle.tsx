"use client";

import React, { useEffect } from "react";

const NeonYearTitle: React.FC<{ className?: string }> = ({ className }) => {
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes softFlicker {
        0%, 100% { opacity: 1; filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.35)); }
        50% { opacity: 0.95; filter: drop-shadow(0 0 16px rgba(255, 255, 255, 0.7)); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div className={className}>
      <div className="text-slate-700 text-xs md:text-sm uppercase tracking-[0.35em] mb-3">
        Célébration
      </div>
      <h1
        className="
          text-4xl md:text-6xl font-extrabold text-center
          [background:linear-gradient(90deg,hsl(var(--primary)),#4f46e5,#0ea5e9,#f59e0b)]
          bg-[length:200%_200%] animate-[gradientShift_6s_ease-in-out_infinite,softFlicker_2.8s_ease-in-out_infinite]
          text-transparent bg-clip-text drop-shadow-[0_0_6px_rgba(79,70,229,0.25)]
        "
      >
        Bonne année <span className="text-slate-900">2026</span>
      </h1>
      <p className="mt-4 md:mt-6 max-w-2xl mx-auto text-slate-700 text-sm md:text-lg">
        Que cette nouvelle année vous apporte joie, santé et succès. À 2026, pleinement dans votre univers.
      </p>
    </div>
  );
};

export default NeonYearTitle;