import jsPDF from 'jspdf';
import QRCode from 'qrcode';

// Format photo 10 x 15 cm = 4 x 6 pouces (en millimètres)
const PAGE_W = 100;
const PAGE_H = 150;

export function buildLabelUrl(roomId: string): string {
  return `${window.location.origin}/logement/${roomId}/signaler`;
}

async function generateQrDataUrl(url: string): Promise<string> {
  // Noir & blanc, correction d'erreur élevée, optimisé impression thermique
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    margin: 2,
    scale: 12,
    color: { dark: '#000000', light: '#ffffff' },
  });
}

function drawLabel(pdf: jsPDF, roomName: string, url: string, qrDataUrl: string) {
  // Cadre noir (thermique)
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.6);
  pdf.roundedRect(5, 5, PAGE_W - 10, PAGE_H - 10, 3, 3, 'S');

  // Titre : nom du logement
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text(pdf.splitTextToSize(roomName, PAGE_W - 20), PAGE_W / 2, 20, { align: 'center' });

  // Consigne FR
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.text(
    pdf.splitTextToSize('Un souci pendant votre séjour ? Scannez pour nous prévenir.', PAGE_W - 24),
    PAGE_W / 2,
    30,
    { align: 'center' },
  );

  // Consigne EN
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(9);
  pdf.text(
    pdf.splitTextToSize('An issue during your stay? Scan to let us know.', PAGE_W - 24),
    PAGE_W / 2,
    38,
    { align: 'center' },
  );

  // QR code centré
  const qrSize = 60;
  const qrX = (PAGE_W - qrSize) / 2;
  const qrY = 46;
  pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

  // Appel à l'action bilingue
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Scannez avec l’appareil photo', PAGE_W / 2, qrY + qrSize + 11, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('Scan with your phone camera', PAGE_W / 2, qrY + qrSize + 18, { align: 'center' });

  // URL en pied de page
  pdf.setFontSize(7);
  pdf.text(url, PAGE_W / 2, PAGE_H - 11, { align: 'center' });
}

function slugify(name: string): string {
  return name.replace(/\s+/g, '-').toLowerCase();
}

export async function exportSingleLabelPdf(roomId: string, roomName: string): Promise<void> {
  const url = buildLabelUrl(roomId);
  const qrDataUrl = await generateQrDataUrl(url);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [PAGE_W, PAGE_H] });
  drawLabel(pdf, roomName, url, qrDataUrl);
  pdf.save(`qr-10x15-${slugify(roomName)}.pdf`);
}

export async function exportAllLabelsPdf(
  rooms: { id: string; room_name: string }[],
): Promise<void> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [PAGE_W, PAGE_H] });

  for (let i = 0; i < rooms.length; i += 1) {
    if (i > 0) {
      pdf.addPage([PAGE_W, PAGE_H], 'portrait');
    }
    const url = buildLabelUrl(rooms[i].id);
    const qrDataUrl = await generateQrDataUrl(url);
    drawLabel(pdf, rooms[i].room_name, url, qrDataUrl);
  }

  pdf.save('qr-codes-logements-10x15.pdf');
}
