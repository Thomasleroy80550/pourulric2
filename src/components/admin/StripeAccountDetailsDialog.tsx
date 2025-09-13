import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { getStripeAccount, StripeAccount } from '@/lib/admin-api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

interface StripeAccountDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  stripeAccountId: string | null;
}

const StripeAccountDetailsDialog: React.FC<StripeAccountDetailsDialogProps> = ({
  isOpen,
  onOpenChange,
  stripeAccountId,
}) => {
  const [account, setAccount] = useState<StripeAccount | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && stripeAccountId) {
      setLoading(true);
      setAccount(null);
      getStripeAccount(stripeAccountId)
        .then(setAccount)
        .catch((err) => toast.error(`Erreur: ${err.message}`))
        .finally(() => setLoading(false));
    }
  }, [isOpen, stripeAccountId]);

  const renderStatusBadge = (label: string, enabled: boolean) => (
    <Badge variant={enabled ? 'default' : 'destructive'}>
      {label}: {enabled ? 'Activé' : 'Désactivé'}
    </Badge>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Détails du Compte Stripe</DialogTitle>
          <DialogDescription>
            Informations détaillées pour le compte {stripeAccountId}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}
          {account && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><strong>ID:</strong> {account.id}</div>
                <div><strong>Email:</strong> {account.email || 'N/A'}</div>
                <div><strong>Nom:</strong> {account.settings?.dashboard?.display_name || account.business_profile?.name || 'N/A'}</div>
                <div><strong>Pays:</strong> {account.country}</div>
                <div><strong>Créé le:</strong> {format(new Date(account.created * 1000), 'dd/MM/yyyy HH:mm', { locale: fr })}</div>
                <div><strong>Type:</strong> {account.type}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {renderStatusBadge('Paiements entrants', account.charges_enabled)}
                {renderStatusBadge('Virements sortants', account.payouts_enabled)}
                <Badge variant={account.details_submitted ? 'default' : 'secondary'}>
                  Infos {account.details_submitted ? 'fournies' : 'requises'}
                </Badge>
              </div>
              
              {account.requirements?.currently_due?.length > 0 && (
                <Alert variant="destructive">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Actions requises !</AlertTitle>
                  <AlertDescription>
                    <p>Le compte a des exigences en attente :</p>
                    <ul className="list-disc pl-5 mt-2">
                      {account.requirements.currently_due.map(req => <li key={req}>{req}</li>)}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {account.requirements?.disabled_reason && (
                 <Alert variant="destructive">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Compte restreint</AlertTitle>
                  <AlertDescription>
                    Raison: {account.requirements.disabled_reason}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StripeAccountDetailsDialog;