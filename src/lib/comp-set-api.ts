import { supabase } from '@/integrations/supabase/client';

export interface CompSetAnalysis {
  userScore: number;
  averageCompetitorScore: number;
  competitorCount: number;
  maxScore: number;
}

/**
 * Fetches the competitive set analysis for the current user.
 */
export async function getCompSetAnalysis(): Promise<CompSetAnalysis> {
  const { data, error } = await supabase.functions.invoke('comp-set-analyzer');

  if (error) {
    const errorMessage = (error as any).context?.error || error.message;
    console.error("Error fetching competitive set analysis:", errorMessage);
    // Propagate a user-friendly error message
    if (errorMessage.includes("No rooms found") || errorMessage.includes("User city not found")) {
      throw new Error("Nous n'avons pas pu trouver votre logement principal pour l'analyse. Veuillez vous assurer que vos informations sont complètes.");
    }
    if (errorMessage.includes("No competitors found")) {
      throw new Error("Nous n'avons trouvé aucun concurrent similaire dans votre région pour le moment.");
    }
    throw new Error(`Erreur lors de la récupération de l'analyse concurrentielle : ${errorMessage}`);
  }

  return data;
}