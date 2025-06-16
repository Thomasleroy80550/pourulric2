import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

// Import the CGUV HTML content directly
import CGUV_HTML_CONTENT from '@/assets/cguv.html?raw'; // Use ?raw to import as a string

interface CGUVModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}

const CGUVModal: React.FC<CGUVModalProps> = ({ isOpen, onOpenChange, onAccept }) => {
  const [hasAccepted, setHasAccepted] = useState(false);

  // Reset checkbox state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setHasAccepted(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] md:max-w-[700px] lg:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Conditions Générales d'Utilisation (CGUV)</DialogTitle>
          <DialogDescription>
            Veuillez lire et accepter nos conditions pour continuer à utiliser l'application.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow p-4 border rounded-md bg-gray-50 dark:bg-gray-800 text-sm leading-relaxed max-h-[calc(90vh-200px)]">
          <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: CGUV_HTML_CONTENT }} />
        </ScrollArea>
        <div className="flex items-center space-x-2 mt-4">
          <Checkbox
            id="cguv-accept"
            checked={hasAccepted}
            onCheckedChange={(checked) => setHasAccepted(!!checked)}
          />
          <Label htmlFor="cguv-accept" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            J'ai lu et j'accepte les Conditions Générales d'Utilisation.
          </Label>
        </div>
        <DialogFooter className="mt-4">
          <Button onClick={onAccept} disabled={!hasAccepted}>
            Valider et Continuer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CGUVModal;