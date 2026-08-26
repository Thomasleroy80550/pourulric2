import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UserProfile } from '@/lib/profile-api';

const BRAND: [number, number, number] = [30, 58, 95];

const formatEUR = (value: number) =>
  value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export const getEstimationReference = (profile: UserProfile) =>
  `EST-${new Date().getFullYear()}-${profile.id.slice(0, 6).toUpperCase()}`;

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
  const gross = profile.estimated_revenue ?? 0;
  const monthly = gross / 12;
  const commissionRate = profile.commission_rate ?? null;
  const commissionAmount = commissionRate !== null ? gross * (commissionRate / 100) : null;
  const net = commissionAmount !== null ? gross - commissionAmount : null;

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const today = new Date().toLocaleDateString('fr-FR');
  const reference = getEstimationReference(profile);

  // ----- Bandeau d'en-tête -----
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageWidth, 34, 'F');

  const logo = await loadLogoDataUrl();
  if (logo) {
    try {
      const props = doc.getImageProperties(logo);
      const logoH = 14;
      const logoW = (props.width / props.height) * logoH;
      // Pastille blanche derrière le logo pour la lisibilité
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin - 2, 8, logoW + 4, logoH + 4, 2, 2, 'F');
      doc.addImage(logo, 'PNG', margin, 10, logoW, logoH);
    } catch {
      // logo illisible : on continue sans
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('ESTIMATION DE REVENUS LOCATIFS', pageWidth - margin, 16, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Location saisonnière — gestion par conciergerie Hello Keys', pageWidth - margin, 22, { align: 'right' });
  doc.text(`Réf. ${reference}  •  Établie le ${today}`, pageWidth - margin, 28, { align: 'right' });

  // ----- Blocs propriétaire / bien -----
  let y = 44;
  const colWidth = (pageWidth - margin * 2 - 8) / 2;

  const ownerLines = [
    `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '—',
    profile.email || '—',
    profile.phone_number || '',
  ].filter(Boolean);

  const propertyLines = [
    profile.property_address || '—',
    [profile.property_zip_code, profile.property_city].filter(Boolean).join(' '),
  ].filter(Boolean);

  const drawInfoBlock = (x: number, title: string, lines: string[]) => {
    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(220, 225, 232);
    doc.roundedRect(x, y, colWidth, 30, 2, 2, 'FD');
    doc.setTextColor(...BRAND);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(title.toUpperCase(), x + 5, y + 7);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    lines.slice(0, 3).forEach((line, i) => {
      doc.text(doc.splitTextToSize(line, colWidth - 10)[0], x + 5, y + 14 + i * 5.5);
    });
  };

  drawInfoBlock(margin, 'Propriétaire', ownerLines);
  drawInfoBlock(margin + colWidth + 8, 'Bien concerné', propertyLines);

  y += 40;

  // ----- Chiffre clé -----
  doc.setFillColor(...BRAND);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 24, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Revenu locatif brut annuel estimé', margin + 6, y + 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(formatEUR(gross), margin + 6, y + 19);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`soit environ ${formatEUR(monthly)} / mois en moyenne`, pageWidth - margin - 6, y + 15, { align: 'right' });

  y += 32;

  // ----- Tableau détaillé -----
  const body: string[][] = [
    ['Revenus locatifs bruts annuels estimés', formatEUR(gross)],
    ['Moyenne mensuelle estimée', formatEUR(monthly)],
  ];
  if (commissionRate !== null && commissionAmount !== null && net !== null) {
    body.push([`Frais de gestion Hello Keys (${commissionRate}%)`, `- ${formatEUR(commissionAmount)}`]);
    body.push(['Revenu net propriétaire estimé (avant charges et impôts)', formatEUR(net)]);
  }

  autoTable(doc, {
    startY: y,
    head: [['Détail de l\'estimation', 'Montant']],
    body,
    styles: { fontSize: 10, cellPadding: 3.5 },
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right', cellWidth: 45, fontStyle: 'bold' } },
    theme: 'striped',
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable?.finalY ?? y + 40;
  y += 10;

  // ----- Détails et remarques -----
  if (profile.estimation_details) {
    doc.setTextColor(...BRAND);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Détails et remarques', margin, y);
    y += 6;
    doc.setTextColor(70, 70, 70);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const detailLines = doc.splitTextToSize(profile.estimation_details, pageWidth - margin * 2);
    doc.text(detailLines, margin, y);
    y += detailLines.length * 4.5 + 8;
  }

  // ----- Méthodologie -----
  doc.setTextColor(...BRAND);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Méthodologie', margin, y);
  y += 6;
  doc.setTextColor(70, 70, 70);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const methodo = doc.splitTextToSize(
    "Cette estimation est établie par Hello Keys sur la base des caractéristiques du bien, des données de marché " +
      "de la location saisonnière dans le secteur concerné (taux d'occupation, prix moyens par nuitée, saisonnalité) " +
      "et de l'historique de performance des biens comparables gérés par notre conciergerie.",
    pageWidth - margin * 2,
  );
  doc.text(methodo, margin, y);
  y += methodo.length * 4.5 + 8;

  // ----- Encadré avertissement -----
  const disclaimer = doc.splitTextToSize(
    "Document d'information établi à titre indicatif à la demande du propriétaire, notamment en vue de la " +
      "constitution d'un dossier de financement bancaire. Les montants indiqués sont des estimations prévisionnelles " +
      "et ne constituent ni une garantie de revenus, ni un engagement contractuel de la part de Hello Keys. " +
      "Les revenus réels peuvent varier selon la saisonnalité, l'état du marché et la disponibilité du bien.",
    pageWidth - margin * 2 - 10,
  );
  const boxHeight = disclaimer.length * 4 + 12;
  doc.setFillColor(252, 248, 240);
  doc.setDrawColor(230, 200, 150);
  doc.roundedRect(margin, y, pageWidth - margin * 2, boxHeight, 2, 2, 'FD');
  doc.setTextColor(140, 100, 40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('AVERTISSEMENT', margin + 5, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(disclaimer, margin + 5, y + 11);

  // ----- Pied de page -----
  doc.setDrawColor(220, 225, 232);
  doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.text(
    'Hello Keys — Conciergerie de location saisonnière — 14 rue Carnot, 80550 Le Crotoy',
    pageWidth / 2,
    pageHeight - 12,
    { align: 'center' },
  );
  doc.text(`Réf. ${reference} — Document généré le ${today}`, pageWidth / 2, pageHeight - 7, { align: 'center' });

  doc.save(`estimation-hello-keys-${reference}.pdf`);
}
