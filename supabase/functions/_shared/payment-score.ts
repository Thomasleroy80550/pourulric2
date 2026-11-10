export interface ScoreInvoice {
  id: number;
  invoice_number: string;
  amount: string;
  deadline: string | null;
  paid: boolean;
  status: string;
  draft: boolean;
}

export interface ScoreRow {
  id: number;
  number: string;
  amount: string;
  deadline: string | null;
  paymentDate: string | null;
  delayDays: number | null;
  state: 'paid' | 'overdue' | 'excluded';
  reason: string | null;
}

export function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString().slice(0, 10) === value;
}

export function scorePeriodStart(today: string): string {
  const [year, month, day] = today.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year - 1, month, 0)).getUTCDate();
  return `${year - 1}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}

export function makeScoreRow(invoice: ScoreInvoice, paymentDate: string | null, today: string): ScoreRow | null {
  const deadline = validDate(invoice.deadline) ? invoice.deadline : null;
  const row: ScoreRow = {
    id: invoice.id, number: invoice.invoice_number, amount: invoice.amount,
    deadline, paymentDate, delayDays: null, state: 'excluded', reason: null,
  };
  if (invoice.draft || ['draft', 'cancelled', 'credit_note', 'proforma', 'shipping_order', 'purchasing_order', 'estimate_pending', 'estimate_accepted', 'estimate_invoiced', 'estimate_denied'].includes(invoice.status)
    || !Number.isFinite(Number(invoice.amount)) || Number(invoice.amount) <= 0) return null;
  if (!deadline) return { ...row, reason: 'Échéance absente ou invalide' };
  // Les anciens impayés restent visibles pour ne pas améliorer artificiellement le score.
  if (deadline > today || (invoice.paid && deadline < scorePeriodStart(today))) return null;
  if (['archived', 'incomplete'].includes(invoice.status)) {
    return { ...row, reason: 'Facture archivée ou incomplète : validation nécessaire' };
  }
  if (invoice.status === 'partially_cancelled') {
    return { ...row, reason: 'Annulation partielle : validation nécessaire' };
  }
  if (!['paid', 'partially_paid', 'upcoming', 'late'].includes(invoice.status)
    || (invoice.status === 'paid') !== invoice.paid) {
    return { ...row, reason: 'Statut de règlement incohérent ou non pris en charge' };
  }
  if (invoice.paid && (!validDate(paymentDate) || paymentDate > today)) {
    return { ...row, paymentDate: null, reason: 'Aucune transaction bancaire rapprochée' };
  }
  if (!invoice.paid && deadline === today) return null;
  const end = invoice.paid ? paymentDate! : today;
  return {
    ...row, state: invoice.paid ? 'paid' : 'overdue', reason: null,
    delayDays: Math.max(0, Math.round((Date.parse(end) - Date.parse(deadline)) / 86400000)),
  };
}

export type PaymentGrade = 'A' | 'B' | 'C' | 'D' | 'E';

// E = alerte mauvais payeur.
export function scoreToGrade(score: number | null): PaymentGrade | null {
  if (score === null) return null;
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'E';
}

export function calculatePaymentScore(rows: ScoreRow[]) {
  const eligible = rows.filter(row => row.delayDays !== null);
  const late = eligible.filter(row => row.delayDays! > 0);
  const count = eligible.length;
  const excludedCount = rows.length - count;
  const punctualityPoints = count ? 60 * (1 - late.length / count) : 0;
  const durationPoints = count ? 40 * (1 - eligible.reduce((sum, row) => sum + Math.min(row.delayDays!, 60), 0) / (60 * count)) : 0;
  const score = count ? Math.round(punctualityPoints + durationPoints) : null;
  return {
    score,
    grade: scoreToGrade(score),
    punctualityPoints: Math.round(punctualityPoints * 10) / 10,
    durationPoints: Math.round(durationPoints * 10) / 10,
    eligibleCount: count,
    excludedCount,
    lateCount: late.length,
    overdueCount: eligible.filter(row => row.state === 'overdue').length,
    onTimeRate: count ? Math.round(100 * (count - late.length) / count) : null,
    averageLateDays: late.length ? Math.round(10 * late.reduce((sum, row) => sum + row.delayDays!, 0) / late.length) / 10 : 0,
    maxLateDays: late.length ? Math.max(...late.map(row => row.delayDays!)) : 0,
    provisional: count < 3 || excludedCount > 0,
  };
}
