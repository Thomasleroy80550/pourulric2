import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface AgencyComparisonRow {
  agency: string;
  clients: number;
  statements: number;
  montantVerse: number;
  ca: number;
  commission: number;
  netProprio: number;
  nuits: number;
  reservations: number;
}

export interface MonthlyBreakdownRow {
  monthLabel: string;
  valuesByAgency: Record<string, number>;
}

const fmtEur = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

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

  // En-tête
  doc.setFillColor(234, 88, 12); // orange
  doc.rect(0, 0, pageWidth, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('Comparatif Agence / Agence', 14, 10);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Période : ${periodLabel}`, 14, 17);
  doc.text(
    `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
    pageWidth - 14,
    17,
    { align: 'right' }
  );

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Synthèse par agence', 14, 32);

  autoTable(doc, {
    startY: 36,
    head: [[
      'Agence', 'Clients', 'Relevés', 'Montant versé', 'CA voyageurs',
      'Commission', 'Net propriétaires', 'Nuits', 'Réservations',
    ]],
    body: rows.map((r) => [
      r.agency,
      String(r.clients),
      String(r.statements),
      fmtEur(r.montantVerse),
      fmtEur(r.ca),
      fmtEur(r.commission),
      fmtEur(r.netProprio),
      String(Math.round(r.nuits)),
      String(r.reservations),
    ]),
    foot: [[
      'TOTAL',
      String(rows.reduce((a, r) => a + r.clients, 0)),
      String(rows.reduce((a, r) => a + r.statements, 0)),
      fmtEur(rows.reduce((a, r) => a + r.montantVerse, 0)),
      fmtEur(rows.reduce((a, r) => a + r.ca, 0)),
      fmtEur(rows.reduce((a, r) => a + r.commission, 0)),
      fmtEur(rows.reduce((a, r) => a + r.netProprio, 0)),
      String(Math.round(rows.reduce((a, r) => a + r.nuits, 0))),
      String(rows.reduce((a, r) => a + r.reservations, 0)),
    ]],
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [255, 237, 213], textColor: [124, 45, 18], fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' },
      4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' },
      7: { halign: 'right' }, 8: { halign: 'right' },
    },
  });

  if (monthlyBreakdown && monthlyBreakdown.rows.length > 0) {
    const startY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Détail mois par mois — ${monthlyBreakdown.metricLabel}`, 14, startY);

    const fmtVal = (v: number) =>
      monthlyBreakdown.isMoney ? fmtEur(v) : String(Math.round(v));

    autoTable(doc, {
      startY: startY + 4,
      head: [['Mois', ...monthlyBreakdown.agencies, 'Total']],
      body: monthlyBreakdown.rows.map((r) => {
        const total = monthlyBreakdown.agencies.reduce(
          (a, ag) => a + (r.valuesByAgency[ag] || 0), 0
        );
        return [
          r.monthLabel,
          ...monthlyBreakdown.agencies.map((ag) => fmtVal(r.valuesByAgency[ag] || 0)),
          fmtVal(total),
        ];
      }),
      foot: [[
        'TOTAL',
        ...monthlyBreakdown.agencies.map((ag) =>
          fmtVal(monthlyBreakdown.rows.reduce((a, r) => a + (r.valuesByAgency[ag] || 0), 0))
        ),
        fmtVal(
          monthlyBreakdown.rows.reduce(
            (a, r) => a + monthlyBreakdown.agencies.reduce((s, ag) => s + (r.valuesByAgency[ag] || 0), 0),
            0
          )
        ),
      ]],
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [255, 237, 213], textColor: [124, 45, 18], fontStyle: 'bold' },
      columnStyles: Object.fromEntries(
        monthlyBreakdown.agencies.map((_, i) => [i + 1, { halign: 'right' as const }])
          .concat([[monthlyBreakdown.agencies.length + 1, { halign: 'right' as const }]])
      ),
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
