import React from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Mail, Phone } from 'lucide-react';

const faqItems = [
  {
    question: "Comment puis-je ajouter une nouvelle propriété ?",
    answer: "Vous pouvez ajouter une nouvelle propriété en allant dans la section 'Gestion' de la barre latérale, puis en cliquant sur 'Ajouter une propriété'."
  },
  {
    question: "Comment fonctionne la synchronisation des calendriers ?",
    answer: "Notre système se synchronise automatiquement avec les principales plateformes (Airbnb, Booking, Abritel) toutes les heures. Vous pouvez également forcer une synchronisation manuelle depuis la page 'Calendrier'."
  },
  {
    question: "Où puis-je consulter mes bilans financiers ?",
    answer: "Vos bilans financiers détaillés sont disponibles dans la section 'Comptabilité', sous l'onglet 'Bilans'."
  },
  {
    question: "Comment contacter le support technique ?",
    answer: "Vous pouvez nous contacter par email à support@hellokeys.com ou par téléphone au +33 1 23 45 67 89. Nos équipes sont disponibles du lundi au vendredi, de 9h à 18h."
  },
];

const HelpPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Aides</h1>
        <Card className="shadow-md mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Foire Aux Questions (FAQ)</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                  <AccordionContent>
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Contactez-nous</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Si vous n'avez pas trouvé la réponse à votre question, n'hésitez pas à nous contacter directement.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="w-full sm:w-auto">
                <Mail className="h-4 w-4 mr-2" />
                Envoyer un Email
              </Button>
              <Button variant="outline" className="w-full sm:w-auto">
                <Phone className="h-4 w-4 mr-2" />
                Appeler le Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default HelpPage;