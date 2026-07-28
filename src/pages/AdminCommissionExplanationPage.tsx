import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Calculator, Info, Percent, ReceiptText } from 'lucide-react';

// Exemple chiffré (valeurs illustratives, mêmes formules que le générateur de relevés)
const example = {
  prixSejour: 500,
  fraisMenage: 80,
  taxeDeSejour: 12,
  commissionPlateforme: 45,
  fraisPaiement: 8,
  taux: 0.26,
};
const exCA = example.prixSejour + example.fraisMenage + example.taxeDeSejour;
const exMontantVerse = exCA - example.commissionPlateforme - example.fraisPaiement;
const exRevenuGenere = exMontantVerse - example.fraisMenage - example.taxeDeSejour;
const exCommission = exRevenuGenere * example.taux;

const eur = (n: number) => `${n.toFixed(2)}€`;

const steps = [
  {
    title: '1. Chiffre d\u2019Affaires (CA)',
    formula: 'CA = Prix Séjour + Frais de Ménage + Taxe de Séjour',
    detail:
      'C\u2019est le montant total payé par le voyageur. Attention : pour Airbnb et Booking.com, la taxe de séjour est mise à 0 car ces plateformes la collectent et la reversent directement aux autorités.',
    example: `${eur(example.prixSejour)} + ${eur(example.fraisMenage)} + ${eur(example.taxeDeSejour)} = ${eur(exCA)}`,
  },
  {
    title: '2. Montant Versé',
    formula: 'Montant Versé = CA − Commission Plateforme (OTA) − Frais de Paiement',
    detail:
      'C\u2019est ce que la plateforme verse réellement, après avoir prélevé sa propre commission et les frais de paiement (Stripe, etc.).',
    example: `${eur(exCA)} − ${eur(example.commissionPlateforme)} − ${eur(example.fraisPaiement)} = ${eur(exMontantVerse)}`,
  },
  {
    title: '3. Revenu Généré',
    formula: 'Revenu Généré = Montant Versé − Frais de Ménage − Taxe de Séjour',
    detail:
      'On retire les frais de ménage et la taxe de séjour car ce ne sont pas des revenus locatifs : le ménage rémunère la prestation de ménage et la taxe est reversée. C\u2019est LA base de calcul de notre commission.',
    example: `${eur(exMontantVerse)} − ${eur(example.fraisMenage)} − ${eur(example.taxeDeSejour)} = ${eur(exRevenuGenere)}`,
  },
  {
    title: '4. Commission Hello Keys',
    formula: 'Commission = Revenu Généré × Taux du client',
    detail:
      'Le taux est propre à chaque client (stocké dans sa fiche). Si aucun taux n\u2019est renseigné, le taux par défaut de 26% est appliqué (un avertissement s\u2019affiche alors lors de la génération). Les séjours « Propriétaire » ne génèrent aucune commission.',
    example: `${eur(exRevenuGenere)} × ${(example.taux * 100).toFixed(0)}% = ${eur(exCommission)}`,
  },
];

const faq = [
  {
    q: 'Pourquoi la commission n\u2019est-elle pas calculée sur le CA total ?',
    a: 'La commission est calculée sur le Revenu Généré, c\u2019est-à-dire le loyer réellement perçu, net des commissions plateforme, des frais de paiement, des frais de ménage et de la taxe de séjour. Nous ne prenons donc pas de commission sur des sommes qui ne sont pas des revenus locatifs (ménage, taxe) ni sur des montants prélevés par les plateformes.',
  },
  {
    q: 'Pourquoi la taxe de séjour est-elle à 0€ sur les réservations Airbnb et Booking ?',
    a: 'Airbnb et Booking.com collectent la taxe de séjour directement auprès du voyageur et la reversent eux-mêmes aux autorités. Elle ne transite donc pas par nous : elle est mise à 0 dans le relevé pour ces plateformes. Pour les autres canaux (site direct, Stripe...), la taxe apparaît puis est déduite du résultat car elle doit être reversée.',
  },
  {
    q: 'Quel taux de commission est appliqué ?',
    a: 'Le taux renseigné dans la fiche du client (Admin → Utilisateurs → Modifier). Il est saisi en pourcentage et stocké en décimal (ex : 26% = 0,26). Si aucun taux n\u2019est renseigné, le système applique 26% par défaut et affiche un avertissement lors de la génération du relevé.',
  },
  {
    q: 'La commission est-elle HT ou TTC ?',
    a: 'Le montant calculé (Revenu Généré × taux) est un montant TTC. Sur le relevé, le total de la facture est décomposé : HT = Total ÷ 1,2 et TVA (20%) = Total − HT.',
  },
  {
    q: 'Que contient le « Total de notre facture » sur le relevé ?',
    a: 'Total Facture = Commission Hello Keys + Total des frais de ménage (des réservations) + Frais de ménage propriétaire éventuels. C\u2019est ce montant TTC qui est facturé au client.',
  },
  {
    q: 'Comment est calculé le « Résultat » (net versé au propriétaire) ?',
    a: 'Résultat = Total perçu des plateformes (Montant Versé) − Taxes de séjour collectées − Frais de ménage − Commission Hello Keys − Frais de ménage propriétaire. C\u2019est le montant net qui revient au propriétaire.',
  },
  {
    q: 'Les séjours propriétaire sont-ils commissionnés ?',
    a: 'Non. Lors d\u2019une génération depuis Krossbooking, les séjours propriétaire sont inclus dans le relevé mais leur commission Hello Keys est de 0€. Dans un import Excel, les lignes « PROPRIETAIRE » sont simplement ignorées.',
  },
  {
    q: 'Que se passe-t-il si une réservation est modifiée manuellement dans le relevé ?',
    a: 'Si un admin modifie le prix séjour, le ménage ou la taxe d\u2019une ligne, tout est recalculé automatiquement avec les mêmes formules : Montant Versé, Revenu Généré et Commission Hello Keys (avec le taux du client).',
  },
];

