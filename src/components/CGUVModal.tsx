import React, { useState } from 'react';
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

interface CGUVModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}

const CGUV_TEXT = `
<p>Bienvenue sur Hello Keys !</p>

<p>Veuillez lire attentivement les Conditions Générales d'Utilisation (CGUV) suivantes. En utilisant nos services, vous acceptez d'être lié par ces conditions.</p>

<p><strong>1. Acceptation des Conditions</strong><br/>
En accédant et en utilisant la plateforme Hello Keys, vous reconnaissez avoir lu, compris et accepté d'être lié par les présentes CGUV, ainsi que par notre Politique de Confidentialité. Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser nos services.</p>

<p><strong>2. Description du Service</strong><br/>
Hello Keys est une plateforme de gestion locative qui vous aide à gérer vos propriétés, réservations, finances et communications avec les clients. Nous fournissons des outils pour la synchronisation des calendriers, le suivi des performances, la gestion des tâches de ménage et l'accès à des rapports financiers.</p>

<p><strong>3. Accès et Utilisation</strong><br/>
L'accès à certaines fonctionnalités de la plateforme nécessite la création d'un compte utilisateur. Vous êtes responsable de la confidentialité de vos identifiants de connexion et de toutes les activités qui se déroulent sous votre compte. Vous vous engagez à fournir des informations exactes, complètes et à jour lors de votre inscription et de l'utilisation de nos services.</p>

<p><strong>4. Propriété Intellectuelle</strong><br/>
Tous les contenus, marques, logos et autres éléments de la plateforme Hello Keys sont la propriété exclusive de Hello Keys ou de ses concédants de licence. Toute reproduction, distribution, modification ou utilisation sans autorisation écrite préalable est strictement interdite.</p>

<p><strong>5. Données Personnelles</strong><br/>
Nous collectons et utilisons vos données personnelles conformément à notre Politique de Confidentialité. En utilisant nos services, vous consentez à cette collecte et utilisation.</p>

<p><strong>6. Limitation de Responsabilité</strong><br/>
Hello Keys s'efforce de maintenir la plateforme opérationnelle et exempte d'erreurs, mais ne garantit pas une disponibilité ininterrompue ou l'absence de bugs. Nous ne serons pas responsables des dommages directs, indirects, accessoires ou consécutifs résultant de l'utilisation ou de l'incapacité d'utiliser nos services.</p>

<p><strong>7. Modifications des CGUV</strong><br/>
Nous nous réservons le droit de modifier les présentes CGUV à tout moment. Toute modification sera effective dès sa publication sur la plateforme. Votre utilisation continue de nos services après la publication des modifications constitue votre acceptation de ces modifications.</p>

<p><strong>8. Droit Applicable et Juridiction</strong><br/>
Les présentes CGUV sont régies par le droit français. Tout litige relatif à l'interprétation ou à l'exécution des présentes CGUV sera soumis à la compétence exclusive des tribunaux de Paris, France.</p>

<p>En cochant la case ci-dessous, vous confirmez avoir lu et accepté les Conditions Générales d'Utilisation de Hello Keys.</p>
`;

const CGUVModal: React.FC<CGUVModalProps> = ({ isOpen, onOpenChange, onAccept }) => {
  const [hasAccepted, setHasAccepted] = useState(false);

  // Reset checkbox state when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setHasAccepted(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] md:max-w-[700px] lg:max-w-3xl max-h-[90vh] flex flex-col"> {/* Increased max-width */}
        <DialogHeader>
          <DialogTitle>Conditions Générales d'Utilisation (CGUV)</DialogTitle>
          <DialogDescription>
            Veuillez lire et accepter nos conditions pour continuer à utiliser l'application.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow p-4 border rounded-md bg-gray-50 dark:bg-gray-800 text-sm leading-relaxed max-h-[calc(90vh-200px)]"> {/* Added explicit max-height for scroll */}
          <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: CGUV_TEXT }} /> {/* Render HTML */}
        </ScrollArea>
        <div className="flex items-center space-x-2 mt-4">
          <Checkbox
            id="cguv-accept"
            checked={hasAccepted}
            onCheckedChange={(checked) => setHasAccepted(!!checked)}
          />
          <Label htmlFor="cguv-accept" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            J'ai lu et j'accepte les Conditions Générales d'Utilisation.
          </Label>
        </div>
        <DialogFooter className="mt-4">
          <Button onClick={onAccept} disabled={!hasAccepted}>
            Valider et Continuer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CGUVModal;