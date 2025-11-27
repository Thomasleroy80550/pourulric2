"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
      <div className="absolute inset-0 bg-black/40" />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div
          className={[
            "relative w-full max-w-7xl",
            "rounded-xl border bg-white dark:bg-slate-900",
            "shadow-lg",
            "p-6 sm:p-10",
            "min-h-[60vh] sm:min-h-[70vh]",
            "animate-in fade-in-0",
            visible ? "opacity-100" : "opacity-0",
          ].join(" ")}
        >
          {/* Header minimal */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
              Saison 2026
            </h2>
            <Button variant="ghost" onClick={onClose} className="text-sm">
              Continuer
            </Button>
          </div>

          {/* Texte d'intro sobre */}
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            Prix clairs, suggestions rapides et envoi en un clic.
          </p>

          {/* Slider minimaliste */}
          <div className="mt-8 relative">
            <Carousel className="w-full">
              <CarouselContent>
                {/* Slide 1: Prix animés épurés */}
                <CarouselItem>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="rounded-xl border bg-white dark:bg-slate-900 p-6 sm:p-8">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">
                        Très haute saison
                      </div>
                      <div className="mt-4 text-4xl sm:text-6xl font-extrabold">
                        <AnimatedNumber from={99} to={129} />
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Périodes à forte demande.
                      </p>
                    </div>
                    <div className="rounded-xl border bg-white dark:bg-slate-900 p-6 sm:p-8">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">
                        Haute saison
                      </div>
                      <div className="mt-4 text-4xl sm:text-6xl font-extrabold">
                        <AnimatedNumber from={89} to={115} />
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Équilibre valeur / conversion.
                      </p>
                    </div>
                    <div className="rounded-xl border bg-white dark:bg-slate-900 p-6 sm:p-8">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">
                        Week-ends & vacances
                      </div>
                      <div className="mt-4 text-4xl sm:text-6xl font-extrabold">
                        <AnimatedNumber from={79} to={99} />
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Ajustements automatiques.
                      </p>
                    </div>
                  </div>
                </CarouselItem>

                {/* Slide 2: Bénéfices en liste simple */}
                <CarouselItem>
                  <div className="grid sm:grid-cols-3 gap-6">
                    <div className="rounded-xl border bg-white dark:bg-slate-900 p-5">
                      <div className="text-lg font-semibold">Suggestions rapides</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Entrez vos bases, nous proposons selon les périodes.
                      </p>
                    </div>
                    <div className="rounded-xl border bg-white dark:bg-slate-900 p-5">
                      <div className="text-lg font-semibold">Saisie simple</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Min séjour facultatif; laissez vide pour le défaut.
                      </p>
                    </div>
                    <div className="rounded-xl border bg-white dark:bg-slate-900 p-5">
                      <div className="text-lg font-semibold">Envoi en un clic</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Une demande par logement et par année.
                      </p>
                    </div>
                  </div>
                </CarouselItem>

                {/* Slide 3: CTA simple */}
                <CarouselItem>
                  <div className="flex flex-col items-center justify-center text-center rounded-xl border bg-white dark:bg-slate-900 p-8 sm:p-16 min-h-[40vh]">
                    <h3 className="mt-1 text-3xl sm:text-5xl font-extrabold">
                      Démarrer
                    </h3>
                    <p className="mt-3 max-w-2xl text-sm sm:text-base text-muted-foreground">
                      Configurez vos prix 2026 en toute simplicité.
                    </p>
                    <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
                      <Button size="lg" className="w-full sm:w-auto" onClick={onClose}>
                        Configurer mes prix
                      </Button>
                      <Button variant="ghost" size="lg" className="w-full sm:w-auto" onClick={onClose}>
                        Plus tard
                      </Button>
                    </div>
                  </div>
                </CarouselItem>
              </CarouselContent>

              {/* Flèches discrètes */}
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