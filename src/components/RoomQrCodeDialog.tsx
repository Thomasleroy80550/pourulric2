import { useMemo, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Download, Printer, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface RoomQrCodeDialogProps {
  roomId: string;
  roomName: string;
}

const RoomQrCodeDialog = ({ roomId, roomName }: RoomQrCodeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const url = useMemo(
    () => `${window.location.origin}/logement/${roomId}/signaler`,
    [roomId],
  );

  const getCanvas = () => containerRef.current?.querySelector('canvas') as HTMLCanvasElement | null;

  const handleDownload = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `qr-logement-${roomName.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien.");
    }
  };

  const handlePrint = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) {
      toast.error("Veuillez autoriser les fenêtres pop-up pour imprimer.");
      return;
    }
    printWindow.document.write(`
      <html>
        <head><title>QR Code - ${roomName}</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 40px;">
          <h2 style="margin-bottom: 4px;">${roomName}</h2>
          <p style="color: #555; margin-top: 0;">Un problème pendant votre séjour ?<br/>Scannez pour nous prévenir.</p>
          <img src="${dataUrl}" style="width: 320px; height: 320px;" />
          <p style="color: #888; font-size: 12px; margin-top: 24px;">${url}</p>
          <script>window.onload = function(){ window.print(); }<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <QrCode className="mr-2 h-4 w-4" />
          QR code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>QR code du logement</DialogTitle>
          <DialogDescription>
            À imprimer et à laisser dans « {roomName} ». Les voyageurs le scannent pour signaler un
            problème, qui arrive directement dans vos incidents.
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

          <div className="flex w-full gap-2">
            <Button className="flex-1" variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Télécharger
            </Button>
            <Button className="flex-1" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoomQrCodeDialog;
