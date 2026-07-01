import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface Review {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  comment: string;
  source: string;
}

interface KrossbookingReviewRow {
  id_review: number;
  room_name: string | null;
  name_room_type: string | null;
  review_date: string | null;
  cod_channel: string | null;
  review_title: string | null;
  review_text: string | null;
  rating: number | null;
}

// Certaines OTA (ex: Booking) notent sur 10, on ramène tout sur une échelle de 5.
function normalizeRatingToFive(rating: number | null): number {
  if (rating === null || !Number.isFinite(rating) || rating <= 0) return 0;
  const normalized = rating > 5 ? rating / 2 : rating;
  return Math.round(normalized * 10) / 10;
}

function formatReviewDate(value: string | null): string {
  if (!value) return '';
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, 'd MMMM yyyy', { locale: fr }) : value;
}

function mapRow(row: KrossbookingReviewRow): Review {
  const title = (row.review_title || '').trim();
  const text = (row.review_text || '').trim();
  const comment = [title, text].filter(Boolean).join(' — ');

  return {
    id: String(row.id_review),
    author: row.room_name?.trim() || row.name_room_type?.trim() || 'Client',
    avatar: '',
    rating: normalizeRatingToFive(row.rating),
    date: formatReviewDate(row.review_date),
    comment,
    source: row.cod_channel || '',
  };
}

/**
 * Récupère les avis OTA de l'utilisateur depuis la table `krossbooking_reviews`,
 * alimentée quotidiennement par le scan global (edge function scan-krossbooking-reviews).
 * Le RLS garantit que chaque utilisateur ne voit que ses avis (les admins voient tout).
 */
export async function getReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from('krossbooking_reviews')
    .select('id_review, room_name, name_room_type, review_date, cod_channel, review_title, review_text, rating')
    .order('review_date', { ascending: false });

  if (error) {
    console.error('Error fetching reviews from krossbooking_reviews:', error);
    return [];
  }

  return ((data ?? []) as KrossbookingReviewRow[]).map(mapRow);
}

/**
 * Génère une synthèse des avis via l'Edge Function review-analyzer,
 * à partir des commentaires des avis récupérés.
 */
export async function getReviewSynthesis(reviews: Review[]): Promise<string> {
  const comments = reviews.map((review) => review.comment).filter(Boolean);
  if (comments.length === 0) {
    return '';
  }

  const { data, error } = await supabase.functions.invoke('review-analyzer', {
    body: { comments },
  });

  if (error) {
    console.error('Error fetching synthesis from review-analyzer:', error);
    return '';
  }

  return (data as string) ?? '';
}
