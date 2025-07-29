import { supabase } from '../integrations/supabase/client';

export interface ReservationReport {
  id: string;
  user_id: string;
  reservation_id: string;
  problem_type: string;
  description: string | null;
  created_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
}

/**
 * Récupère tous les signalements de réservation pour l'admin.
 * Pour l'instant, nous les récupérons tous, sans filtrage de statut.
 */
export async function getAdminReservationReports(): Promise<ReservationReport[]> {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      id,
      reservation_id,
      problem_type,
      created_at,
      profiles (
        first_name,
        last_name
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erreur lors de la récupération des signalements de réservation (admin):", error);
    throw new Error(`Erreur lors de la récupération des signalements de réservation : ${error.message}`);
  }

  return data || [];
}