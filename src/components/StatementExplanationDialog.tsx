import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface StatementExplanationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const StatementExplanationDialog: React.FC<StatementExplanationDialogProps> = ({ isOpen, onOpenChange }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Comprendre votre relevé Hello Keys</DialogTitle>
          <DialogDescription>
            Découvrez en détail chaque section de votre relevé pour une meilleure compréhension de vos revenus et dépenses.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto p-4">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>1. Total perçu des plateformes</AccordionTrigger>
              <AccordionContent>
                <p className="mb-2">C'est la somme totale de tous les montants que les plateformes de réservation (comme Airbnb, Booking.com, etc.) ont versés pour vos réservations sur la période du relevé.</p>
                <p className="text-sm text-gray-600 italic">**Schéma/Tutoriel :** Imaginez une tirelire où toutes les plateformes déposent l'argent de vos réservations. Ce total représente le contenu de cette tirelire avant toute déduction.</p>
                <img src="/placeholder.svg" alt="Diagramme Total perçu" className="my-4 w-full h-32 object-contain bg-gray-100 rounded-md" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger>2. Total de notre facture</AccordionTrigger>
              <AccordionContent>
                <p className="mb-2">Il s'agit du montant total facturé par Hello Keys pour l'ensemble de ses services (nos commissions, les frais de ménage, etc.) durant la période concernée.</p>
                <p className="text-sm text-gray-600 italic">**Schéma/Tutoriel :** C'est la somme de tous les services que nous vous avons fournis. Pensez-y comme à une facture unique regroupant toutes nos prestations.</p>
                <img src="/placeholder.svg" alt="Diagramme Total facture" className="my-4 w-full h-32 object-contain bg-gray-100 rounded-md" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger>3. Taxes de séjour collectées</AccordionTrigger>
              <AccordionContent>
                <p className="mb-2">Ce montant correspond aux taxes de séjour que nous avons collectées auprès de vos voyageurs. Nous les reversons ensuite directement aux autorités compétentes en votre nom.</p>
                <p className="text-sm text-gray-600 italic">**Schéma/Tutoriel :** C'est une taxe obligatoire pour les séjours touristiques. Nous la collectons et la transférons, elle ne fait pas partie de vos revenus nets.</p>
                <img src="/placeholder.svg" alt="Diagramme Taxes de séjour" className="my-4 w-full h-32 object-contain bg-gray-100 rounded-md" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger>4. Résultat (Montant net à vous verser)</AccordionTrigger>
              <AccordionContent>
                <p className="mb-2">C'est le montant final qui vous sera versé. Il est calculé en prenant le "Total perçu des plateformes" et en déduisant "Total de notre facture" et les "Taxes de séjour collectées".</p>
                <p className="text-sm text-gray-600 italic">**Schéma/Tutoriel :** C'est votre gain net ! Argent perçu - Nos services - Taxes = Votre virement.</p>
                <img src="/placeholder.svg" alt="Diagramme Résultat" className="my-4 w-full h-32 object-contain bg-gray-100 rounded-md" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger>5. Commission Hello Keys</AccordionTrigger>
              <AccordionContent>
                <p className="mb-2">Il s'agit de nos frais de gestion pour l'ensemble des services que nous vous fournissons (gestion des annonces, communication avec les voyageurs, coordination du ménage, etc.).</p>
                <p className="text-sm text-gray-600 italic">**Schéma/Tutoriel :** C'est le coût de notre travail pour vous simplifier la vie et optimiser vos revenus locatifs.</p>
                <img src="/placeholder.svg" alt="Diagramme Commission HK" className="my-4 w-full h-32 object-contain bg-gray-100 rounded-md" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger>6. Total frais de ménage</AccordionTrigger>
              <AccordionContent>
                <p className="mb-2">C'est le coût total des prestations de ménage effectuées dans votre logement après chaque départ de voyageur.</p>
                <p className="text-sm text-gray-600 italic">**Schéma/Tutoriel :** Chaque réservation génère des frais de ménage pour maintenir votre logement impeccable.</p>
                <img src="/placeholder.svg" alt="Diagramme Frais ménage" className="my-4 w-full h-32 object-contain bg-gray-100 rounded-md" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7">
              <AccordionTrigger>7. Frais de ménage propriétaire</AccordionTrigger>
              <AccordionContent>
                <p className="mb-2">Ces frais sont spécifiques et vous sont facturés en tant que propriétaire, par exemple pour un ménage de fin de saison, un grand nettoyage annuel ou des services supplémentaires demandés.</p>
                <p className="text-sm text-gray-600 italic">**Schéma/Tutoriel :** Ce sont des frais de ménage exceptionnels ou réguliers qui ne sont pas liés directement aux départs des voyageurs.</p>
                <img src="/placeholder.svg" alt="Diagramme Frais ménage propriétaire" className="my-4 w-full h-32 object-contain bg-gray-100 rounded-md" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8">
              <AccordionTrigger>8. Détail des réservations</AccordionTrigger>
              <AccordionContent>
                <p className="mb-2">Ce tableau récapitule chaque réservation individuelle avec tous les montants associés : prix du séjour, frais de ménage, taxe de séjour, frais de paiement, commission OTA, montant versé par la plateforme, revenu généré pour vous et notre commission.</p>
                <p className="text-sm text-gray-600 italic">**Schéma/Tutoriel :** Chaque ligne du tableau est une réservation. Vous pouvez voir comment chaque montant est calculé pour chaque séjour.</p>
                <img src="/placeholder.svg" alt="Diagramme Détail réservations" className="my-4 w-full h-32 object-contain bg-gray-100 rounded-md" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-9">
              <AccordionTrigger>9. Virements à effectuer</AccordionTrigger>
              <AccordionContent>
                <p className="mb-2">Cette section indique les montants que vous devez transférer ou que Hello Keys vous transférera, en fonction du mode de perception des loyers. Il est normal de recevoir votre relevé avant de percevoir vos fonds.</p>
                <p className="text-sm text-gray-600 italic">**Schéma/Tutoriel :** Cette partie vous explique qui doit virer quoi à qui, et quand. Elle détaille les flux financiers finaux.</p>
                <img src="/placeholder.svg" alt="Diagramme Virements" className="my-4 w-full h-32 object-contain bg-gray-100 rounded-md" />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        <DialogFooter className="mt-4">
          <p className="text-xs text-gray-500 text-center w-full">
            Les schémas/tutoriels sont des représentations simplifiées pour faciliter la compréhension. Pour des détails précis, veuillez vous référer aux chiffres de votre relevé.
          </p>
          <Button onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StatementExplanationDialog;