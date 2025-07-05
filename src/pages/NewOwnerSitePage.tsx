import React from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Bookmark, Sparkles, FileSpreadsheet, ArrowRight } from 'lucide-react';

const NewOwnerSitePage: React.FC = () => {
  const newFeatures = [
    {
      title: "Tableau de Bord Amélioré",
      description: "Visualisez vos performances financières et d'occupation avec de nouveaux graphiques interactifs et suivez votre objectif annuel.",
      icon: LayoutDashboard,
      link: "/",
    },
    {
      title: "Calendrier Interactif",
      description: "Gérez vos réservations et bloquez des dates pour vos séjours propriétaires ou entretiens directement depuis un calendrier intuitif.",
      icon: CalendarDays,
      link: "/calendar",
    },
    {
      title: "Gestion des Réservations Simplifiée",
      description: "Accédez rapidement aux détails de chaque réservation, filtrez-les et signalez facilement les problèmes rencontrés.",
      icon: Bookmark,
      link: "/bookings",
    },
    {
      title: "Assistant IA Intégré",
      description: "Votre nouvel assistant intelligent est là pour vous aider à bloquer des dates, répondre à vos questions et optimiser votre gestion.",
      icon: Sparkles,
      link: "#", // AI Copilot is accessed via button in header, not a direct page
    },
    {
      title: "Données Google Sheet Centralisées",
      description: "Consultez directement vos données financières et de performance issues de votre Google Sheet, mises à jour en temps réel.",
      icon: FileSpreadsheet,
      link: "/my-google-sheet-data",
    },
  ];

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Découvrez les Nouveautés de Votre Espace Propriétaire !</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Nous avons travaillé dur pour améliorer votre expérience et vous offrir de nouvelles fonctionnalités puissantes.
          Explorez ce qui a changé et comment cela peut vous aider à gérer vos propriétés encore plus efficacement.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {newFeatures.map((feature, index) => (
            <Card key={index} className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">{feature.title}</CardTitle>
                <feature.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{feature.description}</p>
                {feature.link && (
                  <Link to={feature.link}>
                    <Button variant="outline" className="w-full">
                      Découvrir <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 text-center">
          <h2 className="text-2xl font-bold mb-4">Prêt à explorer ?</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Plongez dans votre nouveau tableau de bord et profitez de toutes les améliorations.
          </p>
          <Link to="/">
            <Button size="lg">Accéder au Tableau de Bord</Button>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
};

export default NewOwnerSitePage;