import { supabase } from "@/integrations/supabase/client";

export interface MigrationProgress {
  id: number;
  progress: number;
  housing_transferred: boolean;
  reservations_transferred: boolean;
  ota_connected: boolean;
  tests_completed: boolean;
  updated_at: string;
}

export const migrationSteps = [
  { key: "housing_transferred", label: "Logements transférés" },
  { key: "reservations_transferred", label: "Historique des réservations transféré" },
  { key: "ota_connected", label: "Logements connectés aux OTA" },
  { key: "tests_completed", label: "Contrôles et tests terminés" },
] as const;

export async function getMigrationProgress(): Promise<MigrationProgress> {
  const { data, error } = await supabase.from("migration_progress").select("*").eq("id", 1).single();
  if (error) throw new Error("Impossible de charger la progression de la migration.");
  return data;
}

export async function updateMigrationProgress(values: Omit<MigrationProgress, "id" | "updated_at">): Promise<MigrationProgress> {
  const { data, error } = await supabase.from("migration_progress")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", 1).select("*").single();
  if (error) throw new Error("Impossible d’enregistrer la progression de la migration.");
  return data;
}
