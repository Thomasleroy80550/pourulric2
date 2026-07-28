import React, { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Calculator, Download, Info, Loader2, Percent, ReceiptText } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

const rules = [
  {
    title: 'Airbnb & Booking.com',
    text: 'La taxe de séjour est forcée à 0€ (collectée et reversée directement par la plateforme). Un message d\u2019information s\u2019affiche lors de la génération.',
  },
  {
    title: 'Séjours propriétaire',
    text: 'Aucune commission Hello Keys (0€). Ignorés dans les imports Excel, inclus sans commission dans la génération Krossbooking.',
  },
  {
    title: 'Réservations annulées (CANC)',
    text: 'Exclues du relevé généré depuis Krossbooking.',
  },
  {
    title: 'Taux manquant',
    text: '26% appliqué par défaut, avec un avertissement visible par l\u2019admin. Pensez à vérifier la fiche client si ce message apparaît.',
  },
  {
    title: 'Période',
    text: 'Pour la génération Krossbooking, une réservation est rattachée au mois de sa date de départ (check-out).',
  },
];

const totalsNote =
  'Sur le relevé final : Total Facture = Commission HK + Frais de ménage (+ ménage propriétaire), décomposé en HT (÷ 1,2) et TVA 20%. Le résultat net du propriétaire = Montant Versé − Taxe − Ménage − Commission (− ménage proprio).';

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

// ===== Contenu simplifié destiné au PDF client (aucune mention d'outils internes) =====

const clientPrinciple =
  'Notre commission est calculée uniquement sur votre revenu locatif net : le loyer réellement perçu, une fois retirés les frais de la plateforme (Airbnb, Booking...), les frais de ménage et la taxe de séjour. Nous ne prenons donc jamais de commission sur des sommes qui ne vous reviennent pas.';

const clientSteps = [
  {
    title: '1. Ce que paie le voyageur',
    formula: 'Total payé = Prix du séjour + Frais de ménage + Taxe de séjour',
    detail:
      'C\u2019est le montant total réglé par le voyageur lors de sa réservation. Pour Airbnb et Booking.com, la taxe de séjour est collectée et reversée directement par la plateforme : elle apparaît donc à 0€ sur votre relevé.',
    example: `${eur(example.prixSejour)} + ${eur(example.fraisMenage)} + ${eur(example.taxeDeSejour)} = ${eur(exCA)}`,
  },
  {
    title: '2. Ce que la plateforme reverse réellement',
    formula: 'Montant versé = Total payé - Frais de la plateforme - Frais de paiement',
    detail:
      'Les plateformes (Airbnb, Booking...) prélèvent leur propre commission et des frais de paiement avant de reverser l\u2019argent. Le montant versé est ce qui arrive réellement.',
    example: `${eur(exCA)} - ${eur(example.commissionPlateforme)} - ${eur(example.fraisPaiement)} = ${eur(exMontantVerse)}`,
  },
  {
    title: '3. Votre revenu locatif net',
    formula: 'Revenu net = Montant versé - Frais de ménage - Taxe de séjour',
    detail:
      'On retire les frais de ménage (qui rémunèrent la prestation de ménage) et la taxe de séjour (qui est reversée aux autorités). Ce qui reste correspond à votre loyer net : c\u2019est sur cette base, et uniquement celle-ci, que notre commission est calculée.',
    example: `${eur(exMontantVerse)} - ${eur(example.fraisMenage)} - ${eur(example.taxeDeSejour)} = ${eur(exRevenuGenere)}`,
  },
  {
    title: '4. La commission Hello Keys',
    formula: 'Commission = Revenu net x Taux de votre contrat',
    detail:
      'Le taux appliqué est celui prévu dans votre contrat (dans cet exemple : 26%). Vos séjours personnels dans votre logement ne sont jamais commissionnés.',
    example: `${eur(exRevenuGenere)} x ${(example.taux * 100).toFixed(0)}% = ${eur(exCommission)}`,
  },
];

const clientRules = [
  {
    title: 'Taxe de séjour Airbnb & Booking.com',
    text: 'Ces plateformes collectent la taxe de séjour auprès du voyageur et la reversent elles-mêmes aux autorités. Elle apparaît donc à 0€ sur votre relevé pour ces réservations.',
  },
  {
    title: 'Vos séjours personnels',
    text: 'Lorsque vous occupez vous-même votre logement, aucune commission n\u2019est facturée sur ce séjour.',
  },
  {
    title: 'Réservations annulées',
    text: 'Les réservations annulées n\u2019apparaissent pas sur votre relevé.',
  },
  {
    title: 'Rattachement au mois',
    text: 'Une réservation est comptée dans le mois de la date de départ du voyageur (check-out).',
  },
];

