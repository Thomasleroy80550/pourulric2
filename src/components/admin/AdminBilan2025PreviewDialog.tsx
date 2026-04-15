import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Mail } from 'lucide-react';
import PerformanceSummaryPrintLayout from '@/components/PerformanceSummaryPrintLayout';

export interface AdminBilan2025PreviewData {
  clientName: string;
  email?: string | null;
  year: number;
  yearlyTotals: {
    totalCA: number;
    totalMontantVerse: number;
    totalFacture: number;
    net: number;
    adr: number;
    revpar: number;
    yearlyOccupation: number;
    totalNuits: number;
    totalReservations: number;
    totalVoyageurs: number;
  };
  monthly: Array<{
    month: string;
    totalCA: number;
    occupation: number;
  }>;
  summaryText: string;
}

interface AdminBilan2025PreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  preview: AdminBilan2025PreviewData | null;
  onDownload: () => void;
  onSend: () => void;
  isDownloading: boolean;
  isSending: boolean;
}

const AdminBilan2025PreviewDialog: React.FC<AdminBilan2025PreviewDialogProps> = ({
  isOpen,
  onOpenChange,
  preview,
  onDownload,
  onSend,
  isDownloading,
  isSending,
}) => {
  if (!preview) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Bilan {preview.year} — aperçu avant envoi</DialogTitle>
          <DialogDescription>
            Prévisualisation du bilan annuel de {preview.clientName}
            {preview.email ? ` (${preview.email})` : ''}. Vous pouvez le télécharger ou l'envoyer directement.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto rounded-md border bg-muted/30 p-4">
          <div className="mx-auto w-fit overflow-hidden rounded-md bg-white shadow-sm">
            <PerformanceSummaryPrintLayout
              clientName={preview.clientName}
              year={preview.year}
              yearlyTotals={preview.yearlyTotals}
              monthly={preview.monthly}
              summaryText={preview.summaryText}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={onDownload} disabled={isDownloading || isSending}>
              {isDownloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Télécharger le PDF
            </Button>
            <Button onClick={onSend} disabled={isDownloading || isSending || !preview.email}>
              {isSending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Envoyer au client
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminBilan2025PreviewDialog;
