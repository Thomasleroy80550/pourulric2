import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { LiasseForm, LmnpComputation } from "./lmnp-engine";
import { LmnpSettings } from "./lmnp-api";

const M = 12; // marge horizontale

// Les liasses fiscales sont exprimées en euros, sans centimes
const fmtInt = (n: number) => Math.round(n).toLocaleString("fr-FR");

export interface ExportLiasseOptions {
  specimen?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Filigrane SPECIMEN (dessiné en premier, donc sous le contenu)
// ─────────────────────────────────────────────────────────────

function stampSpecimen(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setTextColor(225, 225, 225);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(58);
  doc.text("SPECIMEN", pageWidth / 2, pageHeight / 2 + 20, { align: "center", angle: 40 });
  doc.setFontSize(18);
  doc.text("Bilan de test — données fictives", pageWidth / 2, pageHeight / 2 + 42, {
    align: "center",
    angle: 40,
  });
  doc.setTextColor(0, 0, 0);
}

// ─────────────────────────────────────────────────────────────
// Cartouche officiel en tête de chaque formulaire
// ─────────────────────────────────────────────────────────────

function drawCartouche(doc: jsPDF, formId: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const w = pageWidth - 2 * M;
  const sep = M + w * 0.62;

  doc.setDrawColor(30);
  doc.setLineWidth(0.4);
  doc.rect(M, 10, w, 18);
  doc.line(sep, 10, sep, 28);

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("DIRECTION GÉNÉRALE DES FINANCES PUBLIQUES", M + 3, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Bénéfices industriels et commerciaux — Régime simplifié d'imposition", M + 3, 21);
  doc.text("Location meublée non professionnelle (LMNP)", M + 3, 25.5);

  const cx = sep + (M + w - sep) / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`N° ${formId}-SD`, cx, 18.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("Formulaire obligatoire (art. 53 A du CGI)", cx, 24.5, { align: "center" });
}

// ─────────────────────────────────────────────────────────────
// Bloc d'identification (déclarant / SIRET / adresse / exercice)
// ─────────────────────────────────────────────────────────────

function drawIdentification(doc: jsPDF, year: number, settings: LmnpSettings | null, startY: number): number {
  autoTable(doc, {
    startY,
    margin: { left: M, right: M },
    theme: "grid",
    styles: { fontSize: 7.5, cellPadding: 1.8, lineColor: [30, 30, 30], lineWidth: 0.2, textColor: [0, 0, 0] },
    body: [
      [
        { content: "Déclarant", styles: { fontStyle: "bold", fillColor: [235, 235, 235] as [number, number, number], cellWidth: 28 } },
        { content: settings?.declarant_name || "—" },
        { content: "N° SIRET", styles: { fontStyle: "bold", fillColor: [235, 235, 235] as [number, number, number], cellWidth: 22 } },
        { content: settings?.siret || "—", styles: { cellWidth: 42 } },
      ],
      [
        { content: "Adresse du bien", styles: { fontStyle: "bold", fillColor: [235, 235, 235] as [number, number, number] } },
        { content: settings?.property_address || "—" },
        { content: "Exercice", styles: { fontStyle: "bold", fillColor: [235, 235, 235] as [number, number, number] } },
        { content: `du 01/01/${year} au 31/12/${year}` },
      ],
    ],
  });
  return (doc as any).lastAutoTable.finalY;
}

// ─────────────────────────────────────────────────────────────
// Rendu d'un formulaire (une page)
// ─────────────────────────────────────────────────────────────

function drawFormPage(
  doc: jsPDF,
  form: LiasseForm,
  year: number,
  settings: LmnpSettings | null,
  specimen: boolean,
) {
  doc.addPage();
  if (specimen) stampSpecimen(doc);
  drawCartouche(doc, form.id);

  // Titre du formulaire
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const title = form.title.replace(/^[^—]*—\s*/, "");
  doc.text(title.toUpperCase(), pageWidth / 2, 35, { align: "center", maxWidth: pageWidth - 2 * M });

  let y = drawIdentification(doc, year, settings, 40) + 4;

  form.sections.forEach((section) => {
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      theme: "grid",
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        lineColor: [30, 30, 30],
        lineWidth: 0.2,
        textColor: [0, 0, 0],
      },
      head: [
        [
          {
            content: section.title.toUpperCase(),
            colSpan: 3,
            styles: {
              halign: "left" as const,
              fillColor: [210, 210, 210] as [number, number, number],
              textColor: [0, 0, 0] as [number, number, number],
              fontStyle: "bold" as const,
              fontSize: 8,
            },
          },
        ],
        [
          { content: "Ligne", styles: { fillColor: [235, 235, 235] as [number, number, number], textColor: [0, 0, 0] as [number, number, number], fontStyle: "bold" as const, halign: "center" as const } },
          { content: "Libellé", styles: { fillColor: [235, 235, 235] as [number, number, number], textColor: [0, 0, 0] as [number, number, number], fontStyle: "bold" as const } },
          { content: "Montant (€)", styles: { fillColor: [235, 235, 235] as [number, number, number], textColor: [0, 0, 0] as [number, number, number], fontStyle: "bold" as const, halign: "right" as const } },
        ],
      ],
      body: section.lines.map((line) => [
        { content: line.code, styles: { halign: "center" as const, cellWidth: 14 } },
        {
          content:
            line.note && line.amount === 0
              ? `${line.label} : ${line.note}`
              : line.label + (line.note ? `\n${line.note}` : ""),
        },
        {
          content: line.amount !== 0 || !line.note ? fmtInt(line.amount) : "",
          styles: { halign: "right" as const, cellWidth: 30, fontStyle: "bold" as const },
        },
      ]),
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  });
}

// ─────────────────────────────────────────────────────────────
// Export principal
// ─────────────────────────────────────────────────────────────

export function exportLiassePdf(
  computation: LmnpComputation,
  settings: LmnpSettings | null,
  options: ExportLiasseOptions = {},
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const specimen = !!options.specimen;

  // ── Page de garde
  if (specimen) stampSpecimen(doc);
  drawCartouche(doc, "2031 à 2033-E");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("LIASSE FISCALE", pageWidth / 2, 48, { align: "center" });
  doc.setFontSize(12);
  doc.text(`Location meublée non professionnelle — Exercice ${computation.year}`, pageWidth / 2, 57, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Régime réel simplifié d'imposition (RSI)", pageWidth / 2, 64, { align: "center" });

  if (specimen) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(180, 30, 30);
    doc.text("BILAN DE TEST — DONNÉES FICTIVES — POUR VALIDATION PAR L'EXPERT-COMPTABLE", pageWidth / 2, 74, {
      align: "center",
      maxWidth: pageWidth - 2 * M,
    });
    doc.setTextColor(0, 0, 0);
  }

  const idEnd = drawIdentification(doc, computation.year, settings, 82);

  autoTable(doc, {
    startY: idEnd + 6,
    margin: { left: M, right: M },
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2, lineColor: [30, 30, 30], lineWidth: 0.2, textColor: [0, 0, 0] },
    head: [
      [
        { content: "RÉCAPITULATIF DE L'EXERCICE", colSpan: 2, styles: { fillColor: [210, 210, 210] as [number, number, number], textColor: [0, 0, 0] as [number, number, number], fontStyle: "bold" as const } },
      ],
    ],
    body: [
      ["Recettes de location meublée", fmtInt(computation.grossRevenue)],
      ["Charges déductibles (hors amortissements)", fmtInt(computation.totalExpenses)],
      ["Dotations aux amortissements déduites", fmtInt(computation.deductibleAmortization + computation.deferredUsed)],
      ["Résultat fiscal de l'exercice", fmtInt(computation.taxResult)],
      ["Déficits antérieurs imputés", fmtInt(computation.deficitsUsed)],
      ["Résultat fiscal après imputation des déficits", fmtInt(computation.finalTaxResult)],
      ["Amortissements différés reportables (art. 39 C)", fmtInt(computation.newDeferredCarry)],
      ["Déficits LMNP restant à reporter", fmtInt(computation.remainingDeficits)],
    ],
    columnStyles: { 1: { halign: "right", cellWidth: 40, fontStyle: "bold" } },
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 6,
    margin: { left: M, right: M },
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2, lineColor: [30, 30, 30], lineWidth: 0.2, textColor: [0, 0, 0] },
    head: [
      [
        { content: "COMPOSITION DE LA LIASSE", colSpan: 2, styles: { fillColor: [210, 210, 210] as [number, number, number], textColor: [0, 0, 0] as [number, number, number], fontStyle: "bold" as const } },
      ],
    ],
    body: computation.forms.map((f) => [`N° ${f.id}-SD`, f.title.replace(/^[^—]*—\s*/, "")]),
    columnStyles: { 0: { cellWidth: 32, fontStyle: "bold" } },
  });

  // ── Un formulaire par page
  computation.forms.forEach((form) => drawFormPage(doc, form, computation.year, settings, specimen));

  // ── Page finale : observations + avertissement
  doc.addPage();
  if (specimen) stampSpecimen(doc);
  drawCartouche(doc, "Annexe");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("CADRE RÉSERVÉ À L'EXPERT-COMPTABLE — OBSERVATIONS", M, 40);
  doc.setDrawColor(30);
  doc.setLineWidth(0.3);
  doc.rect(M, 44, pageWidth - 2 * M, 90);

  let wy = 145;
  if (computation.warnings.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Points d'attention détectés automatiquement :", M, wy);
    wy += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    computation.warnings.forEach((w) => {
      const lines = doc.splitTextToSize(`• ${w}`, pageWidth - 2 * M);
      doc.text(lines, M, wy);
      wy += lines.length * 4 + 2;
    });
    wy += 4;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Avertissement", M, wy);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const disclaimer =
    "Ce document est une aide à la préparation de la liasse fiscale LMNP (régime réel simplifié). " +
    "Il est généré automatiquement à partir des données saisies dans l'espace Hello Keys (relevés, charges, immobilisations). " +
    "Il ne constitue pas un conseil fiscal et ne remplace pas la télétransmission officielle (EDI-TDFC) ni la validation par un expert-comptable. " +
    "Les montants sont arrondis à l'euro le plus proche, conformément aux règles des imprimés fiscaux.";
  doc.text(doc.splitTextToSize(disclaimer, pageWidth - 2 * M), M, wy + 5);

  // ── Pieds de page
  const pageCount = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  const footer = `Liasse LMNP ${computation.year} — document de travail généré par Hello Keys le ${format(new Date(), "dd/MM/yyyy", { locale: fr })} — ne pas utiliser pour la télédéclaration`;
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(110, 110, 110);
    doc.text(footer, M, pageHeight - 7);
    doc.text(`Page ${p}/${pageCount}`, pageWidth - M, pageHeight - 7, { align: "right" });
  }
  doc.setTextColor(0, 0, 0);

  const suffix = specimen ? "-SPECIMEN" : "";
  doc.save(`liasse-fiscale-lmnp-${computation.year}${suffix}.pdf`);
}