const clientTotalsNote =
  'Sur votre relevé : Total de notre facture = Commission Hello Keys + Frais de ménage (montant TTC, détaillé en HT et TVA 20%). Votre résultat net = Montant versé par les plateformes - Taxe de séjour - Frais de ménage - Commission.';

const clientFaq = [
  {
    q: 'Pourquoi la commission n\u2019est-elle pas calculée sur le montant total payé par le voyageur ?',
    a: 'Parce que ce montant contient des sommes qui ne sont pas du loyer : les frais de ménage, la taxe de séjour et les frais prélevés par les plateformes. Notre commission ne porte que sur votre revenu locatif net, c\u2019est-à-dire ce qui vous revient réellement.',
  },
  {
    q: 'Pourquoi la taxe de séjour est-elle à 0€ sur mes réservations Airbnb et Booking ?',
    a: 'Airbnb et Booking.com collectent la taxe de séjour directement auprès du voyageur et la reversent eux-mêmes aux autorités. Elle ne transite donc pas par nous, c\u2019est pourquoi elle apparaît à 0€ sur votre relevé pour ces plateformes.',
  },
  {
    q: 'Quel taux de commission m\u2019est appliqué ?',
    a: 'Le taux prévu dans votre contrat de gestion. Il est identique chaque mois. En cas de doute, contactez-nous : nous vous le confirmerons immédiatement.',
  },
  {
    q: 'La commission est-elle HT ou TTC ?',
    a: 'Le montant de commission affiché sur votre relevé est TTC. Sur la facture, il est décomposé en montant HT et TVA à 20%.',
  },
  {
    q: 'Que contient le « Total de notre facture » sur mon relevé ?',
    a: 'Il regroupe la commission Hello Keys et les frais de ménage du mois. C\u2019est ce montant TTC qui vous est facturé.',
  },
  {
    q: 'Comment est calculé le « Résultat » (ce qui me revient) ?',
    a: 'Résultat = Montant versé par les plateformes - Taxe de séjour collectée - Frais de ménage - Commission Hello Keys. C\u2019est le montant net qui vous revient.',
  },
  {
    q: 'Suis-je facturé quand j\u2019occupe moi-même mon logement ?',
    a: 'Non, vos séjours personnels ne génèrent aucune commission.',
  },
];

// jsPDF n'affiche pas certains caractères unicode (− × → « ») avec les polices standard
const pdfSafe = (text: string) =>
  text
    .replace(/\u2212/g, '-')
    .replace(/\u00d7/g, 'x')
    .replace(/\u2192/g, '>')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u00ab\s?/g, '"')
    .replace(/\s?\u00bb/g, '"');

