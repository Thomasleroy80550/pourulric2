import { Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

/** Encart affiché à la place du formulaire et de l'éditeur de prix pour un logement en Smart Pricing. */
export default function SmartPricingNotice({ className }: { className?: string }) {
  return (
    <Alert role="note" className={cn("bg-muted/40", className)}>
      <Sparkles className="h-4 w-4" />
      <AlertTitle>Tarifs gérés par Smart Pricing</AlertTitle>
      <AlertDescription>
        Les tarifs de ce logement sont ajustés automatiquement grâce à Smart Pricing, en fonction de la demande et de la saisonnalité — aucune action n'est attendue de votre part.
      </AlertDescription>
    </Alert>
  );
}
