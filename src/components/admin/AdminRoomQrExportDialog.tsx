import { useMemo, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import jsPDF from 'jspdf';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, FileDown, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface AdminRoomQrExportDialogProps {
  roomId: string;
  roomName: string;
  ownerName?: string;
}

const AdminRoomQrExportDialog = ({ roomId, roomName, ownerName }: AdminRoomQrExportDialogProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const url = useMemo(
    () => `${window.location.origin}/logement/${roomId}/signaler`,
    [roomId],
  );

  const getQrDataUrl = () => {
    const canvas = containerRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
    return canvas ? canvas.toDataURL('image/png') : null;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier le lien.');
    }
  };

  // Génère un PDF au format photo 10 x 15 cm (= 4 x 6 pouces), noir & blanc,
  // optimisé pour l'impression thermique et bilingue FR / EN.
  const handleExportPdf = () => {
    const dataUrl = getQrDataUrl();
    if (!dataUrl) {
      toast.error('QR code non prêt, réessayez.');
      return;
    }

    // 100 x 150 mm = 10 x 15 cm = 4 x 6 pouces
    const pageW = 100;
    const pageH = 150;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pageW, pageH] });

    // Cadre (noir pour thermique)
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.6);
    pdf.roundedRect(5, 5, pageW - 10, pageH - 10, 3, 3, 'S');

    // Titre : nom du logement
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    const title = pdf.splitTextToSize(roomName, pageW - 20);
    pdf.text(title, pageW / 2, 20, { align: 'center' });

    // Consigne FR
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    const frText = pdf.splitTextToSize(
      'Un souci pendant votre séjour ? Scannez pour nous prévenir.',
      pageW - 24,
    );
    pdf.text(frText, pageW / 2, 30, { align: 'center' });

    // Consigne EN
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(9);
    const enText = pdf.splitTextToSize(
      'An issue during your stay? Scan to let us know.',
      pageW - 24,
    );
    pdf.text(enText, pageW / 2, 38, { align: 'center' });

    // QR code centré (noir & blanc)
    const qrSize = 60;
    const qrX = (pageW - qrSize) / 2;
    const qrY = 46;
    pdf.addImage(dataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // Appel à l'action bilingue
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Scannez avec l’appareil photo', pageW / 2, qrY + qrSize + 11, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('Scan with your phone camera', pageW / 2, qrY + qrSize + 18, { align: 'center' });

    // URL en pied de page
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.text(url, pageW / 2, pageH - 11, { align: 'center' });

    const safeName = roomName.replace(/\s+/g, '-').toLowerCase();
    pdf.save(`qr-10x15-${safeName}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <QrCode className="h-4 w-4 mr-1" /> QR code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>QR code du logement</DialogTitle>
          <DialogDescription>
            Export noir &amp; blanc au format photo <strong>10×15 cm (4×6 pouces)</strong>, optimisé
            impression thermique et bilingue FR/EN, pour « {roomName} »
            {ownerName ? ` — ${ownerName}` : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div ref={containerRef} className="rounded-xl border bg-white p-5">
            {/* Haute résolution (size=1024) pour une impression nette, affiché en 200px */}
            <QRCodeCanvas
              value={url}
              size={1024}
              fgColor="#000000"
              bgColor="#ffffff"
              level="H"
              includeMargin
              style={{ width: 200, height: 200 }}
            />
          </div>

          <div className="flex w-full items-center gap-2 rounded-lg bg-muted px-3 py-2">
            <span className="flex-1 truncate text-xs text-muted-foreground">{url}</span>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <Button className="w-full" onClick={handleExportPdf}>
            <FileDown className="mr-2 h-4 w-4" />
            Exporter en 10×15 cm (PDF N&amp;B)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminRoomQrExportDialog;
