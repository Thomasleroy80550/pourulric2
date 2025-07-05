import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, Star, Users, DollarSign } from 'lucide-react';

const PromotionPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-800 to-purple-900 text-white">
      {/* Hero Section */}
      <section className="relative flex-grow flex items-center justify-center text-center p-8 md:p-16">
        <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: 'url(/hero-background.jpg)' }}></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6 animate-fade-in-up">
            Optimisez la Gestion de Vos Propriétés Locatives
          </h1>
          <p className="text-lg md:text-xl mb-8 animate-fade-in-up delay-200">
            Découvrez Hello Keys, la solution tout-en-un pour les propriétaires exigeants.
            Simplifiez vos réservations, maximisez vos revenus et offrez une expérience inoubliable à vos locataires.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up delay-400">
            <Link to="/login">
              <Button size="lg" className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105">
                Commencer Gratuitement
              </Button>
            </Link>
            <Link to="/help">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-800 px-8 py-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105">
                En savoir plus
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white text-gray-800 py-16 px-8 md:px-16">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-12">Pourquoi choisir Hello Keys ?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex flex-col items-center p-6 bg-gray-50 rounded-lg shadow-md transition-transform duration-300 hover:scale-105">
              <CheckCircle className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Gestion Simplifiée</h3>
              <p className="text-gray-600">Centralisez toutes vos réservations et tâches en un seul endroit.</p>
            </div>
            <div className="flex flex-col items-center p-6 bg-gray-50 rounded-lg shadow-md transition-transform duration-300 hover:scale-105">
              <DollarSign className="h-12 w-12 text-green-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Revenus Maximisés</h3>
              <p className="text-gray-600">Optimisez vos tarifs et votre taux d'occupation grâce à nos outils.</p>
            </div>
            <div className="flex flex-col items-center p-6 bg-gray-50 rounded-lg shadow-md transition-transform duration-300 hover:scale-105">
              <Users className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Expérience Client</h3>
              <p className="text-gray-600">Offrez un service impeccable et recevez des avis 5 étoiles.</p>
            </div>
            <div className="flex flex-col items-center p-6 bg-gray-50 rounded-lg shadow-md transition-transform duration-300 hover:scale-105">
              <Star className="h-12 w-12 text-yellow-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Support Dédié</h3>
              <p className="text-gray-600">Notre équipe est là pour vous accompagner à chaque étape.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="bg-blue-700 text-white py-16 px-8 md:px-16 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">Prêt à transformer votre gestion locative ?</h2>
        <p className="text-lg md:text-xl mb-8">
          Rejoignez des centaines de propriétaires satisfaits et prenez le contrôle de vos biens.
        </p>
        <Link to="/login">
          <Button size="lg" className="bg-white text-blue-700 hover:bg-gray-100 px-10 py-4 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105">
            Je m'inscris maintenant
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-8 md:px-16 text-center">
        <p>&copy; {new Date().getFullYear()} Hello Keys. Tous droits réservés.</p>
        <div className="flex justify-center space-x-4 mt-4">
          <Link to="/help" className="hover:text-white transition-colors">Aide</Link>
          <Link to="/pages/politique-de-confidentialite" className="hover:text-white transition-colors">Confidentialité</Link>
          <Link to="/pages/conditions-generales" className="hover:text-white transition-colors">CGU</Link>
        </div>
      </footer>
    </div>
  );
};

export default PromotionPage;