import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { LiasseForm, LmnpComputation } from "./lmnp-engine";
import { LmnpSettings } from "./lmnp-api";

// ── Constantes de mise en page (A4 portrait : 210 × 297 mm)
const M = 14; // marge gauche/droite
const HEADER_TOP = 10;
const HEADER_HEIGHT = 18;
const CONTENT_TOP = HEADER_TOP + HEADER_HEIGHT; // 28
const FOOTER_H = 12;
const GREY_DARK: [number, number, number] = [80, 80, 80];
const GREY_SECTION: [number, number, number] = [215, 215, 215];
const GREY_COL: [number, number, number] = [238, 238, 238];

// Les liasses fiscales sont exprimées en euros, sans centimes
const fmtInt = (n: number) => Math.round(n).toLocaleString("fr-FR");

export interface ExportLiasseOptions {
  specimen?: boolean;
}

const pageW = (doc: jsPDF) => doc.internal.pageSize.getWidth();
const pageH = (doc: jsPDF) => doc.internal.pageSize.getHeight();
const contentW = (doc: jsPDF) => pageW(doc) - 2 * M;

// ─────────────────────────────────────────────────────────────
// Cartouche officiel (dessiné en tête de chaque page)
// ─────────────────────────────────────────────────────────────

function drawCartouche(doc: jsPDF, formId: string) {
  const w = contentW(doc);
  const sep = M + w * 0.62;
  const bottom = HEADER_TOP + HEADER_HEIGHT;

  doc.setDrawColor(40);
  doc.setLineWidth(0.35);
  doc.rect(M, HEADER_TOP, w, HEADER_HEIGHT);
  doc.line(sep, HEADER_TOP, sep, bottom);

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("DIRECTION GÉNÉRALE DES FINANCES PUBLIQUES", M + 3, HEADER_TOP + 5.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  doc.text("Bénéfices industriels et commerciaux — Régime simplifié d'imposition", M + 3, HEADER_TOP + 10.5);
  doc.text("Location meublée non professionnelle (LMNP)", M + 3, HEADER_TOP + 14.5);

  // N° de formulaire : taille de police ajustée pour tenir dans la case
  const cellW = M + w - sep;
  const cx = sep + cellW / 2;
  const label = `N° ${formId}-SD`;
  doc.setFont("helvetica", "bold");
  let fs = 12;
  doc.setFontSize(fs);
  while (doc.getTextWidth(label) > cellW - 6 && fs > 7) {
    fs -= 0.5;
    doc.setFontSize(fs);
  }
  doc.text(label, cx, HEADER_TOP + 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  doc.text("Formulaire obligatoire (art. 53 A du CGI)", cx, HEADER_TOP + 14, { align: "center" });
}

// ─────────────────────────────────────────────────────────────
// Titre centré : renvoie la position Y après le titre
// ─────────────────────────────────────────────────────────────

function drawTitle(doc: jsPDF, text: string, y: number, fontSize = 10): number {
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fontSize);
  const lines: string[] = doc.splitTextToSize(text, contentW(doc));
  const lineH = fontSize * 0.42;
  lines.forEach((line, i) => {
    doc.text(line, pageW(doc) / 2, y + i * lineH, { align: "center" });
  });
  return y + (lines.length - 1) * lineH + 4;
}

// ─────────────────────────────────────────────────────────────
// Bloc d'identification : renvoie le Y final
// ─────────────────────────────────────────────────────────────

function drawIdentification(doc: jsPDF, year: number, settings: LmnpSettings | null, startY: number): number {
  const labelStyle = {
    fontStyle: "bold" as const,
    fillColor: GREY_COL,
  };
  autoTable(doc, {
    startY,
    margin: { left: M, right: M },
    theme: "grid",
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      lineColor: 40,
      lineWidth: 0.2,
      textColor: 0,
      overflow: "linebreak",
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 20 },
      3: { cellWidth: 44 },
    },
    body: [
      [
        { content: "Déclarant", styles: labelStyle },
        { content: settings?.declarant_name || "—" },
        { content: "SIRET", styles: labelStyle },
        { content: settings?.siret || "—" },
      ],
      [
        { content: "Adresse du bien", styles: labelStyle },
        { content: settings?.property_address || "—" },
        { content: "Exercice", styles: labelStyle },
        { content: `01/01/${year} — 31/12/${year}` },
      ],
    ],
  });
  return (doc as any).lastAutoTable.finalY;
}

