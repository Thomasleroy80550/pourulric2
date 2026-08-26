import { UserProfile } from '@/lib/profile-api';

// Saisonnalité indicative de la location saisonnière sur le littoral (Baie de Somme)
export const SEASONAL_WEIGHTS: { month: string; short: string; weight: number }[] = [
  { month: 'Janvier', short: 'Jan', weight: 0.03 },
  { month: 'Février', short: 'Fév', weight: 0.05 },
  { month: 'Mars', short: 'Mar', weight: 0.05 },
  { month: 'Avril', short: 'Avr', weight: 0.08 },
  { month: 'Mai', short: 'Mai', weight: 0.08 },
  { month: 'Juin', short: 'Juin', weight: 0.10 },
  { month: 'Juillet', short: 'Juil', weight: 0.16 },
  { month: 'Août', short: 'Août', weight: 0.17 },
  { month: 'Septembre', short: 'Sep', weight: 0.09 },
  { month: 'Octobre', short: 'Oct', weight: 0.07 },
  { month: 'Novembre', short: 'Nov', weight: 0.05 },
  { month: 'Décembre', short: 'Déc', weight: 0.07 },
];

export interface EstimationData {
  reference: string;
  gross: number;
  grossMonthly: number;
  low: number;
  high: number;
  commissionRate: number | null;
  commissionAmount: number | null;
  net: number | null;
  netMonthly: number | null;
  monthlyBreakdown: { month: string; short: string; weight: number; amount: number }[];
}

export const formatEUR = (value: number) =>
  value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export function getEstimationReference(profile: UserProfile): string {
  return `EST-${new Date().getFullYear()}-${profile.id.slice(0, 6).toUpperCase()}`;
}

export function computeEstimation(profile: UserProfile): EstimationData {
  const gross = profile.estimated_revenue ?? 0;
  const commissionRate = profile.commission_rate ?? null;
  const commissionAmount = commissionRate !== null ? gross * (commissionRate / 100) : null;
  const net = commissionAmount !== null ? gross - commissionAmount : null;

  return {
    reference: getEstimationReference(profile),
    gross,
    grossMonthly: gross / 12,
    low: Math.round(gross * 0.9),
    high: Math.round(gross * 1.1),
    commissionRate,
    commissionAmount,
    net,
    netMonthly: net !== null ? net / 12 : null,
    monthlyBreakdown: SEASONAL_WEIGHTS.map(({ month, short, weight }) => ({
      month,
      short,
      weight,
      amount: Math.round(gross * weight),
    })),
  };
}
