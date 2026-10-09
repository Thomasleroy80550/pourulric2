import { supabase } from '@/integrations/supabase/client';

export interface PublicReviewsSummary {
  total: number;
  favorableTotal: number;
  average: number;
  globalAverage: number | null;
  badgeAverage: number | null;
  reviews: { id: number; rating: number; comment: string; source: string }[];
}

export async function getPublicReviews(): Promise<PublicReviewsSummary> {
  const { data, error } = await supabase.rpc('get_public_service_reviews');
  if (error) throw error;
  return data as PublicReviewsSummary;
}