// ─────────────────────────────────────────────────────────────
// Tableau de section (avec reprise du cartouche en cas de saut de page)
// ─────────────────────────────────────────────────────────────

function drawSectionTable(
  doc: jsPDF,
  formId: string,
  title: string,
  rows: (string | number)[][],
  startY: number,
  amountColWidth = 32,
): number {
  autoTable(doc, {
    startY,
    margin: { left: M, right: M, top: CONTENT_TOP + 6, bottom: FOOTER_H },
    theme: "grid",
    rowPageBreak: "avoid",
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      lineColor: 40,
      lineWidth: 0.2,
      textColor: 0,
      overflow: "linebreak",
      valign: "middle",
    },
    head: [
      [
        {
          content: title.toUpperCase(),
          colSpan: 3,
          styles: { halign: "left" as const, fillColor: GREY_SECTION, textColor: 0, fontStyle: "bold" as const, fontSize: 8 },
        },
      ],
      [
        { content: "Ligne", styles: { fillColor: GREY_COL, textColor: 0, fontStyle: "bold" as const, halign: "center" as const } },
        { content: "Libellé", styles: { fillColor: GREY_COL, textColor: 0, fontStyle: "bold" as const } },
        { content: "Montant (€)", styles: { fillColor: GREY_COL, textColor: 0, fontStyle: "bold" as const, halign: "right" as const } },
      ],
    ],
    body: rows,
    columnStyles: {
      0: { cellWidth: 15, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: amountColWidth, halign: "right", fontStyle: "bold" },
    },
    didDrawPage: (data) => {
      // Reprise du cartouche sur les pages de continuation
      if (data.pageNumber > 1) {
        drawCartouche(doc, formId);
      }
    },
  });
  return (doc as any).lastAutoTable.finalY;
}

// ─────────────────────────────────────────────────────────────
// Page d'un formulaire
// ─────────────────────────────────────────────────────────────

function drawFormPage(doc: jsPDF, form: LiasseForm, year: number, settings: LmnpSettings | null) {
  doc.addPage();
  drawCartouche(doc, form.id);

  const title = form.title.replace(/^[^—]*—\s*/, "").toUpperCase();
  let y = drawTitle(doc, title, CONTENT_TOP + 8);
  y = drawIdentification(doc, year, settings, y + 2) + 5;

  form.sections.forEach((section) => {
    const rows = section.lines.map((line) => [
      line.code,
      line.note && line.amount === 0
        ? `${line.label} : ${line.note}`
        : line.label + (line.note ? `\n${line.note}` : ""),
      line.amount !== 0 || !line.note ? fmtInt(line.amount) : "",
    ]);
    // Si la section ne tient plus sur la page, on passe à la suivante
    if (y > pageH(doc) - FOOTER_H - 30) {
      doc.addPage();
      drawCartouche(doc, form.id);
      y = CONTENT_TOP + 8;
    }
    y = drawSectionTable(doc, form.id, section.title, rows, y) + 5;
  });
}

// ─────────────────────────────────────────────────────────────
// Filigrane SPECIMEN (appliqué en fin de génération, en transparence)
// ─────────────────────────────────────────────────────────────

function applySpecimenWatermark(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    (doc as any).saveGraphicsState();
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.13 }));
    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(60);
    doc.text("SPECIMEN", pageW(doc) / 2, pageH(doc) / 2 + 25, { align: "center", angle: 45 });
    doc.setFontSize(16);
    doc.text("Bilan de test — données fictives", pageW(doc) / 2, pageH(doc) / 2 + 45, { align: "center", angle: 45 });
    (doc as any).restoreGraphicsState();
  }
  doc.setTextColor(0, 0, 0);
}

// ─────────────────────────────────────────────────────────────
// Pieds de page
// ─────────────────────────────────────────────────────────────

