import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GRADE_LABELS, type PaymentGrade, type StoredPaymentScore } from '@/lib/payment-score-api';

const GRADE_STYLES: Record<PaymentGrade, string> = {
  A: 'bg-emerald-600 text-white hover:bg-emerald-600',
  B: 'bg-green-500 text-white hover:bg-green-500',
  C: 'bg-amber-500 text-white hover:bg-amber-500',
  D: 'bg-orange-600 text-white hover:bg-orange-600',
  E: 'bg-red-600 text-white hover:bg-red-600',
};

export default function PaymentGradeBadge({ stored }: { stored?: StoredPaymentScore }) {
  if (!stored) return <span className="text-xs text-muted-foreground">Non calculé</span>;

  const computedAt = new Date(stored.computed_at).toLocaleDateString('fr-FR');

  if (stored.error || !stored.grade || stored.score === null) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="cursor-help">—</Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>{stored.error ?? 'Historique insuffisant : aucune facture échue exploitable sur 12 mois.'}</p>
            <p className="mt-1 text-xs opacity-80">Calculé le {computedAt}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 cursor-help">
            <Badge className={`${GRADE_STYLES[stored.grade]} w-7 justify-center font-bold`}>{stored.grade}</Badge>
            {stored.grade === 'E' && <AlertTriangle className="h-4 w-4 text-red-600" aria-label="Alerte mauvais payeur" />}
            {stored.provisional && <span className="text-xs text-muted-foreground">*</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs space-y-1">
          <p className="font-medium">{GRADE_LABELS[stored.grade]} · {stored.score} / 100</p>
          <p>{stored.eligible_count} facture(s) notée(s), {stored.overdue_count} encore échue(s), retard max {stored.max_late_days} j.</p>
          {stored.provisional && <p className="text-xs">* Provisoire : moins de 3 factures ou {stored.excluded_count} exclue(s).</p>}
          <p className="text-xs opacity-80">Calculé le {computedAt}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
