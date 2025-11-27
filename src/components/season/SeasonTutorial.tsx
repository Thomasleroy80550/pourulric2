"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarDays, Wand2, Sparkles, CheckCircle } from "lucide-react";

type SeasonTutorialProps = {
  onClose: () => void;
};

const AnimatedNumber: React.FC<{ from: number; to: number; duration?: number; className?: string; suffix?: string }> = ({
  from,
  to,
  duration = 1200,
  className = "",
  suffix = "€",
}) => {
  const [value, setValue] = useState(from);
  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out
      const v = Math.round(from + (to - from) * eased);
      setValue(v);
      if (p < 1) requestAnimationFrame(step);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [from, to, duration]);
  return <span className={className}>{value}{suffix}</span>;
};

const SeasonTutorial: React.FC<SeasonTutorialProps> = ({ onClose }) => {
  // léger effet de montée au montage
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 25);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div
          className={[
            "relative w-full max-w-6xl",
            "rounded-2xl border bg-gradient-to-br from-white via-white to-slate-50",
            "dark:from-slate-900 dark:via-slate-900 dark:to-slate-950",
            "shadow-2xl",
            "p-6 sm:p-10",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4",
            visible ? "opacity-100" : "opacity-0",
          ].join(" ")}
        >
          {/* Decorative sparkles */}
          <div className="absolute -top-4 -left-4 hidden sm:block">
            <Sparkles className="h-10 w-10 text-violet-500 animate-bounce" />
          </div>
          <div className="absolute -bottom-5 -right-5 hidden sm:block">
            <Sparkles className="h-10 w-10 text-blue-500 animate-bounce" />
          </div>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-8 w-8 text-blue-600" />
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
                Saison 2026, prête à performer
              </h2>
            </div>
            <Button variant="ghost" onClick={onClose} className="text-sm">
              Continuer
            </Button>
          </div>

          {/* Hero message */}
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            Construisez une année gagnante avec des prix clairs, des suggestions intelligentes et un envoi en un clic.
          </p>

          {/* Animated prices showcase */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border bg-white/60 dark:bg-slate-900/60 p-5">
              <div className="flex items-center gap-2 text-sm text-violet-700 dark:text-violet-300">
                <Wand2 className="h-4 w-4" />
                Très haute saison
              </div>
              <div className="mt-3 text-3xl sm:text-4xl font-bold">
                <AnimatedNumber from={99} to={119} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Des périodes phares avec des prix optimisés.
              </p>
            </div>
            <div className="rounded-xl border bg-white/60 dark:bg-slate-900/60 p-5">
              <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                <Wand2 className="h-4 w-4" />
                Haute saison
              </div>
              <div className="mt-3 text-3xl sm:text-4xl font-bold">
                <AnimatedNumber from={89} to={109} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Un juste équilibre entre valeur et demande.
              </p>
            </div>
            <div className="rounded-xl border bg-white/60 dark:bg-slate-900/60 p-5">
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                <Wand2 className="h-4 w-4" />
                Week-ends & vacances
              </div>
              <div className="mt-3 text-3xl sm:text-4xl font-bold">
                <AnimatedNumber from={79} to={99} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Boosts automatiques pour les pics de demande.
              </p>
            </div>
          </div>

          {/* Value props */}
          <div className="mt-10 grid sm:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <div className="font-semibold">Suggestions en un clic</div>
                <p className="text-sm text-muted-foreground">Renseignez vos prix de base, nous faisons le reste.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <div className="font-semibold">Saisie simplifiée</div>
                <p className="text-sm text-muted-foreground">Min séjour au besoin. Laissez vide pour le réglage par défaut.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <div className="font-semibold">Envoi rapide</div>
                <p className="text-sm text-muted-foreground">Une demande par logement et par année. Pas de doublons.</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
            <Button size="lg" className="w-full sm:w-auto" onClick={onClose}>
              Configurer mes prix
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={onClose}>
              Je verrai plus tard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeasonTutorial;