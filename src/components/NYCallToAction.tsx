"use client";

import React from "react";
import { Button } from "@/components/ui/button";

const NYCallToAction: React.FC<{ onFinish: () => void; className?: string }> = ({ onFinish, className }) => {
  const handleClick = () => {
    // Maxi explosion: informer les canvases actifs
    window.dispatchEvent(new Event("ny2026-max-burst"));
    // Laisser l'animation se jouer puis terminer
    setTimeout(() => {
      onFinish();
    }, 1200);
  };

  return (
    <div className={className}>
      <div className="text-slate-700 text-xs md:text-sm uppercase tracking-[0.25em] mb-3 text-center">
        Prêt pour 2026
      </div>
      <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight text-center">
        Continuons l'aventure ensemble
      </h3>
      <p className="mt-3 text-slate-700 text-sm md:text-base text-center max-w-2xl mx-auto">
        Merci pour 2025. Cliquez ci-dessous pour entrer dans 2026.
      </p>
      <div className="mt-6 flex items-center justify-center">
        <Button onClick={handleClick} className="bg-yellow-400 hover:bg-yellow-500 text-black">
          Entrer dans 2026
        </Button>
      </div>
    </div>
  );
};

export default NYCallToAction;