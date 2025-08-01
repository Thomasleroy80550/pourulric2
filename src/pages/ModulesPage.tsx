import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plug, Settings, TrendingUp, MessageSquare, Shield, Banknote, Wrench, Sparkles, CheckCheck, Info, UserCheck } from 'lucide-react'; // Added new icons and Info
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Import Tooltip components
import AccountantAccessDialog from '@/components/AccountantAccessDialog'; // Import the new dialog

interface Module {
  name: string;
  description: string;
  icon: React.ElementType;
  status: 'Activé' | 'Bientôt disponible' | 'Nouveau' | 'Inclus' | 'Sur devis';
  info: string;
  actionText: string;
  buttonVariant: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive' | null | undefined;
  buttonDisabled: boolean;
  onClick?: () => void;
}

const ModulesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isAccountantDialogOpen, setIsAccountantDialogOpen] = useState(false);

  const modules: Module[] = [
    {
      name: 'Accès Comptable',
      description: 'Donnez un accès sécurisé et en lecture seule à votre comptable pour simplifier votre gestion.',
      icon: UserCheck,
      status: 'Nouveau',
      info: 'Inclus dans votre forfait',
      actionText: "Demander l'accès",
      buttonVariant: 'default',
      buttonDisabled: false,
      onClick: () => setIsAccountantDialogOpen(true),
    },
    {
      name: 'Smart Pricing',
      description: 'Des tarifs ajustés en temps réel pour maximiser vos revenus tout en restant compétitif.',
      icon: TrendingUp,
      status: 'Nouveau',
      info: '+1% par réservation',
      actionText: 'Ajouter',
      buttonVariant: 'default',
      buttonDisabled: false,
    },
    {
      name: 'Hello Safe',
      description: 'Offrez à vos voyageurs une assurance optionnelle pour un séjour sans souci : annulation, incidents...',
      icon: Shield,
      status: 'Activé',
      info: 'Inclus',
      actionText: 'Actif',
      buttonVariant: 'outline',
      buttonDisabled: true,
    },
    {
      name: 'Taxe de Séjour',
      description: 'Nous gérons votre déclaration et le paiement directement sur le site du syndicat.',
      icon: Banknote,
      status: 'Activé',
      info: '149€ HT / an / logement',
      actionText: 'Actif',
      buttonVariant: 'outline',
      buttonDisabled: true,
    },
    {
      name: 'Supervision Travaux',
      description: 'Sélection des artisans, négociation des devis, supervision du chantier, contrôle qualité.',
      icon: Wrench,
      status: 'Sur devis',
      info: '7% du montant total des travaux',
      actionText: 'Sur devis',
      buttonVariant: 'outline',
      buttonDisabled: true,
    },
    {
      name: 'Optimisation Charges',
      description: 'Analyse de vos factures (eau, électricité.) pour identifier des économies possibles.',
      icon: Sparkles,
      status: 'Sur devis',
      info: '79 € HT / audit',
      actionText: 'Sur devis',
      buttonVariant: 'outline',
      buttonDisabled: true,
    },
    {
      name: 'Consommables',
      description: 'Gestion et l’achat de vos consommables (papier, pastilles lave-vaisselle, sacs poubelles, etc.)',
      icon: CheckCheck,
      status: 'Activé',
      info: '2€ HT / mois / logement',
      actionText: 'Actif',
      buttonVariant: 'outline',
      buttonDisabled: true,
    },
  ];

  useEffect(() => {
    // Simulate data fetching
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500); // Simulate 1.5 seconds loading

    return () => clearTimeout(timer);
  }, []);

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Modules</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Ajoutez des services sur-mesure pour optimiser la gestion et la rentabilité de votre bien.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <>
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </>
          ) : (
            modules.map((module, index) => (
              <Card key={index} className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-semibold">{module.name}</CardTitle>
                  <module.icon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{module.description}</p>
                  <div className="flex items-center justify-between mt-auto"> {/* Use mt-auto to push to bottom */}
                    <div className="flex items-center text-sm font-medium">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 mr-1 text-blue-500 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{module.info}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span className={`
                        ${module.status === 'Activé' ? 'text-green-600' :
                          module.status === 'Bientôt disponible' ? 'text-yellow-600' :
                          module.status === 'Nouveau' ? 'text-blue-600' :
                          'text-gray-600' // For 'Sur devis'
                        }`}>
                        {module.status}
                      </span>
                    </div>
                    <Button variant={module.buttonVariant} size="sm" disabled={module.buttonDisabled} onClick={module.onClick}>
                      {module.actionText}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
      <AccountantAccessDialog isOpen={isAccountantDialogOpen} onOpenChange={setIsAccountantDialogOpen} />
    </MainLayout>
  );
};

export default ModulesPage;