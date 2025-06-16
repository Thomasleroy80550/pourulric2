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
import { cn } from '@/lib/utils'; // Import cn for conditional classNames

// Import the CGUV HTML content directly
import CGUV_HTML_CONTENT from '@/assets/cguv.html?raw'; // Use ?raw to import as a string

interface CGUVModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}

const CGUVModal: React.FC<CGUVModalProps> = ({ isOpen, onOpenChange, onAccept }) => {
  const [hasAccepted, setHasAccepted] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false); // New state for scroll tracking
  const viewportRef = useRef<HTMLDivElement>(null); // Ref for the scrollable viewport

  // Reset checkbox and scroll state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setHasAccepted(false);
      setScrolledToBottom(false); // Reset scroll state
      // Reset scroll position to top when modal opens
      if (viewportRef.current) {
        viewportRef.current.scrollTop = 0;
      }
    }
  }, [isOpen]);

  // Check scroll position
  const handleScroll = () => {
    if (viewportRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = viewportRef.current;
      // Add a small tolerance (e.g., 1px) for floating point inaccuracies
      if (scrollHeight - scrollTop <= clientHeight + 1) {
        setScrolledToBottom(true);
      } else {
        setScrolledToBottom(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] md:max-w-[800px] lg:max-w-4xl max-h-[90vh] flex flex-col"> {/* Increased max-width */}
        <DialogHeader>
          <DialogTitle>Conditions Générales d'Utilisation (CGUV)</DialogTitle>
          <DialogDescription>
            Veuillez lire et accepter nos conditions pour continuer à utiliser l'application.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea
          className="flex-grow p-4 border rounded-md bg-gray-50 dark:bg-gray-800 text-sm leading-relaxed max-h-[calc(90vh-250px)]" // Adjusted max-height for larger modal
          viewportRef={viewportRef} // Pass the ref to the viewport
          onScroll={handleScroll} // Attach the scroll handler
        >
          <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: CGUV_HTML_CONTENT }} />
        </ScrollArea>
        {!scrolledToBottom && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2 animate-pulse">
            Veuillez faire défiler pour lire toutes les conditions <span className="inline-block animate-bounce">↓</span>
          </p>
        )}
        <div className="flex items-center space-x-2 mt-4">
          <Checkbox
            id="cguv-accept"
            checked={hasAccepted}
            onCheckedChange={(checked) => setHasAccepted(!!checked)}
            disabled={!scrolledToBottom} // Disable checkbox until scrolled to bottom
          />
          <Label htmlFor="cguv-accept" className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            !scrolledToBottom && "text-gray-400 dark:text-gray-600" // Dim label if not scrolled
          )}>
            J'ai lu et j'accepte les Conditions Générales d'Utilisation.
          </Label>
        </div>
        <DialogFooter className="mt-4">
          <Button onClick={onAccept} disabled={!hasAccepted || !scrolledToBottom}>
            Valider et Continuer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CGUVModal;