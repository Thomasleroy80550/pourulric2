import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, FileText, Calculator, TrendingUp, CreditCard } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

interface TutorialSlide {
  id: number;
  title: string;
  content: string;
  icon: React.ReactNode;
  example?: React.ReactNode;
}

const tutorialSlides: TutorialSlide[] = [
  {
    id: 1,
    title: "Bienvenue dans votre espace Finances",
    content: "Ce tutoriel vous guidera à travers les différentes sections pour vous aider à comprendre vos relevés et factures.",
    icon: <FileText className="h-12 w-12 text-blue-600" />
  },
  {
    id: 2,
    title: "Les Relevés",
    content: "Les relevés mensuels récapitulent l'ensemble de vos réservations, revenus et commissions pour chaque mois. Vous y trouverez le détail de chaque réservation avec les montants bruts, commissions et net à payer.",
    icon: <Calculator className="h-12 w-12 text-green-600" />,
    example: (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-sm font-medium text-gray-700 mb-2">Exemple de relevé :</div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Réservation #1234</span>
            <span className="font-medium">850€</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Commission (26%)</span>
            <span>-221€</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-1">
            <span>Net à payer</span>
            <span className="text-green-600">629€</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 3,
    title: "Les Factures",
    content: "Les factures sont générées automatiquement chaque mois basées sur vos relevés. Elles incluent tous les services facturés (commission, services annexes) et sont disponibles en format PDF pour votre comptabilité.",
    icon: <CreditCard className="h-12 w-12 text-purple-600" />,
    example: (
      <div className="mt-4 p-4 bg-purple-50 rounded-lg">
        <div className="text-sm font-medium text-purple-700 mb-2">Services facturés :</div>
        <ul className="text-sm space-y-1">
          <li>• Commission sur réservations</li>
          <li>• Frais de gestion</li>
          <li>• Services additionnels</li>
          <li>• TVA applicable</li>
        </ul>
      </div>
    )
  },
  {
    id: 4,
    title: "Suivi de vos performances",
    content: "Utilisez ces données pour suivre l'évolution de votre activité, comparer vos mois et optimiser votre stratégie tarifaire. Les tendances vous aident à identifier les périodes de forte et faible activité.",
    icon: <TrendingUp className="h-12 w-12 text-orange-600" />
  },
  {
    id: 5,
    title: "Prêt à commencer ?",
    content: "Vous pouvez maintenant naviguer entre les différentes sections. N'hésitez pas à revenir consulter ce tutoriel quand vous en avez besoin !",
    icon: <FileText className="h-12 w-12 text-blue-600" />
  }
];

interface FinanceTutorialProps {
  onClose: () => void;
}

const FinanceTutorial: React.FC<FinanceTutorialProps> = ({ onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (currentSlide < tutorialSlides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const currentSlideData = tutorialSlides[currentSlide];

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
              <div className="flex justify-center mb-6">
                {currentSlideData.icon}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {currentSlideData.title}
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed">
                {currentSlideData.content}
              </p>
              {currentSlideData.example}
            </div>

            <div className="flex justify-center space-x-2 mb-8">
              {tutorialSlides.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-2 rounded-full transition-all duration-300 ${
                    index === currentSlide ? 'bg-blue-600 w-8' : 'bg-gray-300'
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
                <Button
                  onClick={onClose}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
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

export default FinanceTutorial;