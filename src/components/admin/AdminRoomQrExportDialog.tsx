import { useMemo, useState } from 'react';
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
import { QrCode, FileDown, Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { buildLabelUrl, exportSingleLabelPdf } from '@/lib/qr-label-pdf';

interface AdminRoomQrExportDialogProps {
  roomId: string;
  roomName: string;
  ownerName?: string;
}

// Aperçu fidèle de l'étiquette imprimée (ratio 10x15 = 2:3), noir & blanc.
export const LabelPreview = ({ roomId, roomName }: { roomId: string; roomName: string }) => {
  const url = useMemo(() => buildLabelUrl(roomId), [roomId]);
  return (
    <div
      className="mx-auto flex w-full max-w-[240px] flex-col items-center rounded-md border-2 border-black bg-white px-4 py-5 text-center text-black"
      style={{ aspectRatio: '2 / 3' }}
    >
      <p className="text-sm font-bold leading-tight">{roomName}</p>
      <p className="mt-2 text-[10px] leading-snug">
        Un souci pendant votre séjour ? Scannez pour nous prévenir.
      </p>
      <p className="mt-1 text-[10px] italic leading-snug">
        An issue during your stay? Scan to let us know.
      </p>
      <div className="my-2 flex flex-1 items-center justify-center">
        <QRCodeCanvas
          value={url}
          size={1024}
          fgColor="#000000"
          bgColor="#ffffff"
          level="H"
          includeMargin
          style={{ width: 110, height: 110 }}
        />
      </div>
      <p className="text-[10px] font-bold leading-tight">Scannez avec l’appareil photo</p>
      <p className="text-[9px] leading-tight">Scan with your phone camera</p>
    </div>
  );
};

const AdminRoomQrExportDialog = ({ roomId, roomName, ownerName }: AdminRoomQrExportDialogProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const url = useMemo(() => buildLabelUrl(roomId), [roomId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier le lien.');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportSingleLabelPdf(roomId, roomName);
    } catch (err) {
      toast.error(`Erreur export : ${(err as Error).message}`);
    } finally {
      setExporting(false);
    }
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
          <DialogTitle>Étiquette QR du logement</DialogTitle>
          <DialogDescription>
            Aperçu de l'étiquette noir &amp; blanc au format <strong>10×15 cm (4×6 pouces)</strong>,
            optimisée impression thermique, pour « {roomName} »{ownerName ? ` — ${ownerName}` : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <LabelPreview roomId={roomId} roomName={roomName} />

          <div className="flex w-full items-center gap-2 rounded-lg bg-muted px-3 py-2">
            <span className="flex-1 truncate text-xs text-muted-foreground">{url}</span>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <Button className="w-full" onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            Télécharger l'étiquette (PDF 10×15)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminRoomQrExportDialog;
