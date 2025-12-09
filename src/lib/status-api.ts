import { supabase } from "@/integrations/supabase/client";

export type ServiceStatusValue = 'operational' | 'degraded' | 'outage' | 'maintenance';

export interface ServiceStatus {
  id: string;
  service_key: string;
  name: string;
  status: ServiceStatusValue;
  message?: string | null;
  created_at: string;
  updated_at: string;
}

export async function getServiceStatuses(): Promise<ServiceStatus[]> {
  const { data, error } = await supabase
    .from('service_statuses')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error("Error fetching service statuses:", error);
    throw new Error("Erreur lors de la récupération des statuts des services.");
  }
  return data || [];
}

export async function upsertServiceStatus(payload: {
  id?: string;
  service_key: string;
  name: string;
  status: ServiceStatusValue;
  message?: string | null;
}): Promise<ServiceStatus> {
  const { data, error } = await supabase
    .from('service_statuses')
    .upsert({
      id: payload.id,
      service_key: payload.service_key,
      name: payload.name,
      status: payload.status,
      message: payload.message ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'service_key' })
    .select('*')
    .single();

  if (error) {
    console.error("Error upserting service status:", error);
    throw new Error("Erreur lors de l'enregistrement du statut.");
  }
  return data;
}

export async function deleteServiceStatus(id: string): Promise<void> {
  const { error } = await supabase
    .from('service_statuses')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error deleting service status:", error);
    throw new Error("Erreur lors de la suppression du statut.");
  }
}