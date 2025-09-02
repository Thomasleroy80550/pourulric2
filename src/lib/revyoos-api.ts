import { supabase } from '@/integrations/supabase/client';

export interface Review {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  comment: string;
  source: string;
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

    return data;
  } catch (error: any) {
    console.error("Error fetching reviews from Revyoos proxy:", error);
    throw new Error(`Erreur lors de la récupération des avis : ${error.message}`);
  }
}

/**
 * Fetches a synthesis from the review-analyzer Supabase Edge Function.
 * @param holdingIds Array of holding IDs to analyze reviews for.
 */
export async function getReviewSynthesis(holdingIds?: string[]): Promise<string> {
  if (!holdingIds || holdingIds.length === 0) {
    return "";
  }

  try {
    const { data, error } = await supabase.functions.invoke('review-analyzer', {
      body: { holdingIds },
    });

    if (error) {
      throw error;
    }

    return data as string;
  } catch (error: any) {
    console.error("Error fetching synthesis from review-analyzer proxy:", error);
    throw new Error(`Erreur lors de la récupération de la synthèse des avis : ${error.message}`);
  }
}