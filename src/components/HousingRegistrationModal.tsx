import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  FileCheck2,
  CalendarDays,
  Clock,
  AlertTriangle,
  ArrowRight,
  Info,
} from 'lucide-react';

interface HousingRegistrationModalProps {
  isOpen: boolean;
  onDismiss: () => void;
}

const HousingRegistrationModal: React.FC<HousingRegistrationModalProps> = ({ isOpen, onDismiss }) => {
  const navigate = useNavigate();

  const handleLearnMore = () => {
    onDismiss();
    navigate('/numero-enregistrement');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onDismiss(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl [&>button]:text-white">
        {/* Header avec dégradé */}
        <div className="relative px-6 pt-8 pb-6 text-white bg-gradient-to-br from-sky-600 via-sky-700 to-blue-900">
          <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />

          <div className="relative flex flex-col items-center text-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/30 shadow-lg">
              <FileCheck2 className="h-8 w-8" />
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm ring-1 ring-white/30 px-3 py-1 text-xs font-semibold">
              <Info className="h-3.5 w-3.5" />
              Note informative
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight text-white">
              Numéro d'enregistrement national
            </DialogTitle>
            <DialogDescription className="text-white/85 text-sm">
              Meublés de tourisme — nouvelle réglementation
            </DialogDescription>
          </div>
        </div>

        {/* Corps */}
        <div className="px-6 pb-6 pt-5 space-y-4 bg-background">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5 rounded-xl border bg-muted/40 p-3">
              <CalendarDays className="h-5 w-5 text-sky-600 shrink-0" />
              <div>
                <p className="text-sm font-bold leading-tight">3 nov. 2026</p>
                <p className="text-[11px] text-muted-foreground">Début de la démarche</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border bg-muted/40 p-3">
              <Clock className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-bold leading-tight">8 mois</p>
                <p className="text-[11px] text-muted-foreground">Délai pour la réaliser</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            À compter du <strong className="text-foreground">3 novembre 2026</strong>, chaque propriétaire devra
            effectuer <strong className="text-foreground">personnellement</strong> les démarches pour obtenir le
            numéro d'enregistrement national de son meublé de tourisme, puis nous le transmettre.
          </p>

          <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3 text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Cette procédure est à réaliser <strong>directement par le propriétaire</strong> et ne pourra pas être
              effectuée par la conciergerie.
            </p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleLearnMore}
              className="w-full h-11 rounded-xl text-sm font-semibold bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 shadow-lg shadow-blue-500/25"
            >
              Tout comprendre sur la démarche
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground"
              onClick={onDismiss}
            >
              J'ai compris
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HousingRegistrationModal;
