import React from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, Rocket } from 'lucide-react';

const roadmapItems = [
  {
    title: 'Phase 1 : Lancement et Fonctionnalités Essentielles',
    status: 'Complété',
    date: 'Q1 2025',
    features: [
      'Gestion des réservations',
      'Synchronisation calendrier (Airbnb, Booking)',
      'Tableau de bord financier',
    ],
    icon: CheckCircle,
    iconColor: 'text-green-500',
  },
  {
    title: 'Phase 2 : Améliorations et Nouveaux Rapports',
    status: 'En cours',
    date: 'Q2 2025',
    features: [
      'Rapports de performance détaillés',
      'Module de gestion des avis clients',
      'Optimisation de l\'interface utilisateur',
    ],
    icon: Clock,
    iconColor: 'text-blue-500',
  },
  {
    title: 'Phase 3 : Automatisation et Intégrations',
    status: 'À venir',
    date: 'Q3 2025',
    features: [
      'Automatisation des communications',
      'Intégration Smart Home',
      'Module de tarification dynamique',
    ],
    icon: Rocket,
    iconColor: 'text-yellow-500',
  },
];

const RoadmapPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Road Map</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Découvrez les fonctionnalités à venir et suivez l'évolution de votre plateforme de gestion locative.</p>

        <div className="space-y-8">
          {roadmapItems.map((item, index) => (
            <Card key={index} className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-semibold">{item.title}</CardTitle>
                <item.icon className={`h-7 w-7 ${item.iconColor}`} />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{item.date} - <span className="font-medium">{item.status}</span></p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                  {item.features.map((feature, fIndex) => (
                    <li key={fIndex}>{feature}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default RoadmapPage;