import { supabase } from "@/integrations/supabase/client";
import { maintenanceClient } from "@/integrations/supabase/maintenance-client";

export const migrationSteps = [
  { key: "backup_completed", label: "Sauvegarde des données effectuée" },
  { key: "housing_transferred", label: "Logements transférés" },
  { key: "owners_transferred", label: "Comptes propriétaires transférés" },
  { key: "reservations_transferred", label: "Historique des réservations transféré" },
  { key: "upcoming_reservations_verified", label: "Réservations à venir vérifiées" },
  { key: "rates_availability_synced", label: "Tarifs et disponibilités synchronisés" },
  { key: "ota_connected", label: "Logements connectés aux OTA" },
  { key: "financial_documents_transferred", label: "Documents et données financières transférés" },
  { key: "tests_completed", label: "Contrôles et tests terminés" },
  { key: "platform_reopened", label: "Plateforme propriétaire réouverte" },
] as const;

export type MigrationStepKey = typeof migrationSteps[number]["key"];
export type MigrationStepValues = Record<MigrationStepKey, number>;

export interface MigrationProgress extends MigrationStepValues {
  id: number;
  progress: number;
  updated_at: string;
}

export function calculateMigrationProgress(values: MigrationStepValues): number {
  return Math.round(migrationSteps.reduce((sum, step) => sum + values[step.key], 0) / migrationSteps.length * 10) / 10;
}

export async function getMigrationProgress(): Promise<MigrationProgress> {
  const { data, error } = await maintenanceClient.from("migration_progress").select("*").eq("id", 1).abortSignal(AbortSignal.timeout(12000)).single();
  if (error) throw new Error("Impossible de charger la progression de la migration.");
  return data;
}

export async function updateMigrationProgress(values: MigrationStepValues): Promise<MigrationProgress> {
  if (!migrationSteps.every((step) => Number.isInteger(values[step.key]) && values[step.key] >= 0 && values[step.key] <= 100)) {
    throw new Error("Chaque étape doit avoir un pourcentage entier entre 0 et 100.");
  }
  const { data, error } = await supabase.from("migration_progress")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", 1).select("*").single();
  if (error) throw new Error("Impossible d’enregistrer la progression de la migration.");
  return data;
}
