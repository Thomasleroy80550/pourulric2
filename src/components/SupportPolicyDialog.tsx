"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, HelpCircle } from "lucide-react";

type SupportPolicyDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const SupportPolicyDialog: React.FC<SupportPolicyDialogProps> = ({ isOpen, onOpenChange }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-amber-600" />
            Pourquoi nous arrêtons le support via WhatsApp ?
          </DialogTitle>
          <DialogDescription>
            Afin d&apos;améliorer la qualité du service et la protection des données, nous centralisons désormais tous les échanges par email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm leading-relaxed">
          <ul className="list-disc pl-5 space-y-2">
            <li>Centraliser et tracer les échanges pour un suivi fiable.</li>
            <li>Protéger vos données et documents sensibles.</li>
            <li>Assurer des délais de réponse cohérents et mesurables.</li>
            <li>Faciliter l&apos;escalade vers la bonne équipe quand nécessaire.</li>
          </ul>
          <p className="text-muted-foreground">
            Pour toute demande, contactez-nous à{" "}
            <span className="font-medium">contact@hellokeys.fr</span>.
          </p>
        </div>

        <DialogFooter className="flex justify-between sm:justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            title="Fermer cette fenêtre"
          >
            J&apos;ai compris
          </Button>
          <Button
            variant="default"
            onClick={() => {
              window.location.href = "mailto:contact@hellokeys.fr?subject=Support%20par%20email";
            }}
            title="Contacter le support par email"
          >
            <Mail className="h-4 w-4 mr-2" />
            Contacter le support
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SupportPolicyDialog;