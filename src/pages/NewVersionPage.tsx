"use client";

import React from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Zap, Home, TrendingUp, Banknote, ReceiptText, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const NewVersionPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-4xl font-bold mb-8 text-center text-primary">Découvrez la Nouvelle Version de Hello Keys !</h1>
        <p className="text-lg text-center text-muted-foreground mb-12 max-w-3xl mx-auto">
          Nous sommes ravis de vous présenter une version entièrement repensée de votre plateforme de gestion locative.
          Cette mise à jour majeure apporte des améliorations significatives en termes de performance, de fonctionnalités
          et de facilité d'utilisation, pour vous offrir une expérience encore plus fluide et efficace.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Section: Performance et Fiabilité */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center text-xl font-semibold text-primary">
                <Zap className="mr-3 h-6 w-6 text-accent" /> Performance et Fiabilité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li><span className="font-medium text-foreground">Intégrations API avancées :</span> Connexions optimisées avec nos logiciels partenaires pour une synchronisation parfaite.</li>
                <li><span className="font-medium text-foreground">Calendrier et Réservations ultra-réactifs :</span> Une fluidité accrue pour gérer vos plannings sans accroc.</li>
                <li><span className="font-medium text-foreground">Statistiques réelles :</span> Vos données financières sont désormais basées sur vos relevés de réservation, garantissant une précision totale.</li>
                <li><span className="font-medium text-foreground">Gestion des incidents :</span> Un nouveau module pour signaler et suivre les problèmes techniques de vos logements.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Section: Gestion Détaillée de Vos Logements */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center text-xl font-semibold text-primary">
                <Home className="mr-3 h-6 w-6 text-accent" /> Gestion Détaillée de Vos Logements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li><span className="font-medium text-foreground">Section "Mes Logements" :</span> Paramétrez chaque aspect de votre propriété.</li>
                <li><span className="font-medium text-foreground">Inventaire complet :</span> Ajoutez et gérez l'inventaire de votre mobilier et équipements.</li>
                <li><span className="font-medium text-foreground">Informations pratiques :</span> Enregistrez codes Wi-Fi, instructions d'arrivée, règles de la maison, etc.</li>
                <li><span className="font-medium text-foreground">Fiche technique centralisée :</span> Nous disposons d'une vue complète pour une gestion optimale.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Section: Performance et Stratégie */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center text-xl font-semibold text-primary">
                <TrendingUp className="mr-3 h-6 w-6 text-accent" /> Performance et Stratégie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li><span className="font-medium text-foreground">Onglet "Performance" repensé :</span> Visualisez des stratégies de prix et d'occupation personnalisées.</li>
                <li><span className="font-medium text-foreground">Demande de stratégie personnalisée :</span> Sollicitez notre équipe pour une stratégie sur mesure adaptée à vos objectifs.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Section: Finances Simplifiées */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center text-xl font-semibold text-primary">
                <Banknote className="mr-3 h-6 w-6 text-accent" /> Finances Simplifiées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li><span className="font-medium text-foreground">Onglet "Finances" :</span> Accédez facilement à tous vos relevés de réservation.</li>
                <li><span className="font-medium text-foreground">Factures intégrées (à venir) :</span> Bientôt, la gestion de vos factures directement depuis la plateforme.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Section: Gestion de la Taxe de Séjour */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center text-xl font-semibold text-primary">
                <ReceiptText className="mr-3 h-6 w-6 text-accent" /> Gestion de la Taxe de Séjour
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li><span className="font-medium text-foreground">Affichage détaillé :</span> Visualisez la taxe de séjour mois par mois pour toutes les réservations concernées.</li>
                <li><span className="font-medium text-foreground">Prévention des retards :</span> Un système innovant pour vous aider à ne jamais manquer une déclaration.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Section: Gestion des Avis Centralisée */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center text-xl font-semibold text-primary">
                <Star className="mr-3 h-6 w-6 text-accent" /> Gestion des Avis Centralisée
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li><span className="font-medium text-foreground">Tous vos avis au même endroit :</span> Consultez les avis de chaque plateforme de réservation.</li>
                <li><span className="font-medium text-foreground">Module activable :</span> Activez cette fonctionnalité pour une vue unifiée de vos retours clients.</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold text-primary mb-4">Prêt à explorer ?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Plongez dès maintenant dans cette nouvelle expérience et découvrez toutes les améliorations par vous-même !
          </p>
          <Button size="lg" onClick={() => window.location.href = '/'}>
            Accéder au Tableau de Bord
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default NewVersionPage;