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
import { ScrollArea } from '@/components/ui/scroll-area';
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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="no-print">
          <DialogTitle>Aperçu du Relevé</DialogTitle>
          <DialogDescription>
            Voici un aperçu du relevé pour {statement.profiles ? `${statement.profiles.first_name} ${statement.profiles.last_name}` : 'Client inconnu'}. Vous pouvez l'imprimer.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow rounded-md bg-gray-200 p-4">
          <StatementPrintLayout statement={statement} />
        </ScrollArea>
        <DialogFooter className="no-print">
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