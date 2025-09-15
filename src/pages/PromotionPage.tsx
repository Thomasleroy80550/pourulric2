import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, Star, Users, DollarSign, CalendarDays, Home, Sparkles, MessageSquare, Handshake, ShieldCheck } from 'lucide-react';

const PromotionPage: React.FC = () => {
  const features = [
    {
      icon: CalendarDays,
      title: "Gestion des Réservations & Calendrier",
      description: "Centralisez toutes vos réservations (Airbnb, Booking, Direct) et gérez votre calendrier en temps réel. Bloquez des dates pour vos séjours personnels ou entretiens en un clic.",
    },
    {
      icon: DollarSign,
      title: "Optimisation des Revenus",
      description: "Maximisez la rentabilité de vos biens grâce à nos outils d'analyse de performance, de suivi des objectifs et de tarification intelligente.",
    },
    {
      icon: Home,
      title: "Ménage & Entretien Professionnel",
      description: "Assurez un état impeccable de vos propriétés après chaque départ. Nous gérons le ménage, la blanchisserie et la petite maintenance pour vous.",
    },
    {
      icon: Sparkles,
      title: "Assistant IA Intégré",
      description: "Bénéficiez d'un copilote IA pour vous aider à planifier, répondre à vos questions et optimiser vos tâches quotidiennes de gestion locative.",
    },
    {
      icon: MessageSquare,
      title: "Communication Client Simplifiée",
      description: "Centralisez les échanges avec vos voyageurs et gérez les avis pour construire une réputation en ligne solide et attirer plus de réservations.",
    },
    {
      icon: Handshake,
      title: "Support & Accompagnement Dédié",
      description: "Notre équipe d'experts est à votre disposition pour vous conseiller et vous accompagner dans toutes les étapes de la gestion de vos biens.",
    },
  ];

  const testimonials = [
    {
      quote: "Hello Keys a transformé la gestion de mes appartements. Tout est plus simple, plus rapide, et mes revenus ont augmenté !",
      author: "Sophie L., Propriétaire à Paris",
    },
    {
      quote: "L'assistant IA est une révolution ! Il me fait gagner un temps fou et m'aide à prendre de meilleures décisions.",
      author: "Marc D., Investisseur immobilier",
    },
    {
      quote: "Le service de ménage est impeccable, et le suivi des réservations est d'une clarté incroyable. Je recommande à 100% !",
      author: "Émilie R., Propriétaire à Nice",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-800 to-purple-900 text-white">
      {/* Hero Section */}
      <section className="relative flex-grow flex items-center justify-center text-center p-8 md:p-16 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: 'url(/hero-background.jpg)' }}></div>
        <div className="relative z-10 max-w-5xl mx-auto py-16">
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6 animate-fade-in-up">
            Simplifiez, Optimisez, Prospérez avec Hello Keys
          </h1>
          <p className="text-lg md:text-xl mb-8 animate-fade-in-up delay-200">
            La solution tout-en-un pour les propriétaires exigeants : gérez vos biens locatifs
            avec intelligence, maximisez vos revenus et offrez une expérience inoubliable à vos locataires.
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
          <h2 className="text-3xl md:text-4xl font-bold mb-12">Nos Fonctionnalités Clés</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="flex flex-col items-center p-6 bg-gray-50 rounded-lg shadow-md transition-transform duration-300 hover:scale-105">
                <feature.icon className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-center">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-gray-100 text-gray-800 py-16 px-8 md:px-16">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-12">Ce que disent nos clients</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white p-8 rounded-lg shadow-lg flex flex-col items-center text-center transition-transform duration-300 hover:scale-105">
                <Star className="h-8 w-8 text-yellow-500 mb-4 fill-current" />
                <p className="text-lg italic mb-4">"{testimonial.quote}"</p>
                <p className="font-semibold text-blue-600">- {testimonial.author}</p>
              </div>
            ))}
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