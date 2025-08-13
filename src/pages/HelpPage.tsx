import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Mail, Phone } from 'lucide-react'; // Removed PlayCircle
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query'; // Import useQuery
import { getPublishedFaqs } from '@/lib/faq-api'; // Import getPublishedFaqs
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert components
import { AlertCircle } from 'lucide-react'; // Import AlertCircle

const HelpPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: faqs, isLoading, isError, error } = useQuery({
    queryKey: ['publishedFaqsHelpPage'], // Use a different query key to avoid conflicts with FaqPage
    queryFn: getPublishedFaqs,
  });

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Aides</h1>

        {/* Removed Visite Guidée Card */}

        <Card className="shadow-md mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Foire Aux Questions (FAQ)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : isError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>
                  Impossible de charger les FAQs. Veuillez réessayer plus tard.
                  <p className="text-sm text-muted-foreground mt-2">{(error as Error)?.message || 'Erreur inconnue'}</p>
                </AlertDescription>
              </Alert>
            ) : faqs && faqs.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((item) => (
                  <AccordionItem key={item.id} value={item.id}>
                    <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                    <AccordionContent>
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <p className="text-center text-muted-foreground">Aucune question n'est disponible pour le moment.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Contactez-nous</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? ( // Use isLoading from FAQ query for contact section as well for simplicity
              <>
                <Skeleton className="h-16 w-full" />
                <div className="flex flex-col sm:flex-row gap-3">
                  <Skeleton className="h-10 w-full sm:w-auto" />
                  <Skeleton className="h-10 w-full sm:w-auto" />
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default HelpPage;