const generateCommissionPdf = () => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const BRAND: [number, number, number] = [30, 64, 175]; // bleu
  const GRAY: [number, number, number] = [90, 90, 90];
  const LIGHT_BG: [number, number, number] = [243, 244, 246];

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const sectionTitle = (title: string) => {
    ensureSpace(14);
    doc.setFillColor(...BRAND);
    doc.rect(margin, y, 1.5, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text(pdfSafe(title), margin + 4, y + 4.7);
    y += 11;
  };

  const paragraph = (text: string, options?: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number }) => {
    const size = options?.size ?? 9.5;
    const indent = options?.indent ?? 0;
    doc.setFont('helvetica', options?.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...(options?.color ?? [0, 0, 0] as [number, number, number]));
    const lines = doc.splitTextToSize(pdfSafe(text), contentWidth - indent);
    const height = lines.length * size * 0.42;
    ensureSpace(height + 2);
    doc.text(lines, margin + indent, y);
    y += height + 2;
  };

  // ===== En-tête =====
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('Comment est calculée la commission Hello Keys ?', margin, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Explication simple, étape par étape, avec un exemple chiffré.', margin, 19);
  y = 34;

  // ===== Principe =====
  const principleLines = doc.splitTextToSize(pdfSafe(clientPrinciple), contentWidth - 8);
  const boxHeight = principleLines.length * 4 + 12;
  ensureSpace(boxHeight + 4);
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(...BRAND);
  doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND);
  doc.text('Le principe en une phrase', margin + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text(principleLines, margin + 4, y + 12);
  y += boxHeight + 8;

  // ===== Étapes =====
  sectionTitle('Le calcul, étape par étape');
  paragraph(
    `Exemple utilisé tout au long du document : séjour de ${eur(example.prixSejour)}, ménage ${eur(example.fraisMenage)}, taxe de séjour ${eur(example.taxeDeSejour)}, frais de la plateforme ${eur(example.commissionPlateforme)}, frais de paiement ${eur(example.fraisPaiement)}, taux de commission ${(example.taux * 100).toFixed(0)}%.`,
    { color: GRAY },
  );
  y += 1;

  clientSteps.forEach((step) => {
    const detailLines = doc.splitTextToSize(pdfSafe(step.detail), contentWidth - 6);
    const blockHeight = 16 + detailLines.length * 4 + 6;
    ensureSpace(blockHeight);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(0, 0, 0);
    doc.text(pdfSafe(step.title), margin, y);
    y += 5.5;

    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(margin, y - 3.5, contentWidth, 6.5, 1, 1, 'F');
    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND);
    doc.text(pdfSafe(step.formula), margin + 3, y + 0.7);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(detailLines, margin, y);
    y += detailLines.length * 4 + 1;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(pdfSafe(`Exemple : ${step.example}`), margin, y);
    y += 8;
  });

  // ===== Tableau récapitulatif =====
  sectionTitle('Récapitulatif de l\u2019exemple');
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [[
      'Prix Séjour', 'Frais Ménage', 'Taxe Séjour', 'Frais Plateforme', 'Frais Paiement',
      'Total payé', 'Montant Versé', 'Revenu net', `Commission (${(example.taux * 100).toFixed(0)}%)`,
    ]],
    body: [[
      eur(example.prixSejour), eur(example.fraisMenage), eur(example.taxeDeSejour),
      eur(example.commissionPlateforme), eur(example.fraisPaiement),
      eur(exCA), eur(exMontantVerse), eur(exRevenuGenere), eur(exCommission),
    ]],
    styles: { fontSize: 7.5, halign: 'center', cellPadding: 2 },
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
    bodyStyles: { fontStyle: 'bold' },
    theme: 'grid',
  });
  y = (doc as any).lastAutoTable.finalY + 4;
  paragraph(clientTotalsNote, { color: GRAY, size: 8.5 });
  y += 3;

  // ===== Règles particulières =====
  sectionTitle('Bon à savoir');
  clientRules.forEach((rule) => {
    const lines = doc.splitTextToSize(pdfSafe(rule.text), contentWidth - 5);
    ensureSpace(5 + lines.length * 4 + 3);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    doc.text(pdfSafe(`\u2022 ${rule.title}`), margin, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(lines, margin + 5, y);
    y += lines.length * 4 + 3;
  });
  y += 3;

  // ===== FAQ =====
  sectionTitle('Questions fréquentes');
  clientFaq.forEach((item) => {
    const qLines = doc.splitTextToSize(pdfSafe(item.q), contentWidth);
    const aLines = doc.splitTextToSize(pdfSafe(item.a), contentWidth - 5);
    ensureSpace(qLines.length * 4.5 + aLines.length * 4 + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...BRAND);
    doc.text(qLines, margin, y);
    y += qLines.length * 4.5 + 1;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(aLines, margin + 5, y);
    y += aLines.length * 4 + 5;
  });

  // ===== Pied de page sur toutes les pages =====
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Hello Keys - Calcul de la commission', margin, pageHeight - 8);
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  doc.save('Calcul_Commission_Hello_Keys.pdf');
};

const AdminCommissionExplanationPage: React.FC = () => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPdf = () => {
    setIsDownloading(true);
    const toastId = toast.loading('Génération du PDF en cours...');
    try {
      generateCommissionPdf();
      toast.success('PDF téléchargé avec succès !', { id: toastId });
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      toast.error('Une erreur est survenue lors de la création du PDF.', { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
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
          <div className="shrink-0 flex flex-col items-start md:items-end gap-1">
            <Button onClick={handleDownloadPdf} disabled={isDownloading}>
              {isDownloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Télécharger le PDF client
            </Button>
            <p className="text-xs text-muted-foreground">
              Version simplifiée, sans mention d&apos;outils internes.
            </p>
          </div>
        </div>

        <div className="space-y-6">
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
                {rules.map((rule) => (
                  <li key={rule.title}>
                    <strong>{rule.title} :</strong> {rule.text}
                  </li>
                ))}
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
      </div>
    </AdminLayout>
  );
};

export default AdminCommissionExplanationPage;
