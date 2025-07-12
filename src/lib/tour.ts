import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { toast } from 'sonner';

export const startDashboardTour = () => {
  const driverObj = driver({
    showProgress: true,
    allowClose: true,
    nextBtnText: 'Suivant',
    prevBtnText: 'Précédent',
    doneBtnText: 'Terminé',
    onCloseClick: () => {
      localStorage.setItem('dashboardTourCompleted_v1', 'true');
      driverObj.destroy();
      toast.info("Vous pouvez relancer la visite depuis le menu d'aide à tout moment.");
    },
    steps: [
      {
        element: '#tour-financial-summary',
        popover: {
          title: 'Bilan Financier',
          description: 'Ici, vous avez un aperçu rapide de vos finances annuelles, y compris les ventes, les rentrées d\'argent, les frais et le résultat net.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-objective',
        popover: {
          title: 'Suivi de votre Objectif',
          description: 'Visualisez votre progression par rapport à l\'objectif annuel que vous avez fixé. Vous pouvez le modifier à tout moment.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-activity-stats',
        popover: {
          title: 'Activité de Location',
          description: 'Retrouvez les statistiques clés de votre activité : prochaine arrivée, nombre de réservations, de nuits, de voyageurs, et votre taux d\'occupation.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-activity-chart',
        popover: {
          title: 'Répartition par Canal',
          description: 'Ce graphique vous montre la provenance de vos réservations (Airbnb, Booking.com, etc.) pour mieux comprendre vos sources de revenus.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '#tour-monthly-financials',
        popover: {
          title: 'Graphiques Détaillés',
          description: 'Explorez vos données mensuelles en détail. Vous pouvez cliquer sur "Agrandir" pour voir le graphique en plein écran et l\'exporter en PDF.',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '#tour-sidebar-nav',
        popover: {
          title: 'Navigation Principale',
          description: 'Utilisez ce menu pour accéder à toutes les sections de votre espace : calendrier, réservations, comptabilité, et bien plus encore.',
          side: 'right',
          align: 'start',
        },
      },
      {
        popover: {
          title: 'Fin de la visite !',
          description: 'Vous êtes maintenant prêt à explorer votre nouvel espace propriétaire. N\'hésitez pas à naviguer dans les différentes sections.'
        }
      }
    ],
  });

  driverObj.drive();
};