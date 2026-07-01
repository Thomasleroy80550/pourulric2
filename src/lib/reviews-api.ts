import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getUserRooms } from './user-room-api';
import { fetchKrossbookingReservations } from './krossbooking';
import { getProfile } from './profile-api';

export interface Review {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  comment: string;
  source: string;
}

interface KrossReviewDTO {
  id_review: number;
  id_reservation?: number;
  id_room_type?: number;
  name_room_type?: string;
  date?: string;
  cod_channel?: string;
  review_title?: string;
  review_text?: string;
  rating?: number;
}

// Certaines OTA (ex: Booking) notent sur 10, on ramène tout sur une échelle de 5.
function normalizeRatingToFive(rating: number): number {
  if (!Number.isFinite(rating) || rating <= 0) return 0;
  const normalized = rating > 5 ? rating / 2 : rating;
  return Math.round(normalized * 10) / 10;
}

function formatReviewDate(value?: string): string {
  if (!value) return '';
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, 'd MMMM yyyy', { locale: fr }) : value;
}

function mapKrossReview(dto: KrossReviewDTO): Review {
  const title = (dto.review_title || '').trim();
  const text = (dto.review_text || '').trim();
  const comment = [title, text].filter(Boolean).join(' — ');

  return {
    id: String(dto.id_review),
    author: dto.name_room_type?.trim() || 'Client',
    avatar: '',
    rating: normalizeRatingToFive(Number(dto.rating)),
    date: formatReviewDate(dto.date),
    comment,
    source: dto.cod_channel || '',
  };
}

/**
 * Récupère les avis OTA via Krossbooking (remplace Revyoos).
 * Les avis sont filtrés selon les logements attribués à l'utilisateur :
 * on ne garde que les avis dont la réservation appartient à l'un de ses logements.
 * Les administrateurs voient tous les avis.
 */
export async function getReviews(): Promise<Review[]> {
  try {
    const [userRooms, profile] = await Promise.all([getUserRooms(), getProfile()]);

    const isAdmin = profile?.role === 'admin';

    if (!isAdmin && userRooms.length === 0) {
      return [];
    }

    const { data, error } = await supabase.functions.invoke('krossbooking-proxy', {
      body: { action: 'get_reviews' },
    });

    if (error) {
      console.error('Error fetching reviews from Krossbooking proxy:', error);
      return [];
    }

    const rawReviews = (data?.data ?? []) as KrossReviewDTO[];

    let scopedReviews = rawReviews;

    if (!isAdmin) {
      // Filtrage précis par logement : on récupère les réservations des logements
      // de l'utilisateur, puis on ne garde que les avis liés à ces réservations.
      const reservations = await fetchKrossbookingReservations(userRooms);
      const allowedReservationIds = new Set(reservations.map((reservation) => String(reservation.id)));

      scopedReviews = rawReviews.filter(
        (review) => review.id_reservation != null && allowedReservationIds.has(String(review.id_reservation)),
      );
    }

    const uniqueReviews = Array.from(
      new Map(scopedReviews.map((review) => [String(review.id_review), review])).values(),
    );

    return uniqueReviews.map(mapKrossReview);
  } catch (err) {
    console.error('Error fetching Krossbooking reviews:', err);
    return [];
  }
}

/**
 * Génère une synthèse des avis via l'Edge Function review-analyzer,
 * à partir des commentaires des avis récupérés via Krossbooking.
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
