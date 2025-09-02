import { supabase } from '@/integrations/supabase/client';

export interface PricePositionAnalysis {
  userAveragePrice: number;
  competitorAveragePrice: number;
  competitorCount: number;
}

/**
 * Fetches the price position analysis for the current user.
 */
export async function getPricePositionAnalysis(): Promise<PricePositionAnalysis> {
  const { data, error } = await supabase.functions.invoke('price-position-analyzer');

  if (error) {
    const errorMessage = (error as any).context?.error || error.message;
    console.error("Error fetching price position analysis:", errorMessage);
    throw new Error(`Erreur lors de la récupération de l'analyse du positionnement tarifaire : ${errorMessage}`);
  }

  return data;
}