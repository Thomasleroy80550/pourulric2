import { supabase } from '@/integrations/supabase/client';

export const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
export type StatsSource = 'all' | 'generated' | 'manual';
export type Metric = 'revenue' | 'commission' | 'cleaning' | 'billed' | 'payouts' | 'tax' | 'nights' | 'guests';
export interface StatsInvoice {
  id: string;
  user_id: string;
  period: string;
  source_type: string;
  is_paid: boolean | null;
  totals: Record<string, unknown>;
}
export interface StatsMonth extends Record<Metric, number> {
  period: string;
  year: string;
  month: number;
  key: string;
  invoices: number;
  generated: number;
  manual: number;
  owners: string[];
  paid: number;
  unpaid: number;
  paymentUnknown: number;
  paidAmount: number;
  unpaidAmount: number;
  coverage: Record<Metric, number>;
}
export const METRICS: Metric[] = ['revenue', 'commission', 'cleaning', 'billed', 'payouts', 'tax', 'nights', 'guests'];
const KEYS: Record<Metric, string> = {
  revenue: 'totalRevenuGenere', commission: 'totalCommission', cleaning: 'totalFraisMenage',
  billed: 'totalFacture', payouts: 'totalMontantVerse', tax: 'totalTaxeDeSejour', nights: 'totalNuits', guests: 'totalVoyageurs',
};

export async function fetchHelloKeysInvoices(): Promise<StatsInvoice[]> {
  const invoices: StatsInvoice[] = [];
  // La pagination évite la limite de 1 000 lignes de l'API Supabase.
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('invoices')
      .select('id, user_id, period, totals, source_type, is_paid')
      .order('id').range(offset, offset + 499);
    if (error) throw new Error(error.message);
    invoices.push(...(data as StatsInvoice[]));
    if (data.length < 500) break;
  }
  return invoices;
}

export function aggregateMonths(invoices: StatsInvoice[], source: StatsSource): { months: StatsMonth[]; excluded: number } {
  const map = new Map<string, StatsMonth>();
  let excluded = 0;
  for (const invoice of invoices) {
    if (source !== 'all' && invoice.source_type !== source) continue;
    const match = invoice.period.trim().match(/^(\S+)\s+(\d{4})$/);
    const month = match ? MONTHS.findIndex(name => name.toLocaleLowerCase('fr-FR') === match[1].toLocaleLowerCase('fr-FR')) : -1;
    if (!match || month < 0) { excluded++; continue; }
    const year = match[2];
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, {
      period: `${MONTHS[month]} ${year}`, year, month, key,
      revenue: 0, commission: 0, cleaning: 0, billed: 0, payouts: 0, tax: 0, nights: 0, guests: 0,
      invoices: 0, generated: 0, manual: 0, owners: [], paid: 0, unpaid: 0, paymentUnknown: 0, paidAmount: 0, unpaidAmount: 0,
      coverage: { revenue: 0, commission: 0, cleaning: 0, billed: 0, payouts: 0, tax: 0, nights: 0, guests: 0 },
    });
    const row = map.get(key)!;
    const manual = invoice.source_type === 'manual';
    row.invoices++;
    row[manual ? 'manual' : 'generated']++;
    if (!row.owners.includes(invoice.user_id)) row.owners.push(invoice.user_id);
    for (const metric of METRICS) {
      // La saisie manuelle stocke le CA dans totalCA et des zéros techniques pour les postes non renseignés.
      if (manual && ['commission', 'cleaning', 'tax'].includes(metric)) continue;
      const value = invoice.totals?.[manual && metric === 'revenue' ? 'totalCA' : KEYS[metric]];
      if (value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))) {
        row[metric] += Number(value);
        row.coverage[metric]++;
      }
    }
    const billed = invoice.totals?.totalFacture;
    const amount = billed != null && Number.isFinite(Number(billed)) ? Number(billed) : 0;
    if (manual || invoice.is_paid === null) row.paymentUnknown++;
    else if (invoice.is_paid) { row.paid++; row.paidAmount += amount; }
    else { row.unpaid++; row.unpaidAmount += amount; }
  }
  return { months: [...map.values()].sort((a, b) => a.key.localeCompare(b.key)), excluded };
}

export function summarizeMonths(months: StatsMonth[]) {
  return {
    ...Object.fromEntries(METRICS.map(metric => [metric, months.reduce((sum, row) => sum + row[metric], 0)])) as Record<Metric, number>,
    invoices: months.reduce((sum, row) => sum + row.invoices, 0),
    owners: new Set(months.flatMap(row => row.owners)).size,
    generated: months.reduce((sum, row) => sum + row.generated, 0),
    manual: months.reduce((sum, row) => sum + row.manual, 0),
    paid: months.reduce((sum, row) => sum + row.paid, 0),
    unpaid: months.reduce((sum, row) => sum + row.unpaid, 0),
    paymentUnknown: months.reduce((sum, row) => sum + row.paymentUnknown, 0),
    paidAmount: months.reduce((sum, row) => sum + row.paidAmount, 0),
    unpaidAmount: months.reduce((sum, row) => sum + row.unpaidAmount, 0),
    coverage: Object.fromEntries(METRICS.map(metric => [metric, months.reduce((sum, row) => sum + row.coverage[metric], 0)])) as Record<Metric, number>,
  };
}

export const money = (value: number) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
export const number = (value: number) => value.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
export const percent = (value: number) => `${number(value)} %`;
export function change(current: number, previous: number): number | null {
  return previous > 0 ? (current - previous) / previous * 100 : null;
}
