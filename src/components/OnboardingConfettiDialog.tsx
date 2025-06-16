import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import useWindowSize from 'react-use/lib/useWindowSize'; // A hook to get window size for confetti
import Confetti from 'react-confetti';

interface OnboardingConfettiDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const OnboardingConfettiDialog: React.FC<OnboardingConfettiDialogProps> = ({ isOpen, onClose }) => {
  const { width, height } = useWindowSize();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {isOpen && (
        <Confetti
          width={width}
          height={height}
          recycle={false} // Confetti falls once
          numberOfPieces={500} // More confetti!
          gravity={0.1}
          tweenDuration={5000}
        />
      )}
      <DialogContent className="sm:max-w-[425px] text-center">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-green-600">Bienvenue à bord ! 🎉</DialogTitle>
          <DialogDescription className="text-lg mt-2">
            Votre compte est maintenant configuré et prêt à l'emploi.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-gray-700 dark:text-gray-300">
            Nous sommes ravis de vous compter parmi nous. Explorez toutes les fonctionnalités !
          </p>
        </div>
        <Button onClick={onClose} className="w-full">
          Commencer
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingConfettiDialog;