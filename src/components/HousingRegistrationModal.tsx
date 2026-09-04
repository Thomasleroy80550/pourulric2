import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Home,
  MapPin,
  BedDouble,
  FileCheck2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { UserProfile } from '@/lib/profile-api';

export interface HousingOnboardingPayload {
  home_address: string;
  home_zip_code: string;
  home_city: string;
  property_address: string;
  property_zip_code: string;
  property_city: string;
  housing_registration_number: string;
  property_address_confirmed_at: string;
}

interface HousingRegistrationModalProps {
  isOpen: boolean;
  profile: UserProfile | null;
  onSave: (payload: HousingOnboardingPayload) => Promise<void>;
  /** Jours restants avant expiration du délai (null = délai non démarré) */
  daysLeft: number | null;
  /** Si false, le modal est bloquant (délai expiré) */
  canDismiss: boolean;
  onDismiss: () => void;
}

const STEPS = [
  { title: 'Votre domicile', subtitle: "L'adresse postale de votre résidence principale", icon: MapPin },
  { title: 'Votre logement', subtitle: "Confirmez l'adresse du logement en gestion", icon: BedDouble },
  { title: "N° d'enregistrement", subtitle: 'Le numéro délivré par votre mairie (13 caractères)', icon: FileCheck2 },
];

