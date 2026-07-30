import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { SavedInvoice } from '@/lib/admin-api';
import {
  Users,
  Globe,
  CreditCard,
  Banknote,
  Landmark,
  Sparkles,
  Percent,
  PiggyBank,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const fmt = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const safeDate = (value?: string) => {
  if (!value) return '';
  try {
    return format(parseISO(value), 'dd/MM/yyyy');
  } catch {
    return value;
  }
};

interface BreakdownStep {
  kind: 'start' | 'minus' | 'result' | 'final';
  label: string;
  explanation: string;
  amount: number;
  icon: React.ElementType;
}

interface StatementBreakdownDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  statement: SavedInvoice | null;
}

const StepRow: React.FC<{ step: BreakdownStep; maxAmount: number }> = ({ step, maxAmount }) => {
  const Icon = step.icon;
  const isDeduction = step.kind === 'minus';
  const isResult = step.kind === 'result' || step.kind === 'final';
  const barPct = maxAmount > 0 ? Math.max(2, (Math.abs(step.amount) / maxAmount) * 100) : 0;

  return (
    <div
      className={
        isResult
          ? step.kind === 'final'
            ? 'rounded-xl border-2 border-green-600 bg-green-50 p-3'
            : 'rounded-xl border bg-muted/50 p-3'
          : 'px-3 py-2'
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <div
            className={`mt-0.5 shrink-0 rounded-lg p-1.5 ${
              step.kind === 'final'
                ? 'bg-green-600 text-white'
                : isResult
                  ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]'
                  : isDeduction
                    ? 'bg-red-50 text-red-500'
                    : 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]'
            }`}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className={`text-sm ${isResult ? 'font-bold' : 'font-medium'}`}>{step.label}</p>
            <p className="text-xs text-muted-foreground">{step.explanation}</p>
          </div>
        </div>
        <p
          className={`shrink-0 text-sm font-bold tabular-nums ${
            step.kind === 'final'
              ? 'text-lg text-green-700'
              : isDeduction
                ? 'text-red-600'
                : ''
          }`}
        >
          {isDeduction ? '− ' : ''}
          {fmt(step.amount)}
        </p>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${
            step.kind === 'final' ? 'bg-green-600' : isDeduction ? 'bg-red-300' : 'bg-[hsl(var(--primary))]'
          }`}
          style={{ width: `${barPct}%` }}
        />
      </div>
    </div>
  );
};

const StatementBreakdownDialog: React.FC<StatementBreakdownDialogProps> = ({
  isOpen,
  onOpenChange,
  statement,
}) => {
  if (!statement) return null;

  const lines: any[] = Array.isArray(statement.invoice_data) ? statement.invoice_data : [];
  const sumOf = (key: string) => lines.reduce((acc, r) => acc + (Number(r?.[key]) || 0), 0);

  const totals = statement.totals || {};
  const totalPaye = sumOf('ca') || sumOf('originalTotalPaye');
  const commissionPlateforme = sumOf('originalCommissionPlateforme');
  const fraisPaiement = sumOf('originalFraisPaiement');
  const montantVerse = Number(totals.totalMontantVerse) || 0;
  const taxeDeSejour = Number(totals.totalTaxeDeSejour) || 0;
  const fraisMenage = (Number(totals.totalFraisMenage) || 0) + (Number(totals.ownerCleaningFee) || 0);
  const commission = Number(totals.totalCommission) || 0;
  const netProprio = montantVerse - taxeDeSejour - fraisMenage - commission;

  // Si le relevé ne contient pas le détail plateforme (relevés manuels),
  // la cascade démarre directement au montant reversé.
  const hasPlatformDetails = totalPaye > 0;

  const steps: BreakdownStep[] = [
    ...(hasPlatformDetails
      ? ([
          {
            kind: 'start',
            label: 'Total payé par vos voyageurs',
            explanation: 'Séjour + ménage + taxe de séjour, tout compris.',
            amount: totalPaye,
            icon: Users,
          },
          {
            kind: 'minus',
            label: 'Commission des plateformes',
            explanation: 'Prélevée par Airbnb, Booking, Abritel… avant tout reversement.',
            amount: commissionPlateforme,
            icon: Globe,
          },
          {
            kind: 'minus',
            label: 'Frais de paiement',
            explanation: 'Frais bancaires facturés par les plateformes sur chaque transaction.',
            amount: fraisPaiement,
            icon: CreditCard,
          },
        ] as BreakdownStep[])
      : []),
    {
      kind: 'result',
      label: 'Montant reversé par les plateformes',
      explanation: 'C\u2019est la somme réellement encaissée pour vos réservations.',
      amount: montantVerse,
      icon: Banknote,
    },
    {
      kind: 'minus',
      label: 'Taxe de séjour',
      explanation: 'Collectée auprès des voyageurs et reversée à la commune. Ce n\u2019est jamais votre argent.',
      amount: taxeDeSejour,
      icon: Landmark,
    },
    {
      kind: 'minus',
      label: 'Frais de ménage',
      explanation: 'Payés par les voyageurs, ils financent le ménage réalisé entre chaque séjour.',
      amount: fraisMenage,
      icon: Sparkles,
    },
    {
      kind: 'minus',
      label: 'Commission conciergerie',
      explanation: 'Notre rémunération pour la gestion complète : annonces, voyageurs, prix, linge…',
      amount: commission,
      icon: Percent,
    },
    {
      kind: 'final',
      label: 'Net dans votre poche',
      explanation: 'Le montant qui vous revient sur cette période.',
      amount: netProprio,
      icon: PiggyBank,
    },
  ];

  const maxAmount = Math.max(...steps.map((s) => Math.abs(s.amount)), 0);
  const reservationLines = lines.filter((r) => r && (r.voyageur || r.arrivee));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Comprendre mon versement — {statement.period}</DialogTitle>
          <DialogDescription>
            Du paiement de vos voyageurs jusqu'au montant qui vous revient, étape par étape.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow space-y-1 overflow-y-auto pr-1">
          {steps.map((step) => (
            <StepRow key={step.label} step={step} maxAmount={maxAmount} />
          ))}

          {reservationLines.length > 0 && (
            <div className="pt-3">
              <p className="mb-1 text-sm font-semibold">
                Les {reservationLines.length > 1 ? `${reservationLines.length} réservations` : 'réservations'} de ce relevé
              </p>
              <Accordion type="single" collapsible className="w-full">
                {reservationLines.map((r, i) => (
                  <AccordionItem key={i} value={`resa-${i}`}>
                    <AccordionTrigger className="py-3 text-sm hover:no-underline">
                      <span className="flex min-w-0 items-center gap-2 pr-2">
                        <span className="truncate font-medium">{r.voyageur || 'Voyageur'}</span>
                        {r.portail && (
                          <Badge variant="secondary" className="shrink-0 text-[10px] font-normal">
                            {r.portail}
                          </Badge>
                        )}
                      </span>
                      <span className="ml-auto shrink-0 pr-2 font-bold tabular-nums">
                        {fmt(Number(r.montantVerse) || 0)}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-1.5 rounded-lg bg-muted/50 p-3 text-sm">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {safeDate(r.arrivee)} → {safeDate(r.depart)}
                          </span>
                          <span>{Number(r.nuits) || 0} nuit(s)</span>
                        </div>
                        {Number(r.ca) > 0 && (
                          <div className="flex justify-between">
                            <span>Payé par le voyageur</span>
                            <span className="font-medium tabular-nums">{fmt(Number(r.ca) || 0)}</span>
                          </div>
                        )}
                        {Number(r.originalCommissionPlateforme) > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>Commission plateforme</span>
                            <span className="tabular-nums">− {fmt(Number(r.originalCommissionPlateforme))}</span>
                          </div>
                        )}
                        {Number(r.originalFraisPaiement) > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>Frais de paiement</span>
                            <span className="tabular-nums">− {fmt(Number(r.originalFraisPaiement))}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t pt-1.5 font-semibold">
                          <span>Montant reversé</span>
                          <span className="tabular-nums">{fmt(Number(r.montantVerse) || 0)}</span>
                        </div>
                        {Number(r.taxeDeSejour) > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>Taxe de séjour</span>
                            <span className="tabular-nums">− {fmt(Number(r.taxeDeSejour))}</span>
                          </div>
                        )}
                        {Number(r.fraisMenage) > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>Frais de ménage</span>
                            <span className="tabular-nums">− {fmt(Number(r.fraisMenage))}</span>
                          </div>
                        )}
                        {Number(r.commissionHelloKeys) > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>Commission conciergerie</span>
                            <span className="tabular-nums">− {fmt(Number(r.commissionHelloKeys))}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t pt-1.5 font-bold text-green-700">
                          <span>Net pour vous</span>
                          <span className="tabular-nums">
                            {fmt(
                              (Number(r.montantVerse) || 0) -
                                (Number(r.taxeDeSejour) || 0) -
                                (Number(r.fraisMenage) || 0) -
                                (Number(r.commissionHelloKeys) || 0),
                            )}
                          </span>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StatementBreakdownDialog;
