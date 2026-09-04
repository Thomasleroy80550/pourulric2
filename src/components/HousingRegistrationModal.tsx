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
import { Loader2, Home } from 'lucide-react';

interface HousingRegistrationModalProps {
  isOpen: boolean;
  onSave: (registrationNumber: string) => Promise<void>;
}

const HousingRegistrationModal: React.FC<HousingRegistrationModalProps> = ({ isOpen, onSave }) => {
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
    <Dialog open={isOpen} onOpenChange={() => { /* Modal obligatoire : fermeture désactivée */ }}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            Numéro d'enregistrement de votre logement
          </DialogTitle>
          <DialogDescription>
            Pour rester en conformité avec la réglementation, merci de nous communiquer le numéro
            d'enregistrement de votre logement délivré par votre mairie (13 caractères).
            Cette information est obligatoire pour continuer à utiliser votre espace.
          </DialogDescription>
        </DialogHeader>
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
          <DialogFooter>
            <Button type="submit" disabled={!isValid || saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer mon numéro
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default HousingRegistrationModal;
