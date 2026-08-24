import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface QuotePdfLine {
  description: string;
  quantity: number;
  unitPrice: number;
}

export const QUOTE_MARKER = '--- DEVIS DE RÉPARATION ---';

const formatEUR = (value: number) =>
  value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const parseAmount = (raw: string): number => {
  // "1 234,56 €" -> 1234.56 (gère les espaces insécables)
  const cleaned = raw.replace(/[^\d,.-]/g, '').replace(',', '.');
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
};

/**
 * Détecte et parse un devis de réparation inséré dans un texte (description de rapport).
 * Retourne null si aucun devis n'est présent.
 */
export function parseQuoteFromText(text: string | null | undefined): { lines: QuotePdfLine[]; vatRate: number } | null {
  if (!text || !text.includes(QUOTE_MARKER)) return null;

  const section = text.slice(text.indexOf(QUOTE_MARKER));
  const lines: QuotePdfLine[] = [];
  let vatRate = 20;

  for (const rawLine of section.split('\n')) {
    const line = rawLine.trim();

    const itemMatch = line.match(/^- (.+) — ([\d\s.,]+) x (.+?) = (.+)$/);
    if (itemMatch) {
      lines.push({
        description: itemMatch[1].trim(),
        quantity: parseAmount(itemMatch[2]),
        unitPrice: parseAmount(itemMatch[3]),
      });
      continue;
    }

    const vatMatch = line.match(/^TVA \((\d+(?:[.,]\d+)?)%\)/);
    if (vatMatch) {
      vatRate = parseAmount(vatMatch[1]);
    }
  }

  if (lines.length === 0) return null;
  return { lines, vatRate };
}

/**
 * Génère et télécharge le PDF d'un devis de réparation.
 */
export function downloadRepairQuotePdf(
  lines: QuotePdfLine[],
  vatRate: number,
  options?: { propertyName?: string; reference?: string; fileName?: string },
): void {
  const validLines = lines.filter(l => l.description.trim() !== '');
  const subtotal = validLines.reduce((sum, l) => sum + (l.quantity || 0) * (l.unitPrice || 0), 0);
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const today = new Date().toLocaleDateString('fr-FR');

  // En-tête
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('DEVIS DE RÉPARATION', 14, 22);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Hello Keys — Conciergerie', 14, 30);
  doc.text(`Date : ${today}`, pageWidth - 14, 30, { align: 'right' });

  let headerY = 30;
  if (options?.propertyName) {
    headerY += 6;
    doc.text(`Propriété : ${options.propertyName}`, 14, headerY);
  }
  if (options?.reference) {
    doc.text(`Réf. incident : #${options.reference}`, pageWidth - 14, headerY, { align: 'right' });
  }

  const lineY = headerY + 4;
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.5);
  doc.line(14, lineY, pageWidth - 14, lineY);

  // Tableau des lignes
  autoTable(doc, {
    startY: lineY + 6,
    head: [['Désignation', 'Qté', 'Prix unit. HT', 'Total HT']],
    body: validLines.map(l => [
      l.description,
      String(l.quantity),
      formatEUR(l.unitPrice),
      formatEUR(l.quantity * l.unitPrice),
    ]),
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 35 },
    },
    theme: 'striped',
  });

  // Totaux
  const finalY = (doc as any).lastAutoTable?.finalY ?? 60;
  let y = finalY + 10;
  const labelX = pageWidth - 74;
  const valueX = pageWidth - 14;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);
  doc.text('Sous-total HT :', labelX, y);
  doc.text(formatEUR(subtotal), valueX, y, { align: 'right' });
  y += 6;
  doc.text(`TVA (${vatRate}%) :`, labelX, y);
  doc.text(formatEUR(vatAmount), valueX, y, { align: 'right' });
  y += 8;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('TOTAL TTC :', labelX, y);
  doc.text(formatEUR(total), valueX, y, { align: 'right' });

  // Pied de page
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150);
  doc.text(
    'Devis estimatif établi par Hello Keys. Valable 30 jours, sous réserve de constatation sur place.',
    14,
    doc.internal.pageSize.getHeight() - 12,
  );

  doc.save(options?.fileName ?? `devis-reparation-${new Date().toISOString().slice(0, 10)}.pdf`);
}
