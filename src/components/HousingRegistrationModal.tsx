import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Home, AlertTriangle, Clock, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

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
  const progress = Math.min(100, Math.round((trimmed.length / 13) * 100));

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
        className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl [&>button]:hidden"
        onInteractOutside={(e) => { if (!canDismiss) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (!canDismiss) e.preventDefault(); }}
      >
        {/* Header avec dégradé */}
        <div
          className={`relative px-6 pt-8 pb-6 text-white ${
            canDismiss
              ? 'bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700'
              : 'bg-gradient-to-br from-rose-600 via-red-600 to-orange-600'
          }`}
        >
          {/* Décorations */}
          <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
          <Sparkles className="pointer-events-none absolute top-4 right-5 h-5 w-5 text-white/40" />

          <div className="relative flex flex-col items-center text-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/30 shadow-lg">
              <Home className="h-8 w-8" />
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight">
              Numéro d'enregistrement
            </DialogTitle>
            <DialogDescription className="text-white/85 text-sm leading-relaxed">
              Communiquez-nous le numéro d'enregistrement de votre logement délivré par votre
              mairie pour rester en conformité avec la réglementation.
            </DialogDescription>

            {/* Badge délai */}
            {canDismiss ? (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm ring-1 ring-white/30 px-3 py-1 text-xs font-semibold">
                <Clock className="h-3.5 w-3.5" />
                {daysLeft} jour{daysLeft !== null && daysLeft > 1 ? 's' : ''} restant{daysLeft !== null && daysLeft > 1 ? 's' : ''}
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm ring-1 ring-white/40 px-3 py-1 text-xs font-bold animate-pulse">
                <AlertTriangle className="h-3.5 w-3.5" />
                Délai expiré — action requise
              </div>
            )}
          </div>
        </div>

        {/* Corps */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-5 space-y-5 bg-background">
          <div className="space-y-2">
            <div className="relative">
              <Input
                id="housing-registration-number"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value.toUpperCase());
                  setError(null);
                }}
                maxLength={13}
                placeholder="7511304567890"
                autoFocus
                disabled={saving}
                className={`h-14 text-center font-mono text-lg tracking-[0.35em] pr-10 rounded-xl border-2 transition-colors ${
                  isValid
                    ? 'border-green-500 focus-visible:ring-green-500/30'
                    : 'focus-visible:ring-violet-500/30 focus-visible:border-violet-500'
                }`}
              />
              {isValid && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
              )}
            </div>

            {/* Barre de progression */}
            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isValid ? 'bg-green-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className={`text-xs font-medium tabular-nums ${isValid ? 'text-green-600' : 'text-muted-foreground'}`}>
                {trimmed.length}/13
              </span>
            </div>

            {error && (
              <p className="text-sm text-destructive flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
              </p>
            )}
          </div>

          <div className="flex items-start gap-2.5 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-violet-500" />
            <p>
              Ce numéro de 13 caractères figure sur le récépissé de déclaration de votre meublé de
              tourisme délivré par votre mairie.
            </p>
          </div>

          <div className="space-y-2">
            <Button
              type="submit"
              disabled={!isValid || saving}
              className={`w-full h-11 rounded-xl text-sm font-semibold shadow-lg transition-all ${
                canDismiss
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-violet-500/25'
                  : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-red-500/25'
              }`}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Enregistrer mon numéro
            </Button>
            {canDismiss && (
              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={onDismiss}
                disabled={saving}
              >
                Me le rappeler plus tard
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default HousingRegistrationModal;
