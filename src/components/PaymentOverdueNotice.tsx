import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSession } from '@/components/SessionContextProvider';
import { fetchPennylaneInvoices } from '@/lib/pennylane-api';

export default function PaymentOverdueNotice() {
  const { session, profile } = useSession();
  const [overdueProfileId, setOverdueProfileId] = useState<string | null>(null);
  const profileId = profile?.id;
  const eligible = Boolean(
    profile?.pennylane_customer_id &&
    profileId === session?.user.id &&
    profile?.role !== 'admin' &&
    profile?.role !== 'accountant' &&
    !profile?.is_payment_suspended
  );

  useEffect(() => {
    if (!eligible || !profileId) return;
    let cancelled = false;

    const checkInvoices = async () => {
      try {
        const invoices = await fetchPennylaneInvoices();
        if (!cancelled) {
          setOverdueProfileId(invoices.some((invoice) => invoice.status === 'late') ? profileId : null);
        }
      } catch {
        // Ne pas afficher de rappel si le statut des factures ne peut pas être vérifié.
        if (!cancelled) setOverdueProfileId(null);
      }
    };

    void checkInvoices();
    window.addEventListener('focus', checkInvoices);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', checkInvoices);
    };
  }, [eligible, profileId]);

  if (!eligible || overdueProfileId !== profileId) return null;

  return (
    <Alert className="mb-4 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        Une ou plusieurs de vos factures sont en retard de paiement. Merci de régulariser votre situation. Si vous avez déjà effectué le règlement, veuillez ignorer ce rappel le temps de sa prise en compte.
        {' '}
        <Link to="/finances?tab=invoices" className="font-medium underline underline-offset-4">
          Voir mes factures
        </Link>
      </AlertDescription>
    </Alert>
  );
}
