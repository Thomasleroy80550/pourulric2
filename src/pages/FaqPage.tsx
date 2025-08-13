import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPublishedFaqs } from '@/lib/faq-api';
import MainLayout from '@/components/MainLayout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mail, Phone, AlertCircle } from 'lucide-react';
import { getSetting } from '@/lib/admin-api';
import {
  CONTACT_EMAIL_KEY,
  CONTACT_PHONE_KEY,
  FAQ_MAIN_TITLE_KEY,
  FAQ_SUBTITLE_KEY,
  FAQ_CONTACT_SECTION_TITLE_KEY,
  FAQ_CONTACT_SECTION_SUBTITLE_KEY,
} from '@/lib/constants';

const FaqPage = () => {
  const { data: faqs, isLoading, isError, error } = useQuery({
    queryKey: ['publishedFaqs'],
    queryFn: getPublishedFaqs,
  });

  const { data: pageTexts, isLoading: isLoadingPageTexts, isError: isErrorPageTexts } = useQuery({
    queryKey: ['faqPageTexts'],
    queryFn: async () => {
      const [
        mainTitle,
        subtitle,
        contactSectionTitle,
        contactSectionSubtitle,
        contactEmail,
        contactPhone,
      ] = await Promise.all([
        getSetting(FAQ_MAIN_TITLE_KEY),
        getSetting(FAQ_SUBTITLE_KEY),
        getSetting(FAQ_CONTACT_SECTION_TITLE_KEY),
        getSetting(FAQ_CONTACT_SECTION_SUBTITLE_KEY),
        getSetting(CONTACT_EMAIL_KEY),
        getSetting(CONTACT_PHONE_KEY),
      ]);

      return {
        mainTitle: mainTitle?.value || 'Foire Aux Questions (FAQ)',
        subtitle: subtitle?.value || 'Trouvez des réponses aux questions les plus fréquemment posées.',
        contactSectionTitle: contactSectionTitle?.value || 'Vous ne trouvez pas de réponse ?',
        contactSectionSubtitle: contactSectionSubtitle?.value || 'Notre équipe est là pour vous aider. Contactez-nous directement.',
        contactEmail: contactEmail?.value || 'contact@hellokeys.fr',
        contactPhone: contactPhone?.value || '03 22 31 92 70',
      };
    },
    staleTime: Infinity,
  });

  const displayLoading = isLoading || isLoadingPageTexts;
  const displayError = isError || isErrorPageTexts;

  return (
    <MainLayout>
      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-extrabold text-center mb-4">{pageTexts?.mainTitle}</h1>
          <p className="text-center text-muted-foreground mb-12">
            {pageTexts?.subtitle}
          </p>

          {displayLoading && (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}

          {displayError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>
                Impossible de charger la FAQ ou les informations de contact. Veuillez réessayer plus tard.
                <p className="text-sm text-muted-foreground mt-2">{(error as Error)?.message || 'Erreur inconnue'}</p>
              </AlertDescription>
            </Alert>
          )}

          {faqs && faqs.length > 0 && (
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq) => (
                <AccordionItem key={faq.id} value={faq.id}>
                  <AccordionTrigger className="text-lg font-semibold text-left">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground whitespace-pre-wrap">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}

          {faqs && faqs.length === 0 && !displayLoading && (
            <p className="text-center text-muted-foreground">Aucune question n'est disponible pour le moment.</p>
          )}

          <div className="mt-20 border-t pt-10">
            <h2 className="text-2xl font-bold text-center mb-6">{pageTexts?.contactSectionTitle}</h2>
            <p className="text-center text-muted-foreground mb-8">
              {pageTexts?.contactSectionSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-8">
              <a href={`mailto:${pageTexts?.contactEmail}`} className="flex items-center gap-3 text-lg font-medium text-primary hover:underline">
                <Mail className="h-6 w-6" />
                <span>{pageTexts?.contactEmail}</span>
              </a>
              <a href={`tel:${pageTexts?.contactPhone?.replace(/\s/g, '')}`} className="flex items-center gap-3 text-lg font-medium text-primary hover:underline">
                <Phone className="h-6 w-6" />
                <span>{pageTexts?.contactPhone}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default FaqPage;