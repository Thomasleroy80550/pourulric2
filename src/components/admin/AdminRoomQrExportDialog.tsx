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

  // Génère un PDF au format photo 10 x 15 cm (= 4 x 6 pouces), prêt à imprimer.
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

    // Cadre décoratif léger
    pdf.setDrawColor(209, 213, 219);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(5, 5, pageW - 10, pageH - 10, 4, 4, 'S');

    // Titre : nom du logement
    pdf.setTextColor(31, 41, 55);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    const title = pdf.splitTextToSize(roomName, pageW - 20);
    pdf.text(title, pageW / 2, 22, { align: 'center' });

    // Sous-titre / consigne
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(75, 85, 99);
    const subtitle = pdf.splitTextToSize(
      'Un souci pendant votre séjour ?\nScannez ce QR code pour nous prévenir.',
      pageW - 24,
    );
    pdf.text(subtitle, pageW / 2, 34, { align: 'center' });

    // QR code centré
    const qrSize = 62;
    const qrX = (pageW - qrSize) / 2;
    const qrY = 48;
    pdf.addImage(dataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // Mention "Scannez-moi"
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(31, 41, 55);
    pdf.text('Scannez avec l’appareil photo', pageW / 2, qrY + qrSize + 12, { align: 'center' });

    // URL en pied de page
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(156, 163, 175);
    pdf.text(url, pageW / 2, pageH - 12, { align: 'center' });

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
            Export au format photo <strong>10×15 cm (4×6 pouces)</strong> à imprimer et déposer dans
            « {roomName} »{ownerName ? ` — ${ownerName}` : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div ref={containerRef} className="rounded-xl border bg-white p-5">
            <QRCodeCanvas
              value={url}
              size={220}
              fgColor="#4b5563"
              bgColor="#ffffff"
              level="M"
              includeMargin
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
            Exporter en 10×15 cm (PDF)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminRoomQrExportDialog;
