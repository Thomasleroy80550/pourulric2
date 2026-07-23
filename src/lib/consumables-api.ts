import { supabase } from "@/integrations/supabase/client";

/** Prix unitaire HT facturé par logement et par mois d'occupation. */
export const CONSUMABLE_UNIT_PRICE_HT = 2;

export interface ConsumableBilling {
  id: string;
  user_id: string;
  period: string;
  logement_count: number;
  unit_price_ht: number;
  total_ht: number;
  status: "pending" | "billed";
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Récupère toutes les lignes de facturation consommables pour une période donnée. (Admin)
 */
export async function getConsumableBillingsByPeriod(
  period: string,
): Promise<ConsumableBilling[]> {
  const { data, error } = await supabase
    .from("consumable_billings")
    .select("*")
    .eq("period", period)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching consumable billings:", error);
    throw new Error(
      `Erreur lors de la récupération des facturations consommables : ${error.message}`,
    );
  }
  return (data as ConsumableBilling[]) || [];
}

/**
 * Récupère les facturations consommables du client connecté.
 */
export async function getMyConsumableBillings(): Promise<ConsumableBilling[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("consumable_billings")
    .select("*")
    .eq("user_id", user.id)
    .order("period", { ascending: false });

  if (error) {
    console.error("Error fetching my consumable billings:", error);
    throw new Error(
      `Erreur lors de la récupération de vos consommables : ${error.message}`,
    );
  }
  return (data as ConsumableBilling[]) || [];
}

/**
 * Crée ou met à jour la facturation consommables d'un client pour une période. (Admin)
 * Le total HT est calculé automatiquement (logements × prix unitaire).
 */
export async function upsertConsumableBilling(params: {
  userId: string;
  period: string;
  logementCount: number;
  unitPriceHt?: number;
  notes?: string | null;
}): Promise<ConsumableBilling> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const unitPriceHt = params.unitPriceHt ?? CONSUMABLE_UNIT_PRICE_HT;
  const totalHt = Number((params.logementCount * unitPriceHt).toFixed(2));

  const { data, error } = await supabase
    .from("consumable_billings")
    .upsert(
      {
        user_id: params.userId,
        period: params.period,
        logement_count: params.logementCount,
        unit_price_ht: unitPriceHt,
        total_ht: totalHt,
        notes: params.notes ?? null,
        created_by: user?.id ?? null,
      },
      { onConflict: "user_id,period" },
    )
    .select("*")
    .single();

  if (error) {
    console.error("Error upserting consumable billing:", error);
    throw new Error(
      `Erreur lors de l'enregistrement de la facturation : ${error.message}`,
    );
  }
  return data as ConsumableBilling;
}

/**
 * Met à jour le statut d'une ligne de facturation (à facturer / facturé). (Admin)
 */
export async function setConsumableBillingStatus(
  id: string,
  status: "pending" | "billed",
): Promise<void> {
  const { error } = await supabase
    .from("consumable_billings")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("Error updating consumable billing status:", error);
    throw new Error(`Erreur lors de la mise à jour du statut : ${error.message}`);
  }
}

/**
 * Supprime une ligne de facturation consommables. (Admin)
 */
export async function deleteConsumableBilling(id: string): Promise<void> {
  const { error } = await supabase
    .from("consumable_billings")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting consumable billing:", error);
    throw new Error(`Erreur lors de la suppression : ${error.message}`);
  }
}
