import { supabase } from '@/integrations/supabase/client';

export interface PaymentScoreRow {
  id: number;
  number: string;
  amount: string;
  deadline: string | null;
  paymentDate: string | null;
  delayDays: number | null;
  state: 'paid' | 'overdue' | 'excluded';
  reason: string | null;
}

export type PaymentGrade = 'A' | 'B' | 'C' | 'D' | 'E';

export interface StoredPaymentScore {
  user_id: string;
  score: number | null;
  grade: PaymentGrade | null;
  eligible_count: number;
  excluded_count: number;
  overdue_count: number;
  max_late_days: number;
  provisional: boolean;
  error: string | null;
  computed_at: string;
}

export const GRADE_LABELS: Record<PaymentGrade, string> = {
  A: 'Excellent payeur (90–100)',
  B: 'Bon payeur (75–89)',
  C: 'Retards occasionnels (60–74)',
  D: 'Retards fréquents (40–59)',
  E: 'Alerte mauvais payeur (< 40)',
};

export async function getStoredPaymentScores(): Promise<Record<string, StoredPaymentScore>> {
  const { data, error } = await supabase.from('client_payment_scores').select('*');
  if (error) throw new Error(error.message);
  return Object.fromEntries((data as StoredPaymentScore[]).map(row => [row.user_id, row]));
}

export interface PaymentScore {
  score: number | null;
  grade: PaymentGrade | null;
  punctualityPoints: number;
  durationPoints: number;
  eligibleCount: number;
  excludedCount: number;
  lateCount: number;
  overdueCount: number;
  onTimeRate: number | null;
  averageLateDays: number;
  maxLateDays: number;
  provisional: boolean;
  rows: PaymentScoreRow[];
  today: string;
  periodStart: string;
  agency: string;
  customerName: string;
  calculatedAt: string;
}

export async function fetchClientPaymentScore(userId: string): Promise<PaymentScore> {
  const { data, error } = await supabase.functions.invoke('client-payment-score', { body: { userId } });
  if (error) {
    const response = error.context;
    if (response instanceof Response) {
      const details = await response.json().catch(() => null);
      if (typeof details?.error === 'string') throw new Error(details.error);
    }
    throw new Error(error.message || 'Impossible de charger le score de paiement.');
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