function applyFooters(doc: jsPDF, year: number) {
  const pageCount = doc.getNumberOfPages();
  const footer = `Liasse LMNP ${year} — document de travail généré par Hello Keys le ${format(new Date(), "dd/MM/yyyy", { locale: fr })} — ne pas utiliser pour la télédéclaration`;
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(GREY_DARK[0], GREY_DARK[1], GREY_DARK[2]);
    doc.text(footer, M, pageH(doc) - 6);
    doc.text(`Page ${p}/${pageCount}`, pageW(doc) - M, pageH(doc) - 6, { align: "right" });
  }
  doc.setTextColor(0, 0, 0);
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
  const specimen = !!options.specimen;

  // ═══ PAGE DE GARDE ═══
  drawCartouche(doc, "LIASSE RSI");

  let y = CONTENT_TOP + 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("LIASSE FISCALE", pageW(doc) / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(11);
  doc.text(`Location meublée non professionnelle — Exercice ${computation.year}`, pageW(doc) / 2, y, { align: "center" });
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("Régime réel simplifié d'imposition (RSI)", pageW(doc) / 2, y, { align: "center" });
  y += 8;

  if (specimen) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(180, 30, 30);
    const notice: string[] = doc.splitTextToSize(
      "BILAN DE TEST — DONNÉES FICTIVES — POUR VALIDATION PAR L'EXPERT-COMPTABLE",
      contentW(doc),
    );
    notice.forEach((line, i) => doc.text(line, pageW(doc) / 2, y + i * 4.5, { align: "center" }));
    doc.setTextColor(0, 0, 0);
    y += notice.length * 4.5 + 4;
  }

  y = drawIdentification(doc, computation.year, settings, y) + 6;

  // Récapitulatif
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, bottom: FOOTER_H },
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2, lineColor: 40, lineWidth: 0.2, textColor: 0 },
    head: [
      [
        { content: "RÉCAPITULATIF DE L'EXERCICE", colSpan: 2, styles: { fillColor: GREY_SECTION, textColor: 0, fontStyle: "bold" as const } },
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
    columnStyles: { 0: { cellWidth: "auto" }, 1: { halign: "right", cellWidth: 38, fontStyle: "bold" } },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Composition de la liasse
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, bottom: FOOTER_H },
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2, lineColor: 40, lineWidth: 0.2, textColor: 0 },
    head: [
      [
        { content: "COMPOSITION DE LA LIASSE", colSpan: 2, styles: { fillColor: GREY_SECTION, textColor: 0, fontStyle: "bold" as const } },
      ],
    ],
    body: computation.forms.map((f) => [`N° ${f.id}-SD`, f.title.replace(/^[^—]*—\s*/, "")]),
    columnStyles: { 0: { cellWidth: 34, fontStyle: "bold" }, 1: { cellWidth: "auto" } },
  });

  // ═══ FORMULAIRES (une page chacun) ═══
  computation.forms.forEach((form) => drawFormPage(doc, form, computation.year, settings));

  // ═══ PAGE FINALE : OBSERVATIONS + AVERTISSEMENT ═══
  doc.addPage();
  drawCartouche(doc, "ANNEXE");

  y = CONTENT_TOP + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("CADRE RÉSERVÉ À L'EXPERT-COMPTABLE — OBSERVATIONS", M, y);
  y += 4;
  doc.setDrawColor(40);
  doc.setLineWidth(0.3);
  doc.rect(M, y, contentW(doc), 80);
  y += 80 + 10;

  if (computation.warnings.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("Points d'attention détectés automatiquement :", M, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    computation.warnings.forEach((w) => {
      const lines: string[] = doc.splitTextToSize(`• ${w}`, contentW(doc));
      doc.text(lines, M, y);
      y += lines.length * 3.6 + 2;
    });
    y += 5;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Avertissement", M, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const disclaimer =
    "Ce document est une aide à la préparation de la liasse fiscale LMNP (régime réel simplifié). " +
    "Il est généré automatiquement à partir des données saisies dans l'espace Hello Keys (relevés, charges, immobilisations). " +
    "Il ne constitue pas un conseil fiscal et ne remplace pas la télétransmission officielle (EDI-TDFC) ni la validation par un expert-comptable. " +
    "Les montants sont arrondis à l'euro le plus proche, conformément aux règles des imprimés fiscaux.";
  doc.text(doc.splitTextToSize(disclaimer, contentW(doc)), M, y);

  // ═══ FINITIONS ═══
  if (specimen) applySpecimenWatermark(doc);
  applyFooters(doc, computation.year);

  const suffix = specimen ? "-SPECIMEN" : "";
  doc.save(`liasse-fiscale-lmnp-${computation.year}${suffix}.pdf`);
}
