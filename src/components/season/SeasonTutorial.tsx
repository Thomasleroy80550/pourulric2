"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

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

// slides minimalistes au format Finance
type TutorialSlide = {
  id: number;
  title: string;
  content: string;
  example?: React.ReactNode;
};

const tutorialSlides: TutorialSlide[] = [
  {
    id: 1,
    title: "Bienvenue — Saison 2026",
    content:
      "Ce court tutoriel vous présente la saisie des prix par périodes et l'envoi de votre demande en quelques clics.",
  },
  {
    id: 2,
    title: "Périodes et prix",
    content:
      "Définissez vos prix par grandes périodes (très haute, haute, week-ends & vacances). Voici un aperçu chiffré :",
    example: (
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Très haute saison
          </div>
          <div className="mt-2 text-3xl font-extrabold">
            <AnimatedNumber from={99} to={129} />
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Haute saison
          </div>
          <div className="mt-2 text-3xl font-extrabold">
            <AnimatedNumber from={89} to={115} />
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Week-ends & vacances
          </div>
          <div className="mt-2 text-3xl font-extrabold">
            <AnimatedNumber from={79} to={99} />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    title: "Saisie simplifiée",
    content:
      "Renseignez les montants et, si besoin, le minimum de séjour par période. Laissez vide si vous souhaitez conserver le réglage par défaut.",
    example: (
      <div className="mt-4 p-4 rounded-lg border bg-slate-50 dark:bg-slate-900/40">
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li>Prix par période</li>
          <li>Min. séjour optionnel</li>
          <li>Une demande par logement & par année</li>
        </ul>
      </div>
    ),
  },
  {
    id: 4,
    title: "Prêt à commencer ?",
    content:
      "Passez à la configuration de vos prix 2026 dès maintenant. Vous pourrez revenir à ce tutoriel à tout moment.",
  },
];

const SeasonTutorial: React.FC<SeasonTutorialProps> = ({ onClose }) => {
  // léger effet de montée au montage
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 25);
    return () => clearTimeout(t);
  }, []);

  // état des slides
  const [currentSlide, setCurrentSlide] = useState(0);
  const nextSlide = () =>
    setCurrentSlide((i) => (i < tutorialSlides.length - 1 ? i + 1 : i));
  const prevSlide = () => setCurrentSlide((i) => (i > 0 ? i - 1 : i));

  const slide = tutorialSlides[currentSlide];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card
        className={[
          "max-w-2xl w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden",
          "animate-in fade-in-0",
          visible ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 z-10"
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                {slide.title}
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {slide.content}
              </p>
              {slide.example}
            </div>

            <div className="flex justify-center space-x-2 mb-8">
              {tutorialSlides.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentSlide ? "bg-blue-600 w-8" : "bg-gray-300 w-2"
                  }`}
                />
              ))}
            </div>

            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={prevSlide}
                disabled={currentSlide === 0}
                className="flex items-center space-x-2"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Précédent</span>
              </Button>

              {currentSlide === tutorialSlides.length - 1 ? (
                <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Terminer
                </Button>
              ) : (
                <Button
                  onClick={nextSlide}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <span>Suivant</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SeasonTutorial;