const AdminCommissionExplanationPage: React.FC = () => {
  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Calculator className="h-7 w-7 text-primary" />
            Calcul de la commission Hello Keys
          </h1>
          <p className="text-muted-foreground mt-1">
            Page de référence pour répondre aux questions récurrentes. Elle décrit exactement le calcul
            utilisé par le générateur de relevés — rien de plus, rien de moins.
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Le principe en une phrase</AlertTitle>
          <AlertDescription>
            La commission Hello Keys = <strong>Revenu Généré × Taux du client</strong> (26% par défaut si non renseigné),
            où le Revenu Généré est le loyer net réellement perçu, hors ménage, hors taxe de séjour et après
            déduction des commissions plateforme et frais de paiement.
          </AlertDescription>
        </Alert>

        {/* Étapes de calcul */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Le calcul, étape par étape
            </CardTitle>
            <CardDescription>
              Chaque réservation du relevé suit exactement ces 4 étapes. Exemple chiffré : séjour de{' '}
              {eur(example.prixSejour)}, ménage {eur(example.fraisMenage)}, taxe {eur(example.taxeDeSejour)},
              commission plateforme {eur(example.commissionPlateforme)}, frais de paiement {eur(example.fraisPaiement)},
              taux client {(example.taux * 100).toFixed(0)}%.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {steps.map((step) => (
              <div key={step.title} className="border rounded-lg p-4">
                <p className="font-semibold">{step.title}</p>
                <p className="mt-1 font-mono text-sm bg-muted rounded px-2 py-1 inline-block">
                  {step.formula}
                </p>
                <p className="text-sm text-muted-foreground mt-2">{step.detail}</p>
                <p className="text-sm mt-2">
                  <Badge variant="secondary" className="mr-2">Exemple</Badge>
                  <span className="font-mono">{step.example}</span>
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Exemple récapitulatif */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5" />
              Récapitulatif de l&apos;exemple
            </CardTitle>
            <CardDescription>
              Les mêmes colonnes que celles du relevé envoyé au client.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Prix Séjour</TableHead>
                    <TableHead>Frais Ménage</TableHead>
                    <TableHead>Taxe Séjour</TableHead>
                    <TableHead>Commission OTA</TableHead>
                    <TableHead>Frais Paiement</TableHead>
                    <TableHead>CA</TableHead>
                    <TableHead>Montant Versé</TableHead>
                    <TableHead>Revenu Généré</TableHead>
                    <TableHead className="text-primary font-bold">Commission HK (26%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>{eur(example.prixSejour)}</TableCell>
                    <TableCell>{eur(example.fraisMenage)}</TableCell>
                    <TableCell>{eur(example.taxeDeSejour)}</TableCell>
                    <TableCell>{eur(example.commissionPlateforme)}</TableCell>
                    <TableCell>{eur(example.fraisPaiement)}</TableCell>
                    <TableCell className="font-semibold">{eur(exCA)}</TableCell>
                    <TableCell className="font-semibold">{eur(exMontantVerse)}</TableCell>
                    <TableCell className="font-semibold">{eur(exRevenuGenere)}</TableCell>
                    <TableCell className="font-bold text-primary">{eur(exCommission)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Sur le relevé final : <span className="font-mono">Total Facture = Commission HK + Frais de ménage (+ ménage propriétaire)</span>,
              décomposé en HT (÷ 1,2) et TVA 20%. Le résultat net du propriétaire ={' '}
              <span className="font-mono">Montant Versé − Taxe − Ménage − Commission (− ménage proprio)</span>.
            </p>
          </CardContent>
        </Card>

        {/* Règles particulières */}
        <Card>
          <CardHeader>
            <CardTitle>Règles particulières à connaître</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>
                <strong>Airbnb & Booking.com :</strong> la taxe de séjour est forcée à 0€ (collectée et reversée
                directement par la plateforme). Un message d&apos;information s&apos;affiche lors de la génération.
              </li>
              <li>
                <strong>Séjours propriétaire :</strong> aucune commission Hello Keys (0€). Ignorés dans les imports
                Excel, inclus sans commission dans la génération Krossbooking.
              </li>
              <li>
                <strong>Réservations annulées (CANC) :</strong> exclues du relevé généré depuis Krossbooking.
              </li>
              <li>
                <strong>Taux manquant :</strong> 26% appliqué par défaut, avec un avertissement visible par l&apos;admin.
                Pensez à vérifier la fiche client si ce message apparaît.
              </li>
              <li>
                <strong>Période :</strong> pour la génération Krossbooking, une réservation est rattachée au mois de sa
                date de <em>départ</em> (check-out).
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>Questions fréquentes</CardTitle>
            <CardDescription>Les réponses aux questions qui reviennent le plus souvent.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faq.map((item, index) => (
                <AccordionItem key={index} value={`faq-${index}`}>
                  <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminCommissionExplanationPage;
