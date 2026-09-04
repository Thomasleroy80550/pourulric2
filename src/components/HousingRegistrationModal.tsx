import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Home, AlertTriangle, Clock } from 'lucide-react';

interface HousingRegistrationModalProps {
  isOpen: boolean;
  onSave: (registrationNumber: string) => Promise<void>;
  /** Jours restants avant expiration du délai (null = délai non démarré) */
  daysLeft: number | null;
  /** Si false, le modal est bloquant (délai expiré) */
  canDismiss: boolean;
  onDismiss: () => void;
}

const HousingRegistrationModal: React.FC<HousingRegistrationModalProps> = ({
  isOpen,
  onSave,
  daysLeft,
  canDismiss,
  onDismiss,
}) => {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = value.trim().toUpperCase();
  const isValid = trimmed.length === 13;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setError('Le numéro doit contenir exactement 13 caractères.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave(trimmed);
    } catch (err: any) {
      setError(err?.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && canDismiss) onDismiss();
      }}
    >
      <DialogContent
        className={`sm:max-w-md ${canDismiss ? '' : '[&>button]:hidden'}`}
        onInteractOutside={(e) => { if (!canDismiss) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (!canDismiss) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            Numéro d'enregistrement de votre logement
          </DialogTitle>
          <DialogDescription>
            Pour rester en conformité avec la réglementation, merci de nous communiquer le numéro
            d'enregistrement de votre logement délivré par votre mairie (13 caractères).
          </DialogDescription>
        </DialogHeader>

        {canDismiss ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40 p-3 text-sm text-amber-800 dark:text-amber-200">
            <Clock className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Il vous reste <strong>{daysLeft} jour{daysLeft !== null && daysLeft > 1 ? 's' : ''}</strong> pour
              renseigner ce numéro. Passé ce délai, cette étape deviendra obligatoire pour accéder à votre espace.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40 p-3 text-sm text-red-800 dark:text-red-200">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Le délai de 30 jours est <strong>expiré</strong>. Vous devez renseigner votre numéro
              d'enregistrement pour continuer à utiliser votre espace.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="housing-registration-number">Numéro d'enregistrement (13 caractères)</Label>
            <Input
              id="housing-registration-number"
              value={value}
              onChange={(e) => {
                setValue(e.target.value.toUpperCase());
                setError(null);
              }}
              maxLength={13}
              placeholder="Ex : 7511304567890"
              autoFocus
              disabled={saving}
              className="font-mono tracking-widest"
            />
            <p className="text-xs text-muted-foreground">
              {trimmed.length}/13 caractères
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button type="submit" disabled={!isValid || saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer mon numéro
            </Button>
            {canDismiss && (
              <Button type="button" variant="ghost" className="w-full" onClick={onDismiss} disabled={saving}>
                Plus tard
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default HousingRegistrationModal;
