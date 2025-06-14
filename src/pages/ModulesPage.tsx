import React from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plug, Settings, TrendingUp, MessageSquare } from 'lucide-react';

const modules = [
  {
    name: 'Module de Statistiques Avancées',
    description: 'Obtenez des analyses approfondies sur vos performances de location.',
    icon: TrendingUp,
    status: 'Activé',
  },
  {
    name: 'Gestion des Communications Clients',
    description: 'Centralisez et automatisez vos échanges avec les voyageurs.',
    icon: MessageSquare,
    status: 'Activé',
  },
  {
    name: 'Intégration Smart Home',
    description: 'Connectez vos appareils intelligents pour une gestion à distance.',
    icon: Plug,
    status: 'Bientôt disponible',
  },
  {
    name: 'Optimisation des Prix',
    description: 'Algorithme intelligent pour maximiser vos revenus de location.',
    icon: Settings,
    status: 'Nouveau',
  },
];

const ModulesPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Modules</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Gérez et découvrez de nouveaux modules pour étendre les fonctionnalités de votre application.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module, index) => (
            <Card key={index} className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">{module.name}</CardTitle>
                <module.icon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{module.description}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${
                    module.status === 'Activé' ? 'text-green-600' :
                    module.status === 'Bientôt disponible' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`}>
                    {module.status}
                  </span>
                  <Button variant="outline" size="sm">
                    {module.status === 'Activé' ? 'Désactiver' : 'Activer'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default ModulesPage;