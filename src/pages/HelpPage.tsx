import React from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Mail, Phone } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { getPublishedFaqs } from '@/lib/faq-api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import IdeaSubmissionForm from '@/components/IdeaSubmissionForm';

const HelpPage: React.FC = () => {
  const { data: faqs, isLoading, isError, error } = useQuery({
    queryKey: ['publishedFaqsHelpPage'],
    queryFn: getPublishedFaqs,
  });

  const affluenceData = [
    { hour: '9h', affluence: 150 },
    { hour: '10h', affluence: 200 },
    { hour: '11h', affluence: 250 },
    { hour: '12h', affluence: 180 },
    { hour: '14h', affluence: 220 },
    { hour: '15h', affluence: 280 },
    { hour: '16h', affluence: 300 },
    { hour: '17h', affluence: 270 },
    { hour: '18h', affluence: 100 },
  ];

  const chartConfig = {
    affluence: {
      label: "Affluence",
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Aides</h1>

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Contactez-nous</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
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
                  <p className="text-gray-600 dark:text-gray-400 font-semibold">
                    Nos horaires : 9h-12h / 14h-18h du lundi au samedi
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

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                    <h3 className="text-lg font-semibold mb-2">Meilleurs Horaires pour nous Appeler</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                      Ce graphique indique les périodes d'affluence de notre support. Privilégiez les heures creuses pour un temps d'attente réduit.
                    </p>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">
                      Les meilleurs horaires pour nous appeler sont généralement entre 9h et 10h, et après 17h.
                    </p>
                    <ChartContainer config={chartConfig} className="min-h-[40px] w-full">
                      <BarChart accessibilityLayer data={affluenceData}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="hour"
                          tickLine={false}
                          tickMargin={10}
                          axisLine={false}
                          tickFormatter={(value) => `${value}`}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent indicator="dashed" />}
                        />
                        <Bar dataKey="affluence" fill="var(--color-affluence)" radius={4} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <IdeaSubmissionForm />
        </div>
      </div>
    </MainLayout>
  );
};

export default HelpPage;