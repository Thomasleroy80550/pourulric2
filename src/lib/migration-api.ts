import { supabase } from "@/integrations/supabase/client";
import { maintenanceClient } from "@/integrations/supabase/maintenance-client";

export interface MigrationProgress {
  id: number;
  progress: number;
  backup_completed: boolean;
  housing_transferred: boolean;
  owners_transferred: boolean;
  reservations_transferred: boolean;
  upcoming_reservations_verified: boolean;
  rates_availability_synced: boolean;
  ota_connected: boolean;
  financial_documents_transferred: boolean;
  tests_completed: boolean;
  platform_reopened: boolean;
  updated_at: string;
}

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

export async function getMigrationProgress(): Promise<MigrationProgress> {
  const { data, error } = await maintenanceClient.from("migration_progress").select("*").eq("id", 1).abortSignal(AbortSignal.timeout(12000)).single();
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
