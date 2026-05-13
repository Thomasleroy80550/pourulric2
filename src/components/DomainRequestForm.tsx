import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Globe } from "lucide-react";

interface DomainRequestFormProps {
  disabled?: boolean;
  isSubmitting?: boolean;
  onSubmit: (values: { requested_domain: string; alternative_domains: string[]; notes: string }) => Promise<void>;
}

const DomainRequestForm = ({ disabled = false, isSubmitting = false, onSubmit }: DomainRequestFormProps) => {
  const [requestedDomain, setRequestedDomain] = useState("");
  const [alternativeDomains, setAlternativeDomains] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onSubmit({
      requested_domain: requestedDomain,
      alternative_domains: alternativeDomains
        .split(/[,\n]/)
        .map((value) => value.trim())
        .filter(Boolean),
      notes,
    });

    setRequestedDomain("");
    setAlternativeDomains("");
    setNotes("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Globe className="h-5 w-5" />
          Demander un nom de domaine
        </CardTitle>
        <CardDescription>
          Réservation et configuration traitées manuellement par l&apos;équipe interne. Pas de disponibilité temps réel dans ce MVP.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTitle>Traitement manuel transparent</AlertTitle>
          <AlertDescription>
            Nous vérifions et configurons votre domaine côté équipe. Délai estimatif : 1 à 3 jours ouvrés selon la disponibilité.
          </AlertDescription>
        </Alert>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="requested-domain">Domaine souhaité</Label>
            <Input
              id="requested-domain"
              placeholder="exemple.fr"
              value={requestedDomain}
              onChange={(event) => setRequestedDomain(event.target.value)}
              disabled={disabled || isSubmitting}
              required
            />
            <p className="text-sm text-muted-foreground">Exemple : mon-activite.fr ou mon-activite.com</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alternative-domains">Variantes éventuelles</Label>
            <Textarea
              id="alternative-domains"
              placeholder={"mon-activite.com\nmon-activite.net"}
              value={alternativeDomains}
              onChange={(event) => setAlternativeDomains(event.target.value)}
              disabled={disabled || isSubmitting}
              rows={3}
            />
            <p className="text-sm text-muted-foreground">Une ligne ou une virgule par variante.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain-notes">Commentaire / besoin</Label>
            <Textarea
              id="domain-notes"
              placeholder="Précisez votre priorité, votre activité ou toute contrainte utile."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={disabled || isSubmitting}
              rows={4}
            />
          </div>

          <Button type="submit" disabled={disabled || isSubmitting || !requestedDomain.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              "Envoyer la demande"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default DomainRequestForm;
