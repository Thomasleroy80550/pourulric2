import { supabase } from '@/integrations/supabase/client';

export interface PerformanceAnalysis {
  occupancyRate: number;
  adr: number;
  revPar: number;
  totalBookedNights: number;
  totalRevenue: number;
  analysisPeriodDays: number;
}

/**
 * Fetches the performance analysis for the current user.
 */
export async function getPerformanceAnalysis(): Promise<PerformanceAnalysis> {
  const { data, error } = await supabase.functions.invoke('user-performance-analyzer');

  if (error) {
    const errorMessage = (error as any).context?.error?.message || (error as any).message || "An unknown error occurred";
    console.error("Error fetching performance analysis:", errorMessage);
    throw new Error(`Erreur lors de la récupération de l'analyse de performance : ${errorMessage}`);
  }

  return data;
}