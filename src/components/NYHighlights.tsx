"use client";

import React from "react";
import { Sparkles, ShieldCheck, Rocket } from "lucide-react";

const items = [
  {
    icon: Sparkles,
    title: "Expériences mémorables",
    desc: "Des séjours réussis grâce à vous et vos voyageurs.",
    color: "text-indigo-700 bg-indigo-100"
  },
  {
    icon: ShieldCheck,
    title: "Fiabilité renforcée",
    desc: "Des outils plus robustes pour piloter votre activité.",
    color: "text-sky-700 bg-sky-100"
  },
  {
    icon: Rocket,
    title: "Cap sur 2026",
    desc: "Des objectifs ambitieux, des résultats concrets.",
    color: "text-amber-700 bg-amber-100"
  },
];

const NYHighlights: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={className}>
      <div className="text-slate-700 text-xs md:text-sm uppercase tracking-[0.25em] mb-3 text-center">
        Moments forts
      </div>
      <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight text-center">
        Ensemble, on va plus loin
      </h3>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {items.map(({ icon: Icon, title, desc, color }, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white/70 p-5">
            <div className={`flex h-10 w-10 items-center justify-center rounded-md ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="mt-3 font-semibold text-slate-900">{title}</p>
            <p className="text-sm text-slate-600">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NYHighlights;