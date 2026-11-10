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

export interface PaymentScore {
  score: number | null;
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
