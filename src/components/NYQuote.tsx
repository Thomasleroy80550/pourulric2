"use client";

import React from "react";

const NYQuote: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={className}>
      <div className="text-slate-700 text-xs md:text-sm uppercase tracking-[0.25em] mb-3 text-center">
        Nouveaux horizons
      </div>
      <blockquote className="max-w-2xl mx-auto text-center">
        <p className="text-xl md:text-2xl font-semibold text-slate-900 leading-relaxed">
          Chaque réservation est une histoire. Merci de construire ces histoires avec nous. À une année 2026 pleine de succès et de sérénité.
        </p>
      </blockquote>
      <p className="mt-4 text-slate-600 text-xs md:text-sm text-center">
        L’équipe Hello Keys
      </p>
    </div>
  );
};

export default NYQuote;