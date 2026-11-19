import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { maintenanceClient } from "@/integrations/supabase/maintenance-client";

export const REOPENING_TIME = new Date("2026-11-19T19:30:00+01:00").getTime();

export function useReopened(): boolean {
  const [reopened, setReopened] = useState(() => Date.now() >= REOPENING_TIME);
  useEffect(() => {
    const remaining = REOPENING_TIME - Date.now();
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setReopened(true), remaining + 250);
    return () => window.clearTimeout(timer);
  }, []);
  return reopened;
}

export const migrationSteps = [
  { key: "backup_completed", label: "Sauvegarde des données" },
  { key: "housing_transferred", label: "Transfert des logements" },
  { key: "owners_transferred", label: "Transfert des comptes propriétaires" },
  { key: "reservations_transferred", label: "Transfert de l’historique des réservations" },
  { key: "upcoming_reservations_verified", label: "Vérification des réservations à venir" },
  { key: "rates_availability_synced", label: "Synchronisation des tarifs et disponibilités" },
  { key: "ota_connected", label: "Connexion des logements aux OTA" },
  { key: "financial_documents_transferred", label: "Transfert des documents et données financières" },
  { key: "tests_completed", label: "Contrôles et tests" },
  { key: "platform_reopened", label: "Réouverture de la plateforme propriétaire" },
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
