import { UserProfile } from '@/lib/profile-api';

// Saisonnalité indicative de la location saisonnière sur le littoral (Baie de Somme).
// Janvier = 0 : fermeture annuelle de l'activité.
export const SEASONAL_WEIGHTS: { month: string; short: string; weight: number }[] = [
  { month: 'Janvier', short: 'Jan', weight: 0 },
  { month: 'Février', short: 'Fév', weight: 0.05 },
  { month: 'Mars', short: 'Mar', weight: 0.05 },
  { month: 'Avril', short: 'Avr', weight: 0.08 },
  { month: 'Mai', short: 'Mai', weight: 0.09 },
  { month: 'Juin', short: 'Juin', weight: 0.10 },
  { month: 'Juillet', short: 'Juil', weight: 0.17 },
  { month: 'Août', short: 'Août', weight: 0.17 },
  { month: 'Septembre', short: 'Sep', weight: 0.10 },
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
  /** Taux de commission TTC en pourcentage (ex : 26). Défaut : 26% comme dans la méthode de calcul officielle. */
  commissionRate: number;
  commissionAmount: number;
  net: number;
  netMonthly: number;
  monthlyBreakdown: { month: string; short: string; weight: number; amount: number }[];
}

// Taux par défaut (26% TTC), identique au générateur de relevés
export const DEFAULT_COMMISSION_RATE = 0.26;

// jsPDF (polices standard) ne sait pas afficher les espaces insécables du format fr-FR :
// on les remplace par des espaces classiques (sans impact visible sur la page web).
export const formatEUR = (value: number) =>
  value
    .toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
    .replace(/[\u202F\u00A0]/g, ' ');

export function getEstimationReference(profile: UserProfile): string {
  return `EST-${new Date().getFullYear()}-${profile.id.slice(0, 6).toUpperCase()}`;
}

export function computeEstimation(profile: UserProfile): EstimationData {
  const gross = profile.estimated_revenue ?? 0;
  // commission_rate est stocké en décimal (0.26 = 26% TTC), comme dans la fiche client admin
  const rateDecimal = profile.commission_rate || DEFAULT_COMMISSION_RATE;
  const commissionRate = Math.round(rateDecimal * 100 * 10) / 10;
  const commissionAmount = gross * rateDecimal;
  const net = gross - commissionAmount;

  return {
    reference: getEstimationReference(profile),
    gross,
    grossMonthly: gross / 12,
    low: Math.round(gross * 0.9),
    high: Math.round(gross * 1.1),
    commissionRate,
    commissionAmount,
    net,
    netMonthly: net / 12,
    monthlyBreakdown: SEASONAL_WEIGHTS.map(({ month, short, weight }) => ({
      month,
      short,
      weight,
      amount: Math.round(gross * weight),
    })),
  };
}
