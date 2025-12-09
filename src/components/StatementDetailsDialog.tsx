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
import { HELLO_KEYS_IBAN, HELLO_KEYS_BIC } from '@/lib/constants';

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
      const imgHeight = (canvas.height * pdfWidth) / canvas.width; // Calculer la hauteur de l'image dans les unités du PDF
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
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

        {/* Infos de paiement Hello Keys */}
        <div className="no-print mb-3 rounded-md border bg-muted/40 p-3">
          <p className="text-sm font-medium">Paiement de la facture Hello Keys</p>
          <p className="text-sm mt-1">
            Veuillez effectuer le virement du <span className="font-semibold">Total Facture Hello Keys</span> vers&nbsp;
            <span className="font-semibold">IBAN:</span> {HELLO_KEYS_IBAN}
            {HELLO_KEYS_BIC ? <> &nbsp;•&nbsp; <span className="font-semibold">BIC:</span> {HELLO_KEYS_BIC}</> : null}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Si votre relevé indique une déduction automatique, aucun paiement n'est requis.
          </p>
        </div>

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