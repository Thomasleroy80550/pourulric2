import { supabase } from '@/integrations/supabase/client';

export interface Review {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  comment: string;
}

/**
 * Fetches reviews from the Revyoos API via a Supabase Edge Function.
 * @param holdingIds Optional array of holding IDs to filter reviews.
 */
export async function getReviews(holdingIds?: string[]): Promise<Review[]> {
  if (!holdingIds || holdingIds.length === 0) {
    return [];
  }

  try {
    const { data, error } = await supabase.functions.invoke('revyoos-proxy', {
      body: { holdingIds },
    });

    if (error) {
      throw error;
    }

    // The data returned from the function should already be in the correct format.
    return data;
  } catch (error: any) {
    console.error("Error fetching reviews from Revyoos proxy:", error);
    throw new Error(`Erreur lors de la récupération des avis : ${error.message}`);
  }
}