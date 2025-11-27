import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  X,
  CalendarDays,
  Wand2,
  Lock,
  CheckCircle
} from "lucide-react";

interface TutorialSlide {
  id: number;
  title: string;
  content: string;
  icon: React.ReactNode;
  example?: React.ReactNode;
}

const slides: TutorialSlide[] = [
  {
    id: 1,
    title: "Saison 2026 est là ✨",
    content:
      "Préparez votre année avec des prix attractifs et des périodes optimisées. Un parcours pensé pour être simple, clair et efficace.",
    icon: <CalendarDays className="h-12 w-12 text-blue-600" />,
  },
  {
    id: 2,
    title: "Prix intelligents, sans prise de tête",
    content:
      "Définissez votre minimum et votre standard, et laissez nos suggestions ajuster selon les saisons, les week-ends et les vacances scolaires — tout en respectant vos règles.",
    icon: <Wand2 className="h-12 w-12 text-violet-600" />,
  },
  {
    id: 3,
    title: "Contrôle simplifié",
    content:
      "Renseignez la durée minimale de séjour et la fermeture si besoin. Laissez vide pour que l'administration applique ses réglages par défaut.",
    icon: <Lock className="h-12 w-12 text-slate-600" />,
  },
  {
    id: 4,
    title: "Envoyez en un clic",
    content:
      "Un bouton, une demande. Pas de doublons par logement/année, l'administration se charge du reste. Vous êtes prêts pour 2026.",
    icon: <CheckCircle className="h-12 w-12 text-green-600" />,
  },
];

interface SeasonTutorialProps {
  onClose: () => void;
}

const SeasonTutorial: React.FC<SeasonTutorialProps> = ({ onClose }) => {
  const [current, setCurrent] = useState(0);
  const c = slides[current];

  const next = () => current < slides.length - 1 && setCurrent(current + 1);
  const prev = () => current > 0 && setCurrent(current - 1);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
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
              <div className="flex justify-center mb-6">{c.icon}</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{c.title}</h2>
              <p className="text-gray-600 text-lg leading-relaxed">{c.content}</p>
            </div>

            <div className="flex justify-center space-x-2 mb-8">
              {slides.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === current ? "bg-blue-600 w-8" : "bg-gray-300 w-2"
                  }`}
                />
              ))}
            </div>

            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={prev}
                disabled={current === 0}
                className="flex items-center space-x-2"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Précédent</span>
              </Button>

              {current === slides.length - 1 ? (
                <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Terminer
                </Button>
              ) : (
                <Button
                  onClick={next}
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