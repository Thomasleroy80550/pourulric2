import React, { useState, useEffect, useRef } from 'react';
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
import { cn } from '@/lib/utils';

import CGUV_HTML_CONTENT from '@/assets/cguv.html?raw';

interface CGUVModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept?: () => void;
  viewOnly?: boolean;
}

const CGUVModal: React.FC<CGUVModalProps> = ({ isOpen, onOpenChange, onAccept, viewOnly = false }) => {
  const [hasAccepted, setHasAccepted] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setHasAccepted(false);
      setScrolledToBottom(viewOnly); // If viewOnly, no need to scroll to accept
      if (viewportRef.current) {
        viewportRef.current.scrollTop = 0;
        // Re-check scroll position after resetting to top, in case content is short
        handleScroll();
      }
    }
  }, [isOpen, viewOnly]);

  const handleScroll = () => {
    if (viewOnly) {
        if (!scrolledToBottom) setScrolledToBottom(true);
        return;
    }
    if (viewportRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = viewportRef.current;
      if (scrollHeight - scrollTop <= clientHeight + 5) { // 5px buffer
        setScrolledToBottom(true);
      } else {
        setScrolledToBottom(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] md:max-w-[800px] lg:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Conditions Générales d'Utilisation (CGUV)</DialogTitle>
          <DialogDescription>
            {viewOnly ? "Voici nos conditions générales d'utilisation et de vente." : "Veuillez lire et accepter nos conditions pour continuer à utiliser l'application."}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea
          className="flex-grow p-4 border rounded-md bg-gray-50 dark:bg-gray-800 text-sm leading-relaxed h-[400px]"
          viewportRef={viewportRef}
          onScroll={handleScroll}
        >
          <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: CGUV_HTML_CONTENT }} />
        </ScrollArea>
        {!viewOnly && !scrolledToBottom && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2 animate-pulse">
            Veuillez faire défiler pour lire toutes les conditions <span className="inline-block animate-bounce">↓</span>
          </p>
        )}
        {!viewOnly && (
          <div className="flex items-center space-x-2 mt-4">
            <Checkbox
              id="cguv-accept"
              checked={hasAccepted}
              onCheckedChange={(checked) => setHasAccepted(!!checked)}
              disabled={!scrolledToBottom}
            />
            <Label htmlFor="cguv-accept" className={cn(
              "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              !scrolledToBottom && "text-gray-400 dark:text-gray-600"
            )}>
              J'ai lu et j'accepte les Conditions Générales d'Utilisation.
            </Label>
          </div>
        )}
        <DialogFooter className="mt-4">
          {viewOnly ? (
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Fermer
            </Button>
          ) : (
            <Button onClick={onAccept} disabled={!hasAccepted || !scrolledToBottom}>
              Valider et Continuer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CGUVModal;