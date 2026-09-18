import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface AgencyComparisonRow {
  agency: string;
  clients: number;
  statements: number;
  montantVerse: number;
  ca: number;
  commission: number;
  totalFacture: number;
  netProprio: number;
  nuits: number;
  reservations: number;
}

export interface MonthlyBreakdownRow {
  monthLabel: string;
  valuesByAgency: Record<string, number>;
}

// jsPDF (police standard) ne supporte pas les espaces insécables
// insérés par toLocaleString('fr-FR') : on formate manuellement.
const fmtEur = (n: number) => {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const [int, dec] = abs.toFixed(2).split('.');
  const intSpaced = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${intSpaced},${dec} EUR`;
};

const ORANGE: [number, number, number] = [234, 88, 12];
const FOOT_BG: [number, number, number] = [255, 237, 213];
const FOOT_TXT: [number, number, number] = [124, 45, 18];

export const generateAgencyComparisonPdf = (params: {
  periodLabel: string;
  rows: AgencyComparisonRow[];
  monthlyBreakdown?: {
    metricLabel: string;
    isMoney: boolean;
    agencies: string[];
    rows: MonthlyBreakdownRow[];
  };
}) => {
  const { periodLabel, rows, monthlyBreakdown } = params;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;

  // En-tête
  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, pageWidth, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('Comparatif Agence / Agence', margin, 10);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Période : ${periodLabel}`, margin, 17);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - margin, 17, {
    align: 'right',
  });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Synthèse par agence', margin, 32);

  const sum = (fn: (r: AgencyComparisonRow) => number) => rows.reduce((a, r) => a + fn(r), 0);

  autoTable(doc, {
    startY: 36,
    margin: { left: margin, right: margin },
    tableWidth: pageWidth - margin * 2,
    head: [[
      'Agence',
      'Clients',
      'Relevés',
      'Montant\nversé',
      'CA\nvoyageurs',
      'Commission',
      'Montant\nfacturé',
      'Net\npropriétaires',
      'Nuits',
      'Résa',
    ]],
    body: rows.map((r) => [
      r.agency,
      String(r.clients),
      String(r.statements),
      fmtEur(r.montantVerse),
      fmtEur(r.ca),
      fmtEur(r.commission),
      fmtEur(r.totalFacture),
      fmtEur(r.netProprio),
      String(Math.round(r.nuits)),
      String(r.reservations),
    ]),
    foot: [[
      'TOTAL',
      String(sum((r) => r.clients)),
      String(sum((r) => r.statements)),
      fmtEur(sum((r) => r.montantVerse)),
      fmtEur(sum((r) => r.ca)),
      fmtEur(sum((r) => r.commission)),
      fmtEur(sum((r) => r.totalFacture)),
      fmtEur(sum((r) => r.netProprio)),
      String(Math.round(sum((r) => r.nuits))),
      String(sum((r) => r.reservations)),
    ]],
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: ORANGE, textColor: 255, fontStyle: 'bold', halign: 'right' },
    footStyles: { fillColor: FOOT_BG, textColor: FOOT_TXT, fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'left', cellWidth: 42, fontStyle: 'bold' },
      1: { halign: 'right', cellWidth: 16 },
      2: { halign: 'right', cellWidth: 16 },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right', cellWidth: 14 },
      9: { halign: 'right', cellWidth: 14 },
    },
  });

  if (monthlyBreakdown && monthlyBreakdown.rows.length > 0) {
    const { metricLabel, isMoney, agencies, rows: mRows } = monthlyBreakdown;
    let startY = (doc as any).lastAutoTable.finalY + 12;
    if (startY > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      startY = 20;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Détail mois par mois — ${metricLabel}`, margin, startY);

    const fmtVal = (v: number) => (isMoney ? fmtEur(v) : String(Math.round(v)));
    const colTotal = (ag: string) => mRows.reduce((a, r) => a + (r.valuesByAgency[ag] || 0), 0);
    const rowTotal = (r: MonthlyBreakdownRow) =>
      agencies.reduce((a, ag) => a + (r.valuesByAgency[ag] || 0), 0);

    const columnStyles: Record<number, any> = { 0: { halign: 'left', cellWidth: 28, fontStyle: 'bold' } };
    for (let i = 1; i <= agencies.length + 1; i++) columnStyles[i] = { halign: 'right' };

    autoTable(doc, {
      startY: startY + 4,
      margin: { left: margin, right: margin },
      tableWidth: pageWidth - margin * 2,
      head: [['Mois', ...agencies, 'Total']],
      body: mRows.map((r) => [
        r.monthLabel,
        ...agencies.map((ag) => fmtVal(r.valuesByAgency[ag] || 0)),
        fmtVal(rowTotal(r)),
      ]),
      foot: [[
        'TOTAL',
        ...agencies.map((ag) => fmtVal(colTotal(ag))),
        fmtVal(mRows.reduce((a, r) => a + rowTotal(r), 0)),
      ]],
      styles: {
        fontSize: agencies.length > 6 ? 7 : 8,
        cellPadding: 2,
        overflow: 'linebreak',
        valign: 'middle',
      },
      headStyles: { fillColor: ORANGE, textColor: 255, fontStyle: 'bold', halign: 'right' },
      footStyles: { fillColor: FOOT_BG, textColor: FOOT_TXT, fontStyle: 'bold' },
      columnStyles,
    });
  }

  // Pied de page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Hello Keys — Comparatif agences — ${periodLabel} — Page ${i}/${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' }
    );
  }

  const safePeriod = periodLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  doc.save(`comparatif-agences-${safePeriod}.pdf`);
};
