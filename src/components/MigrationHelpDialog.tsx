"use client";

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

interface MigrationHelpDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const MigrationHelpDialog: React.FC<MigrationHelpDialogProps> = ({ isOpen, onOpenChange }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Besoin d'aide pour la migration ?</DialogTitle>
          <DialogDescription>
            Pour toute question concernant la migration ou votre compte, veuillez nous contacter directement :
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 text-center">
          <p className="text-lg font-semibold">
            Téléphone : <a href="tel:+33322319270" className="text-blue-600 hover:underline">03 22 31 92 70</a>
          </p>
          <p className="text-lg font-semibold">
            Email : <a href="mailto:contact@hellokeys.fr" className="text-blue-600 hover:underline">contact@hellokeys.fr</a>
          </p>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MigrationHelpDialog;