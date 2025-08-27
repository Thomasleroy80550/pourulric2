import { supabase } from '@/integrations/supabase/client';
import { Review } from './revyoos-api';

export interface ReviewReply {
  id: string;
  user_id: string;
  review_id: string;
  reply_content: string;
  status: 'pending_approval' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  review_author?: string;
  review_date?: string;
  review_rating?: number;
  review_comment?: string;
}

/**
 * Submits a reply for a review. It will be stored with a 'pending_approval' status.
 * It will upsert based on user_id and review_id, allowing users to edit pending replies.
 * @param reviewId The ID of the review being replied to.
 * @param replyContent The content of the reply.
 * @param reviewDetails The details of the original review.
 */
export async function submitReviewReply(
  reviewId: string, 
  replyContent: string,
  reviewDetails: { author: string; date: string; rating: number; comment: string; }
): Promise<ReviewReply> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utilisateur non authentifié.");

  const { data, error } = await supabase
    .from('review_replies')
    .upsert({
      user_id: user.id,
      review_id: reviewId,
      reply_content: replyContent,
      status: 'pending_approval', // Always reset to pending on submission/update
      updated_at: new Date().toISOString(),
      review_author: reviewDetails.author,
      review_date: reviewDetails.date,
      review_rating: reviewDetails.rating,
      review_comment: reviewDetails.comment,
    }, { onConflict: 'user_id,review_id' })
    .select()
    .single();

  if (error) {
    console.error("Error submitting review reply:", error);
    throw new Error("Erreur lors de la soumission de la réponse.");
  }
  return data;
}

/**
 * Fetches all replies for the current user.
 */
export async function getReviewRepliesForUser(): Promise<ReviewReply[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('review_replies')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    console.error("Error fetching user review replies:", error);
    throw new Error("Impossible de récupérer les réponses aux avis.");
  }

  return data || [];
}