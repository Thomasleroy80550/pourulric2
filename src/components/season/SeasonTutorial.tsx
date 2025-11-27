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
  CheckCircle,
  AlertTriangle
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
    title: "Bienvenue dans la Saison 2026",
    content:
      "Cette page vous permet de saisir vos prix et restrictions pour chaque période de 2026, puis d'envoyer une demande à l'administration.",
    icon: <CalendarDays className="h-12 w-12 text-blue-600" />,
  },
  {
    id: 2,
    title: "Prix minimum et prix standard",
    content:
      "Renseignez votre prix minimum (plancher) et votre prix standard. Nous proposons des prix par période, calculés selon la saison et le type (week-end, vacances), tout en respectant votre minimum.",
    icon: <Wand2 className="h-12 w-12 text-violet-600" />,
    example: (
      <div className="mt-4 p-4 bg-violet-50 rounded-lg text-sm">
        <div className="font-medium text-violet-700 mb-2">Règles simples (révisées) :</div>
        <ul className="space-y-1 text-violet-700/80">
          <li>• Très haute saison: ×1.20</li>
          <li>• Haute saison: ×1.10</li>
          <li>• Moyenne saison: ×1.00</li>
          <li>• Basse saison: ×0.90</li>
          <li>• Bonus week-end: +8%</li>
          <li>• Bonus vacances scolaires: +4%</li>
        </ul>
      </div>
    ),
  },
  {
    id: 3,
    title: "Correction du week-end de Pâques",
    content:
      "Les dates du week-end de Pâques (03/04 → 06/04/2026) sont ajustées automatiquement pour éviter les 'trous'. La période est scindée en avant/pendant/après pour conserver la continuité.",
    icon: <AlertTriangle className="h-12 w-12 text-amber-600" />,
  },
  {
    id: 4,
    title: "Restrictions et options",
    content:
      "Vous pouvez définir la fermeture et la durée minimale de séjour. Laissez vide un champ si vous souhaitez que l'admin applique ses règles.",
    icon: <Lock className="h-12 w-12 text-slate-600" />,
    example: (
      <div className="mt-4 p-4 bg-slate-50 rounded-lg text-sm">
        <div className="font-medium text-slate-700 mb-2">Exemples :</div>
        <ul className="space-y-1 text-slate-700/80">
          <li>• Min séjour: 2 nuits</li>
          <li>• Fermé: oui/non</li>
        </ul>
      </div>
    ),
  },
  {
    id: 5,
    title: "Envoi et traitement",
    content:
      "Cliquez sur 'Envoyer ma demande'. Nous empêchons les doublons par logement/année. L'administration traite ensuite manuellement (et peut appliquer vos prix/périodes au logement).",
    icon: <CheckCircle className="h-12 w-12 text-green-600" />,
  },
  {
    id: 6,
    title: "Conseils rapides",
    content:
      "Vérifiez les suggestions avant d'appliquer. Si vous êtes en smart pricing, la demande sera rejetée. Contactez l'administration si vous avez besoin de clarifications.",
    icon: <CalendarDays className="h-12 w-12 text-blue-600" />,
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
              {c.example}
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