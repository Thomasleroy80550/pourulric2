import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SavedInvoice } from '@/lib/admin-api';
import StatementPrintLayout from './StatementPrintLayout';
import { Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

interface StatementDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  statement: SavedInvoice | null;
}

const StatementDetailsDialog: React.FC<StatementDetailsDialogProps> = ({ isOpen, onOpenChange, statement }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!statement) return null;

  const handleDownloadPdf = async () => {
    const statementElement = document.getElementById('statement-to-print');
    if (!statementElement) {
      toast.error("Impossible de trouver le contenu du relevé à télécharger.");
      return;
    }

    setIsDownloading(true);
    const toastId = toast.loading("Génération du PDF en cours...");

    try {
      const canvas = await html2canvas(statementElement, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        width: statementElement.scrollWidth,
        height: statementElement.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgWidth / imgHeight;
      
      let finalImgWidth = pdfWidth;
      let finalImgHeight = pdfWidth / ratio;

      // If the height is still too large for one page, we might need to split it,
      // but for a single statement, fitting to width is usually enough.
      if (finalImgHeight > pdfHeight) {
        finalImgHeight = pdfHeight;
        finalImgWidth = pdfHeight * ratio;
      }

      pdf.addImage(imgData, 'PNG', 0, 0, finalImgWidth, finalImgHeight);
      
      const clientName = statement.profiles ? `${statement.profiles.first_name}_${statement.profiles.last_name}` : 'Client';
      pdf.save(`Releve_${clientName}_${statement.period.replace(/\s/g, '_')}.pdf`);

      toast.success("PDF téléchargé avec succès !", { id: toastId });
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      toast.error("Une erreur est survenue lors de la création du PDF.", { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader className="no-print">
          <DialogTitle>Aperçu du Relevé</DialogTitle>
          <DialogDescription>
            Voici un aperçu du relevé pour {statement.profiles ? `${statement.profiles.first_name} ${statement.profiles.last_name}` : 'Client inconnu'}. Vous pouvez le télécharger en PDF.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow rounded-md bg-gray-200 overflow-auto">
          <StatementPrintLayout statement={statement} />
        </div>
        <DialogFooter className="no-print mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button onClick={handleDownloadPdf} disabled={isDownloading}>
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Téléchargement...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Télécharger en PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StatementDetailsDialog;