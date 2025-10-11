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

export async function generatePerformanceSummary(payload: {
  clientName: string;
  year: number;
  yearlyTotals: {
    totalCA: number;
    totalMontantVerse: number;
    totalFacture: number;
    totalNuits: number;
    totalReservations: number;
    totalVoyageurs: number;
    adr: number;
    revpar: number;
    yearlyOccupation: number;
    net: number;
  };
  monthlySeries: Array<{
    month: string;
    totalCA: number;
    totalMontantVerse: number;
    totalFacture: number;
    totalNuits: number;
    adr: number;
    revpar: number;
    occupation: number;
  }>;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke('performance-summary', {
    body: payload,
  });

  if (error) {
    const errorMessage = (error as any).context?.error?.message || (error as any).message || "An unknown error occurred";
    console.error("Error generating performance summary:", errorMessage);
    throw new Error(`Erreur lors de la génération de la synthèse : ${errorMessage}`);
  }

  return data?.summary || '';
}