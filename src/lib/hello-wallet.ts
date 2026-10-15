import { supabase } from '@/integrations/supabase/client';

export const euros = (cents: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
export const walletSteps = [
  { key: 'meeting', field: 'meeting_at', label: 'Propriétaire qualifié qui accepte un rendez-vous', cents: 1000 },
  { key: 'mandate', field: 'mandate_at', label: 'Signature du mandat de gestion', cents: 14000 },
  { key: 'booking', field: 'booking_at', label: 'Première réservation confirmée et non annulée', cents: 1000 },
] as const;
export interface WalletReferral {
  id: string; user_id: string; contact_name: string; contact_email: string; property_details: string;
  meeting_at: string | null; mandate_at: string | null; booking_at: string | null; cancelled_at: string | null; created_at: string;
}
export interface WalletEntry { id: string; user_id: string; amount_cents: number; description: string; created_at: string }
export interface WalletRequest {
  id: string; user_id: string; kind: 'cleaning' | 'invoice'; amount_cents: number; applied_cents: number | null;
  details: string; status: 'pending' | 'applied' | 'rejected'; reference: string | null; created_at: string;
}
export const requestLabels = { pending: 'En attente Hello Keys', applied: 'Imputée', rejected: 'Refusée · solde restitué' };
export async function loadWallet(userId?: string) {
  let entries = supabase.from('hello_wallet_entries').select('*').order('created_at', { ascending: false });
  let referrals = supabase.from('hello_wallet_referrals').select('*').order('created_at', { ascending: false });
  let requests = supabase.from('hello_wallet_requests').select('*').order('created_at', { ascending: false });
  if (userId) { entries = entries.eq('user_id', userId); referrals = referrals.eq('user_id', userId); requests = requests.eq('user_id', userId); }
  const results = await Promise.all([entries, referrals, requests]);
  for (const result of results) if (result.error) throw result.error;
  return { entries: results[0].data as WalletEntry[], referrals: results[1].data as WalletReferral[], requests: results[2].data as WalletRequest[] };
}
export function amountInCents(value: string) {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim())) throw new Error('Indiquez un montant en euros avec au maximum deux décimales.');
  const cents = Math.round(Number(value.replace(',', '.')) * 100);
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 100000000) throw new Error('Montant invalide.');
  return cents;
}
