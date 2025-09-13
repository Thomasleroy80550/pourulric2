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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserTransferSummary } from '@/lib/admin-api';
import { Loader2 } from 'lucide-react';

interface StripePayoutDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  summary: UserTransferSummary | null;
  onConfirm: (description: string) => Promise<void>;
}

const StripePayoutDialog: React.FC<StripePayoutDialogProps> = ({
  isOpen,
  onOpenChange,
  summary,
  onConfirm,
}) => {
  const [description, setDescription] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset state when dialog opens
      setDescription('');
      setIsPaying(false);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!summary) return;
    setIsPaying(true);
    try {
      await onConfirm(description);
      onOpenChange(false); // Close dialog on success
    } finally {
      setIsPaying(false);
    }
  };

  if (!summary) return null;

  const amountToPay = summary.details
    .filter(d => !d.transfer_completed)
    .reduce((acc, d) => acc + (d.amountsBySource['stripe'] || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmer le virement Stripe</DialogTitle>
          <DialogDescription>
            Vous êtes sur le point d'initier un virement pour {summary.first_name} {summary.last_name}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-4 bg-secondary rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Destinataire</span>
              <span className="font-medium">{summary.first_name} {summary.last_name}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-muted-foreground">Montant Stripe à virer</span>
              <span className="font-bold text-lg text-primary">{amountToPay.toFixed(2)} €</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description du virement (optionnel)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Virement commissions Juin 2024"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPaying}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={isPaying || amountToPay <= 0}>
            {isPaying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                En cours...
              </>
            ) : (
              'Confirmer et Payer'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StripePayoutDialog;