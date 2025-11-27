"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarDays, Wand2, Sparkles, CheckCircle } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

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
            "relative w-full max-w-7xl",
            "rounded-2xl border bg-gradient-to-br from-white via-white to-slate-50",
            "dark:from-slate-900 dark:via-slate-900 dark:to-slate-950",
            "shadow-2xl",
            "p-6 sm:p-10",
            "min-h-[70vh] sm:min-h-[78vh]",
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
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
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

          {/* Slider marketing */}
          <div className="mt-8 relative">
            <Carousel className="w-full">
              <CarouselContent>
                {/* Slide 1: Prix animés */}
                <CarouselItem>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="rounded-2xl border bg-white/70 dark:bg-slate-900/60 p-6 sm:p-8">
                      <div className="flex items-center gap-2 text-sm text-violet-700 dark:text-violet-300">
                        <Wand2 className="h-4 w-4" />
                        Très haute saison
                      </div>
                      <div className="mt-4 text-4xl sm:text-6xl font-extrabold">
                        <AnimatedNumber from={99} to={129} />
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Vos périodes phares, prêtes à maximiser la demande.
                      </p>
                    </div>
                    <div className="rounded-2xl border bg-white/70 dark:bg-slate-900/60 p-6 sm:p-8">
                      <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                        <Wand2 className="h-4 w-4" />
                        Haute saison
                      </div>
                      <div className="mt-4 text-4xl sm:text-6xl font-extrabold">
                        <AnimatedNumber from={89} to={115} />
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Un équilibre idéal entre valeur et conversion.
                      </p>
                    </div>
                    <div className="rounded-2xl border bg-white/70 dark:bg-slate-900/60 p-6 sm:p-8">
                      <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                        <Wand2 className="h-4 w-4" />
                        Week-ends & vacances
                      </div>
                      <div className="mt-4 text-4xl sm:text-6xl font-extrabold">
                        <AnimatedNumber from={79} to={99} />
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Boosts automatiques sur les pics de demande.
                      </p>
                    </div>
                  </div>
                </CarouselItem>

                {/* Slide 2: Bénéfices clés */}
                <CarouselItem>
                  <div className="grid sm:grid-cols-3 gap-6">
                    <div className="flex items-start gap-4 rounded-xl p-4 sm:p-6 bg-white/60 dark:bg-slate-900/60 border">
                      <CheckCircle className="h-7 w-7 text-green-600 flex-shrink-0" />
                      <div>
                        <div className="text-xl font-semibold">Suggestions en un clic</div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Entrez vos bases, nous optimisons selon les périodes.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 rounded-xl p-4 sm:p-6 bg-white/60 dark:bg-slate-900/60 border">
                      <CheckCircle className="h-7 w-7 text-green-600 flex-shrink-0" />
                      <div>
                        <div className="text-xl font-semibold">Saisie simplifiée</div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Min séjour facultatif. Laissez vide pour le réglage par défaut.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 rounded-xl p-4 sm:p-6 bg-white/60 dark:bg-slate-900/60 border">
                      <CheckCircle className="h-7 w-7 text-green-600 flex-shrink-0" />
                      <div>
                        <div className="text-xl font-semibold">Envoi rapide</div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Une demande par logement et par année. Pas de doublons.
                        </p>
                      </div>
                    </div>
                  </div>
                </CarouselItem>

                {/* Slide 3: CTA fort */}
                <CarouselItem>
                  <div className="flex flex-col items-center justify-center text-center rounded-2xl border bg-white/70 dark:bg-slate-900/60 p-8 sm:p-16 min-h-[40vh]">
                    <div className="text-sm uppercase tracking-widest text-blue-600">Prêt pour 2026</div>
                    <h3 className="mt-3 text-3xl sm:text-5xl font-extrabold">
                      Lancez votre saison en toute confiance
                    </h3>
                    <p className="mt-3 max-w-3xl text-sm sm:text-base text-muted-foreground">
                      Des tarifs clairs, une saisie rapide et un envoi en un clic pour accélérer la mise en marché.
                    </p>
                    <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
                      <Button size="lg" className="w-full sm:w-auto" onClick={onClose}>
                        Configurer mes prix
                      </Button>
                      <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={onClose}>
                        Je verrai plus tard
                      </Button>
                    </div>
                  </div>
                </CarouselItem>
              </CarouselContent>

              {/* Flèches de navigation */}
              <CarouselPrevious className="left-2 sm:left-4" />
              <CarouselNext className="right-2 sm:right-4" />
            </Carousel>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeasonTutorial;