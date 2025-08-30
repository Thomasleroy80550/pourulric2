import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "./profile-api";

export interface Referral {
  id: string;
  created_at: string;
  referred_user: {
    first_name: string | null;
    last_name: string | null;
  };
}

export interface CreditTransaction {
  id: string;
  amount: number;
  description: string;
  created_at: string;
}

export async function getReferralHistory(): Promise<Referral[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('referrals')
    .select(`
      id,
      created_at,
      referred_user:profiles!referrals_referred_id_fkey (
        first_name,
        last_name
      )
    `)
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching referral history:", error);
    throw new Error("Erreur lors de la récupération de l'historique de parrainage.");
  }

  return data as unknown as Referral[];
}

export async function getCreditHistory(): Promise<CreditTransaction[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching credit history:", error);
        throw new Error("Erreur lors de la récupération de l'historique des crédits.");
    }

    return data;
}