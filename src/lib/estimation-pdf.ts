import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UserProfile } from '@/lib/profile-api';
import { computeEstimation, formatEUR } from '@/lib/estimation-data';

const NAVY: [number, number, number] = [15, 40, 71];
const BLUE: [number, number, number] = [37, 99, 235];
const LIGHT: [number, number, number] = [241, 245, 249];
const GREY: [number, number, number] = [100, 116, 139];

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const response = await fetch('/logo.png');
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function downloadEstimationPdf(profile: UserProfile): Promise<void> {
  const est = computeEstimation(profile);
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 18;
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const logo = await loadLogoDataUrl();

  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '—';
  const propertyLocation = [profile.property_zip_code, profile.property_city].filter(Boolean).join(' ');

  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(M, H - 16, W - M, H - 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GREY);
    doc.text('Hello Keys — Conciergerie de location saisonnière — 14 rue Carnot, 80550 Le Crotoy', M, H - 11);
    doc.text(`Réf. ${est.reference}`, M, H - 7);
    doc.text(`Page ${pageNum} / ${totalPages}`, W - M, H - 11, { align: 'right' });
    doc.text(today, W - M, H - 7, { align: 'right' });
  };

  const sectionTitle = (title: string, y: number): number => {
    doc.setFillColor(...BLUE);
    doc.rect(M, y - 3.2, 1.4, 4.4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    doc.text(title, M + 4.5, y);
    return y + 7;
  };

  // ============ PAGE 1 ============

  // --- En-tête ---
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 42, 'F');
  doc.setFillColor(...BLUE);
  doc.rect(0, 42, W, 1.6, 'F');

  if (logo) {
    try {
      const props = doc.getImageProperties(logo);
      const logoH = 12;
      const logoW = (props.width / props.height) * logoH;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(M - 3, 9, logoW + 6, logoH + 6, 2.5, 2.5, 'F');
      doc.addImage(logo, 'PNG', M, 12, logoW, logoH);
    } catch { /* sans logo */ }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('RAPPORT D\'ESTIMATION', W - M, 16, { align: 'right' });
  doc.text('DE REVENUS LOCATIFS', W - M, 23, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 200, 230);
  doc.text('Location saisonnière meublée de courte durée', W - M, 30, { align: 'right' });
  doc.text(`Réf. ${est.reference}   •   Établi le ${today}`, W - M, 36, { align: 'right' });

  let y = 54;

  // --- Parties ---
  const colW = (W - M * 2 - 6) / 2;
  const infoBlock = (x: number, title: string, rows: [string, string][]) => {
    const h = 10 + rows.length * 6;
    doc.setFillColor(...LIGHT);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, colW, h, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...BLUE);
    doc.text(title.toUpperCase(), x + 5, y + 6.5);
    doc.setFontSize(9.5);
    rows.forEach(([label, value], i) => {
      const rowY = y + 13 + i * 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GREY);
      doc.text(label, x + 5, rowY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      const v = doc.splitTextToSize(value, colW - 32)[0] || '—';
      doc.text(v, x + colW - 5, rowY, { align: 'right' });
    });
    return h;
  };

  const ownerRows: [string, string][] = [
    ['Nom', fullName],
    ['Email', profile.email || '—'],
    ['Téléphone', profile.phone_number || '—'],
  ];
  const propertyRows: [string, string][] = [
    ['Adresse', profile.property_address || '—'],
    ['Ville', propertyLocation || '—'],
    ['Type', 'Location saisonnière'],
  ];
  const blockH = Math.max(infoBlock(M, 'Propriétaire', ownerRows), infoBlock(M + colW + 6, 'Bien estimé', propertyRows));
  y += blockH + 12;

  // --- Synthèse chiffrée ---
  y = sectionTitle('Synthèse de l\'estimation', y);

  // Grande carte : revenu brut annuel
  doc.setFillColor(...NAVY);
  doc.roundedRect(M, y, W - M * 2, 30, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 200, 230);
  doc.text('REVENU LOCATIF BRUT ANNUEL ESTIMÉ', M + 7, y + 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text(formatEUR(est.gross), M + 7, y + 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 200, 230);
  doc.text('Fourchette estimée', W - M - 7, y + 9, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(`${formatEUR(est.low)} — ${formatEUR(est.high)}`, W - M - 7, y + 17, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(180, 200, 230);
  doc.text('(hypothèses basse / haute ±10%)', W - M - 7, y + 23, { align: 'right' });
  y += 36;

  // 3 cartes indicateurs
  const cardW = (W - M * 2 - 8) / 3;
  const cards: [string, string][] = [
    ['Moyenne mensuelle brute', formatEUR(est.grossMonthly)],
    [`Frais de gestion (${est.commissionRate}% TTC)`, `- ${formatEUR(est.commissionAmount)}`],
    ['Revenu net annuel estimé', formatEUR(est.net)],
  ];
  cards.forEach(([label, value], i) => {
    const x = M + i * (cardW + 4);
    doc.setFillColor(...LIGHT);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, cardW, 20, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GREY);
    doc.text(label, x + 4, y + 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    doc.text(value, x + 4, y + 15.5);
  });
  y += 30;

  // --- Tableau détaillé ---
  y = sectionTitle('Détail du calcul', y);

  const detailBody: string[][] = [
    ['Revenus locatifs bruts annuels estimés', formatEUR(est.gross)],
    ['Moyenne mensuelle brute', formatEUR(est.grossMonthly)],
    [`Frais de gestion Hello Keys (${est.commissionRate}% TTC)`, `- ${formatEUR(est.commissionAmount)}`],
    ['Revenu net propriétaire annuel estimé', formatEUR(est.net)],
    ['Revenu net propriétaire mensuel moyen', formatEUR(est.netMonthly)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Poste', 'Montant']],
    body: detailBody,
    styles: { fontSize: 9.5, cellPadding: 3, textColor: [30, 41, 59] },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: { 1: { halign: 'right', cellWidth: 48, fontStyle: 'bold' } },
    theme: 'grid',
    margin: { left: M, right: M },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === detailBody.length - 2) {
        data.cell.styles.fillColor = [219, 234, 254];
        data.cell.styles.textColor = NAVY;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 5;

  // Note sur la méthode de calcul de la commission
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...GREY);
  const commissionNote = doc.splitTextToSize(
    `Le taux de ${est.commissionRate}% est un taux TTC (TVA 20% incluse). Conformément à votre contrat, la commission ` +
      'Hello Keys est calculée sur votre revenu locatif net : le loyer réellement perçu, après déduction des frais de ' +
      'plateforme (Airbnb, Booking...), des frais de ménage et de la taxe de séjour. Vos séjours personnels ne sont jamais commissionnés.',
    W - M * 2,
  );
  doc.text(commissionNote, M, y);
  y += commissionNote.length * 3.6 + 8;

  // --- Détails et remarques ---
  if (profile.estimation_details) {
    y = sectionTitle('Remarques de nos experts', y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(profile.estimation_details, W - M * 2);
    const maxLines = Math.floor((H - 30 - y) / 4.6);
    doc.text(lines.slice(0, maxLines), M, y);
  }

  // ============ PAGE 2 ============
  doc.addPage();
  y = 24;

  y = sectionTitle('Répartition saisonnière prévisionnelle', y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  doc.text(
    'Répartition indicative des revenus bruts sur l\'année, selon la saisonnalité observée sur le marché local.',
    M, y,
  );
  y += 8;

  // --- Graphique en barres ---
  const chartX = M;
  const chartW = W - M * 2;
  const chartH = 48;
  const chartY = y;
  const maxAmount = Math.max(...est.monthlyBreakdown.map(m => m.amount), 1);
  const barGap = 3;
  const barW = (chartW - barGap * 11) / 12;

  // Lignes de grille
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  for (let i = 0; i <= 4; i++) {
    const gy = chartY + chartH - (chartH * i) / 4;
    doc.line(chartX, gy, chartX + chartW, gy);
  }

  est.monthlyBreakdown.forEach((m, i) => {
    const h = (m.amount / maxAmount) * (chartH - 6);
    const x = chartX + i * (barW + barGap);
    const isPeak = m.weight >= 0.15;
    doc.setFillColor(...(isPeak ? BLUE : ([148, 184, 235] as [number, number, number])));
    doc.roundedRect(x, chartY + chartH - h, barW, h, 1, 1, 'F');
    // Montant au-dessus
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...NAVY);
    doc.text(`${Math.round(m.amount / 100) / 10}k`, x + barW / 2, chartY + chartH - h - 1.5, { align: 'center' });
    // Mois en dessous
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GREY);
    doc.text(m.short, x + barW / 2, chartY + chartH + 4.5, { align: 'center' });
  });
  y = chartY + chartH + 12;

  // --- Tableau mensuel ---
  autoTable(doc, {
    startY: y,
    head: [['Mois', 'Part de l\'année', 'Revenu brut estimé']],
    body: est.monthlyBreakdown.map(m => [m.month, `${Math.round(m.weight * 100)} %`, formatEUR(m.amount)]),
    foot: [['Total annuel', '100 %', formatEUR(est.gross)]],
    styles: { fontSize: 8.5, cellPadding: 2.2, textColor: [30, 41, 59] },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    footStyles: { fillColor: [219, 234, 254], textColor: NAVY, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      1: { halign: 'center', cellWidth: 40 },
      2: { halign: 'right', cellWidth: 50 },
    },
    theme: 'grid',
    margin: { left: M, right: M },
  });
  y = (doc as any).lastAutoTable.finalY + 12;

  // --- Méthodologie ---
  y = sectionTitle('Méthodologie', y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const methodo = doc.splitTextToSize(
    'Cette estimation est établie par Hello Keys à partir : (1) des caractéristiques du bien (localisation, capacité, ' +
      'prestations) ; (2) des données de marché de la location saisonnière dans le secteur (taux d\'occupation, prix ' +
      'moyens par nuitée, saisonnalité) ; (3) de l\'historique de performance des biens comparables gérés par notre ' +
      'conciergerie. La répartition mensuelle présentée ci-dessus est indicative et reflète la saisonnalité type du marché local.',
    W - M * 2,
  );
  doc.text(methodo, M, y);
  y += methodo.length * 4.4 + 10;

  // --- Avertissement ---
  const disclaimer = doc.splitTextToSize(
    'Document d\'information établi à titre indicatif à la demande du propriétaire, notamment en vue de la constitution ' +
      'd\'un dossier de financement bancaire. Les montants indiqués sont des estimations prévisionnelles et ne constituent ' +
      'ni une garantie de revenus, ni un engagement contractuel de la part de Hello Keys. Les revenus réels peuvent varier ' +
      'selon la saisonnalité, l\'état du marché, la réglementation locale et la disponibilité du bien.',
    W - M * 2 - 10,
  );
  const boxH = disclaimer.length * 3.9 + 12;
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(251, 191, 36);
  doc.setLineWidth(0.4);
  doc.roundedRect(M, y, W - M * 2, boxH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(180, 83, 9);
  doc.text('AVERTISSEMENT', M + 5, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(disclaimer, M + 5, y + 11);
  y += boxH + 12;

  // --- Cachet / signature ---
  if (y < H - 50) {
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(W - M - 62, y, 62, 26, 2, 2, 'D');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    doc.text('Hello Keys — Conciergerie', W - M - 57, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GREY);
    doc.text('14 rue Carnot, 80550 Le Crotoy', W - M - 57, y + 12.5);
    doc.text(`Fait le ${today}`, W - M - 57, y + 17.5);
  }

  // --- Pieds de page ---
  doc.setPage(1);
  drawFooter(1, 2);
  doc.setPage(2);
  drawFooter(2, 2);

  doc.save(`estimation-hello-keys-${est.reference}.pdf`);
}