const HousingRegistrationModal: React.FC<HousingRegistrationModalProps> = ({
  isOpen,
  profile,
  onSave,
  daysLeft,
  canDismiss,
  onDismiss,
}) => {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Étape 1 : domicile
  const [homeAddress, setHomeAddress] = useState(profile?.home_address ?? '');
  const [homeZip, setHomeZip] = useState(profile?.home_zip_code ?? '');
  const [homeCity, setHomeCity] = useState(profile?.home_city ?? '');

  // Étape 2 : logement (pré-rempli avec l'adresse connue)
  const [propAddress, setPropAddress] = useState(profile?.property_address ?? '');
  const [propZip, setPropZip] = useState(profile?.property_zip_code ?? '');
  const [propCity, setPropCity] = useState(profile?.property_city ?? '');

  // Étape 3 : numéro d'enregistrement
  const [regNumber, setRegNumber] = useState(profile?.housing_registration_number ?? '');
  const trimmedNumber = regNumber.trim().toUpperCase();
  const numberValid = trimmedNumber.length === 13;

  const homeValid = homeAddress.trim() !== '' && homeZip.trim() !== '' && homeCity.trim() !== '';
  const propValid = propAddress.trim() !== '' && propZip.trim() !== '' && propCity.trim() !== '';

  const stepValid = step === 0 ? homeValid : step === 1 ? propValid : numberValid;
  const CurrentIcon = STEPS[step].icon;

  const handleNext = () => {
    setError(null);
    if (step < 2) setStep(step + 1);
  };

  const handleBack = () => {
    setError(null);
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 2) {
      if (stepValid) handleNext();
      return;
    }
    if (!numberValid) {
      setError('Le numéro doit contenir exactement 13 caractères.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave({
        home_address: homeAddress.trim(),
        home_zip_code: homeZip.trim(),
        home_city: homeCity.trim(),
        property_address: propAddress.trim(),
        property_zip_code: propZip.trim(),
        property_city: propCity.trim(),
        housing_registration_number: trimmedNumber,
        property_address_confirmed_at: new Date().toISOString(),
      });
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
        className="sm:max-w-lg p-0 overflow-hidden border-0 shadow-2xl [&>button]:hidden"
        onInteractOutside={(e) => { if (!canDismiss) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (!canDismiss) e.preventDefault(); }}
      >
        {/* Header avec dégradé */}
        <div
          className={`relative px-6 pt-7 pb-6 text-white ${
            canDismiss
              ? 'bg-gradient-to-br from-sky-600 via-sky-700 to-blue-900'
              : 'bg-gradient-to-br from-rose-600 via-red-600 to-orange-600'
          }`}
        >
          <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />

          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/30 shadow-lg">
              <CurrentIcon className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                Mise en conformité · Étape {step + 1} sur {STEPS.length}
              </p>
              <DialogTitle className="text-lg font-bold tracking-tight text-white">
                {STEPS[step].title}
              </DialogTitle>
              <DialogDescription className="text-white/85 text-xs">
                {STEPS[step].subtitle}
              </DialogDescription>
            </div>
          </div>

          {/* Stepper */}
          <div className="relative mt-5 flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.title} className="flex-1">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i < step ? 'bg-white' : i === step ? 'bg-white/90' : 'bg-white/25'
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Badge délai */}
          <div className="relative mt-4 flex justify-center">
            {canDismiss ? (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm ring-1 ring-white/30 px-3 py-1 text-xs font-semibold">
                <Clock className="h-3.5 w-3.5" />
                {daysLeft} jour{daysLeft !== null && daysLeft > 1 ? 's' : ''} restant{daysLeft !== null && daysLeft > 1 ? 's' : ''} pour compléter
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
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="home-address">Adresse</Label>
                <Input
                  id="home-address"
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  placeholder="12 rue de la République"
                  autoFocus
                  disabled={saving}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="home-zip">Code postal</Label>
                  <Input
                    id="home-zip"
                    value={homeZip}
                    onChange={(e) => setHomeZip(e.target.value)}
                    placeholder="80550"
                    maxLength={10}
                    disabled={saving}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="home-city">Ville</Label>
                  <Input
                    id="home-city"
                    value={homeCity}
                    onChange={(e) => setHomeCity(e.target.value)}
                    placeholder="Le Crotoy"
                    disabled={saving}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
                <Home className="h-4 w-4 mt-0.5 shrink-0 text-sky-600" />
                <p>Il s'agit de l'adresse de votre résidence principale, où nous pouvons vous adresser des courriers.</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prop-address">Adresse du logement</Label>
                <Input
                  id="prop-address"
                  value={propAddress}
                  onChange={(e) => setPropAddress(e.target.value)}
                  placeholder="5 quai Léonard"
                  autoFocus
                  disabled={saving}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="prop-zip">Code postal</Label>
                  <Input
                    id="prop-zip"
                    value={propZip}
                    onChange={(e) => setPropZip(e.target.value)}
                    placeholder="80550"
                    maxLength={10}
                    disabled={saving}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="prop-city">Ville</Label>
                  <Input
                    id="prop-city"
                    value={propCity}
                    onChange={(e) => setPropCity(e.target.value)}
                    placeholder="Le Crotoy"
                    disabled={saving}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
                <BedDouble className="h-4 w-4 mt-0.5 shrink-0 text-sky-600" />
                <p>
                  Vérifiez et corrigez si besoin l'adresse du logement que nous gérons pour vous, puis
                  confirmez en passant à l'étape suivante.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    id="housing-registration-number"
                    value={regNumber}
                    onChange={(e) => {
                      setRegNumber(e.target.value.toUpperCase());
                      setError(null);
                    }}
                    maxLength={13}
                    placeholder="7511304567890"
                    autoFocus
                    disabled={saving}
                    className={`h-14 text-center font-mono text-lg tracking-[0.35em] pr-10 rounded-xl border-2 transition-colors ${
                      numberValid
                        ? 'border-green-500 focus-visible:ring-green-500/30'
                        : 'focus-visible:ring-sky-500/30 focus-visible:border-sky-600'
                    }`}
                  />
                  {numberValid && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        numberValid ? 'bg-green-500' : 'bg-gradient-to-r from-sky-500 to-blue-600'
                      }`}
                      style={{ width: `${Math.min(100, Math.round((trimmedNumber.length / 13) * 100))}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium tabular-nums ${numberValid ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {trimmedNumber.length}/13
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-sky-600" />
                <p>
                  Ce numéro de 13 caractères figure sur le récépissé de déclaration de votre meublé de
                  tourisme délivré par votre mairie.
                </p>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}

          {/* Navigation */}
          <div className="space-y-2">
            <div className="flex gap-2">
              {step > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl px-4"
                  onClick={handleBack}
                  disabled={saving}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Retour
                </Button>
              )}
              <Button
                type="submit"
                disabled={!stepValid || saving}
                className={`flex-1 h-11 rounded-xl text-sm font-semibold shadow-lg transition-all ${
                  canDismiss
                    ? 'bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 shadow-blue-500/25'
                    : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-red-500/25'
                }`}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : step === 2 ? (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                ) : null}
                {step === 0 && (
                  <>
                    Continuer
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
                {step === 1 && (
                  <>
                    Je confirme cette adresse
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
                {step === 2 && 'Terminer ma mise en conformité'}
              </Button>
            </div>
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
