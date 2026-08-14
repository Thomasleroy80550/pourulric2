import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { LmnpComputation } from "./lmnp-engine";
import { LmnpSettings } from "./lmnp-api";

const formatEuro = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export function exportLiassePdf(computation: LmnpComputation, settings: LmnpSettings | null) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // ── Page de garde
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Liasse fiscale LMNP", pageWidth / 2, 40, { align: "center" });
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text(`Exercice ${computation.year} — Régime réel simplifié`, pageWidth / 2, 52, { align: "center" });

  doc.setFontSize(11);
  const infos = [
    `Déclarant : ${settings?.declarant_name || "—"}`,
    `SIRET : ${settings?.siret || "—"}`,
    `Bien exploité : ${settings?.property_address || "—"}`,
    `Début d'activité : ${settings?.activity_start_date ? format(new Date(settings.activity_start_date), "dd/MM/yyyy", { locale: fr }) : "—"}`,
    `Document généré le ${format(new Date(), "dd MMMM yyyy", { locale: fr })} via Hello Keys`,
  ];
  infos.forEach((line, idx) => doc.text(line, pageWidth / 2, 72 + idx * 8, { align: "center" }));

  autoTable(doc, {
    startY: 120,
    head: [["Synthèse de l'exercice", "Montant"]],
    body: [
      ["Recettes de location meublée", formatEuro(computation.grossRevenue)],
      ["Charges déductibles (hors amortissements)", formatEuro(computation.totalExpenses)],
      ["Dotations aux amortissements déduites", formatEuro(computation.deductibleAmortization + computation.deferredUsed)],
      ["Résultat fiscal de l'exercice", formatEuro(computation.taxResult)],
      ["Résultat fiscal après déficits antérieurs", formatEuro(computation.finalTaxResult)],
      ["Amortissements différés reportables (art. 39 C)", formatEuro(computation.newDeferredCarry)],
      ["Déficits LMNP restant à reporter", formatEuro(computation.remainingDeficits)],
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [30, 41, 59] },
  });

  // ── Un formulaire par page
  computation.forms.forEach((form) => {
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(form.title, 14, 20, { maxWidth: pageWidth - 28 });

    let y = 34;
    form.sections.forEach((section) => {
      autoTable(doc, {
        startY: y,
        head: [[{ content: section.title, colSpan: 3 }]],
        body: section.lines.map((line) => [
          line.code,
          line.note && line.amount === 0 ? `${line.label} : ${line.note}` : line.label + (line.note ? `\n${line.note}` : ""),
          line.amount !== 0 || !line.note ? formatEuro(line.amount) : "",
        ]),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [30, 41, 59] },
        columnStyles: {
          0: { cellWidth: 18 },
          2: { cellWidth: 38, halign: "right" },
        },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    });
  });

  // ── Avertissement
  doc.addPage();
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Avertissement", 14, 20);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const disclaimer =
    "Ce document est une aide à la préparation de votre liasse fiscale LMNP (régime réel simplifié). " +
    "Il est généré automatiquement à partir des données saisies dans votre espace Hello Keys (relevés, charges, immobilisations). " +
    "Il ne constitue pas un conseil fiscal et ne remplace pas la télétransmission officielle (EDI-TDFC) ni la validation par un expert-comptable. " +
    "Vérifiez l'exactitude des montants avant tout dépôt auprès de l'administration fiscale.";
  doc.text(doc.splitTextToSize(disclaimer, pageWidth - 28), 14, 30);

  if (computation.warnings.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Points d'attention :", 14, 60);
    doc.setFont("helvetica", "normal");
    let wy = 68;
    computation.warnings.forEach((w) => {
      const lines = doc.splitTextToSize(`• ${w}`, pageWidth - 28);
      doc.text(lines, 14, wy);
      wy += lines.length * 5 + 3;
    });
  }

  doc.save(`liasse-fiscale-lmnp-${computation.year}.pdf`);
}
