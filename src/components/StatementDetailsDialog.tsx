import React from 'react';
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
import { Printer } from 'lucide-react';

interface StatementDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  statement: SavedInvoice | null;
}

const StatementDetailsDialog: React.FC<StatementDetailsDialogProps> = ({ isOpen, onOpenChange, statement }) => {
  if (!statement) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="no-print">
          <DialogTitle>Aperçu du Relevé</DialogTitle>
          <DialogDescription>
            Voici un aperçu du relevé pour {statement.profiles ? `${statement.profiles.first_name} ${statement.profiles.last_name}` : 'Client inconnu'}. Vous pouvez l'imprimer.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow rounded-md bg-gray-200 overflow-auto">
          <StatementPrintLayout statement={statement} />
        </div>
        <DialogFooter className="no-print mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StatementDetailsDialog;