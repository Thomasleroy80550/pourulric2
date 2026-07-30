import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ReceiptText,
  Moon,
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

const StepRow: React.FC<{ step: BreakdownStep }> = ({ step }) => {
  const Icon = step.icon;
  const isDeduction = step.kind === 'minus';
  const isResult = step.kind === 'result' || step.kind === 'final';

  return (
    <div
      className={
        isResult
          ? step.kind === 'final'
            ? 'rounded-lg border-2 border-green-600 bg-green-50 px-3 py-2'
            : 'rounded-lg border bg-muted/50 px-3 py-2'
          : 'px-3 py-1.5'
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={`shrink-0 rounded-md p-1.5 ${
              step.kind === 'final'
                ? 'bg-green-600 text-white'
                : isResult
                  ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]'
                  : isDeduction
                    ? 'bg-red-50 text-red-500'
                    : 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className={`truncate text-sm leading-tight ${isResult ? 'font-bold' : 'font-medium'}`}>
              {step.label}
            </p>
            <p className="truncate text-xs leading-tight text-muted-foreground">{step.explanation}</p>
          </div>
        </div>
        <p
          className={`shrink-0 text-sm font-bold tabular-nums ${
            step.kind === 'final' ? 'text-base text-green-700' : isDeduction ? 'text-red-600' : ''
          }`}
        >
          {isDeduction ? '− ' : ''}
          {fmt(step.amount)}
        </p>
      </div>
    </div>
  );
};

const FAQ_ITEMS = [
  {
    q: 'Pourquoi la taxe de séjour est-elle déduite ?',
    a: 'La taxe de séjour est payée par vos voyageurs en plus de leur séjour. Elle transite par le versement mais elle est intégralement reversée à la commune : elle ne fait jamais partie de vos revenus.',
  },
  {
    q: 'Pourquoi les frais de ménage sont-ils déduits ?',
    a: 'Les frais de ménage sont facturés à vos voyageurs à chaque réservation. Ils servent à financer le ménage professionnel réalisé entre chaque séjour : c\u2019est une somme qui transite, pas un revenu.',
  },
  {
    q: 'À quoi correspond la commission conciergerie ?',
    a: 'C\u2019est notre rémunération pour la gestion complète de votre bien : création et optimisation des annonces, communication avec les voyageurs, gestion des prix, coordination du ménage et du linge, assistance 7j/7.',
  },
  {
    q: 'Pourquoi les plateformes prélèvent-elles une commission ?',
    a: 'Airbnb, Booking ou Abritel prélèvent leur propre commission et des frais de traitement de paiement avant de reverser l\u2019argent. Ces montants ne transitent jamais par la conciergerie.',
  },
  {
    q: 'Le montant du virement ne correspond pas au « net » ?',
    a: 'Selon les cas, certaines sommes (commission, ménage) sont facturées séparément plutôt que déduites du virement. Le relevé PDF détaille toujours précisément ce qui est déduit et ce qui est facturé.',
  },
];

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
  const totalNuits = Number(totals.totalNuits) || sumOf('nuits');

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

  const reservationLines = lines.filter((r) => r && (r.voyageur || r.arrivee));

  // --- Répartition « en toute transparence » ---
  // Présentation à l'avantage du propriétaire : le ménage et la taxe sont
  // payés par les voyageurs (sommes qui transitent), les frais de plateforme
  // existent avec ou sans conciergerie. Le seul coût réel : la commission.
  const repartition = [
    { label: 'Pour vous', amount: Math.max(netProprio, 0), color: '#16a34a', note: undefined as string | undefined },
    { label: 'Commission conciergerie', amount: commission, color: '#0ea5e9', note: 'votre seul coût réel' },
    ...(hasPlatformDetails
      ? [
          {
            label: 'Plateformes (commission + frais)',
            amount: commissionPlateforme + fraisPaiement,
            color: '#f59e0b',
            note: 'identique avec ou sans conciergerie',
          },
        ]
      : []),
    { label: 'Ménage', amount: fraisMenage, color: '#8b5cf6', note: 'payé par vos voyageurs, pas par vous' },
    { label: 'Taxe de séjour', amount: taxeDeSejour, color: '#6b7280', note: 'payée par vos voyageurs, reversée à la commune' },
  ].filter((s) => s.amount > 0);
  const repartitionTotal = repartition.reduce((acc, s) => acc + s.amount, 0);

  const summaryTiles = [
    {
      label: 'Payé par les voyageurs',
      value: fmt(hasPlatformDetails ? totalPaye : montantVerse),
      icon: Users,
    },
    { label: 'Réservations', value: String(reservationLines.length || '—'), icon: ReceiptText },
    { label: 'Nuits', value: String(totalNuits || '—'), icon: Moon },
    { label: 'Net pour vous', value: fmt(netProprio), icon: PiggyBank, highlight: true },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[95vh] w-[96vw] max-w-3xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b bg-gradient-to-r from-[hsl(var(--primary))]/10 to-transparent px-5 pb-3 pt-5">
          <DialogTitle className="text-lg">Comprendre mon versement — {statement.period}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Du paiement de vos voyageurs jusqu'au montant qui vous revient.
          </DialogDescription>
        </DialogHeader>

        {/* ── Tuiles de synthèse ─────────────────────────── */}
        <div className="grid grid-cols-2 gap-2 px-5 pt-3 sm:grid-cols-4">
          {summaryTiles.map((tile) => (
            <div
              key={tile.label}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 ${
                tile.highlight ? 'border-green-600 bg-green-50' : 'bg-card'
              }`}
            >
              <div
                className={`shrink-0 rounded-md p-1.5 ${
                  tile.highlight ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'
                }`}
              >
                <tile.icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className={`truncate text-sm font-bold leading-tight ${tile.highlight ? 'text-green-700' : ''}`}>
                  {tile.value}
                </p>
                <p className="truncate text-[10px] leading-tight text-muted-foreground">{tile.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Onglets ────────────────────────────────────── */}
        <Tabs defaultValue="parcours" className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-3">
          <TabsList className="grid w-full shrink-0 grid-cols-4">
            <TabsTrigger value="parcours" className="text-xs sm:text-sm">Parcours</TabsTrigger>
            <TabsTrigger value="repartition" className="text-xs sm:text-sm">Répartition</TabsTrigger>
            <TabsTrigger value="reservations" className="text-xs sm:text-sm" disabled={reservationLines.length === 0}>
              Réservations
            </TabsTrigger>
            <TabsTrigger value="faq" className="text-xs sm:text-sm">FAQ</TabsTrigger>
          </TabsList>

          {/* Le parcours de l'argent */}
          <TabsContent value="parcours" className="mt-3 min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-1 rounded-xl border p-1.5">
              {steps.map((step) => (
                <StepRow key={step.label} step={step} />
              ))}
            </div>
          </TabsContent>

          {/* Répartition */}
          <TabsContent value="repartition" className="mt-3 min-h-0 flex-1 overflow-y-auto">
            {repartitionTotal > 0 ? (
              <div className="rounded-xl border p-4">
                <div className="flex h-4 w-full overflow-hidden rounded-full">
                  {repartition.map((seg) => (
                    <div
                      key={seg.label}
                      className="h-full"
                      style={{
                        width: `${(seg.amount / repartitionTotal) * 100}%`,
                        backgroundColor: seg.color,
                      }}
                    />
                  ))}
                </div>
                <div className="mt-3 space-y-1.5">
                  {repartition.map((seg) => (
                    <div key={seg.label} className="flex items-start justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-start gap-2">
                        <span
                          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: seg.color }}
                        />
                        <span className="min-w-0">
                          <span className="block truncate">{seg.label}</span>
                          {seg.note && (
                            <span className="block text-xs italic text-muted-foreground">{seg.note}</span>
                          )}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">{fmt(seg.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-2">
                  <p className="rounded-lg bg-green-50 p-2.5 text-xs text-green-800">
                    ✅ <span className="font-bold">Bon à savoir :</span> le ménage et la taxe de séjour sont
                    payés par vos voyageurs <span className="font-bold">en plus</span> du séjour — ils ne
                    viennent jamais de votre poche. Les frais de plateforme s'appliquent à toute location,
                    avec ou sans conciergerie.
                  </p>
                  {commission > 0 && (
                    <p className="rounded-lg bg-sky-50 p-2.5 text-xs text-sky-800">
                      💼 Votre seul coût réel sur cette période :{' '}
                      <span className="font-bold">{fmt(commission)}</span> de commission conciergerie. En
                      échange : annonces optimisées, gestion des voyageurs 7j/7, prix ajustés, ménage et
                      linge coordonnés — sans que vous ayez à lever le petit doigt.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucune donnée à afficher.</p>
            )}
          </TabsContent>

          {/* Réservations */}
          <TabsContent value="reservations" className="mt-3 min-h-0 flex-1 overflow-y-auto">
            <Accordion type="single" collapsible className="w-full rounded-xl border px-3">
              {reservationLines.map((r, i) => (
                <AccordionItem
                  key={i}
                  value={`resa-${i}`}
                  className={i === reservationLines.length - 1 ? 'border-b-0' : ''}
                >
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
          </TabsContent>

          {/* FAQ */}
          <TabsContent value="faq" className="mt-3 min-h-0 flex-1 overflow-y-auto">
            <Accordion type="single" collapsible className="w-full rounded-xl border px-3">
              {FAQ_ITEMS.map((item, i) => (
                <AccordionItem
                  key={item.q}
                  value={`faq-${i}`}
                  className={i === FAQ_ITEMS.length - 1 ? 'border-b-0' : ''}
                >
                  <AccordionTrigger className="py-3 text-left text-sm hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">{item.a}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default StatementBreakdownDialog;
