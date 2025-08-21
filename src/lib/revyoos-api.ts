import { sha1 } from 'js-sha1';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// NOTE: Storing credentials directly in the code is not secure.
// These should be moved to secure environment variables.
const REVOOYS_EMAIL = 'contact@hellokeys.fr';
const REVOOYS_PASSWORD = '@Yolo80550';
const API_BASE_URL = 'https://www.revyoos.com/lapi';

let revyoosToken: string | null = null;

interface SignInResponse {
  b_valid: boolean;
  code: number;
  s_token?: string;
  s_message?: string;
}

interface RevyoosReviewDTO {
  id_review: string;
  s_name: string;
  s_photo: string;
  i_rating: number;
  d_created: string;
  s_comment: string;
}

interface ReviewsResponse {
  b_valid: boolean;
  code: number;
  reviews: RevyoosReviewDTO[];
  s_message?: string;
}

export interface Review {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  comment: string;
}

/**
 * Signs in to the Revyoos API to get a JWT token.
 * The token is cached in memory to avoid repeated sign-ins.
 */
async function signIn(): Promise<string> {
  if (revyoosToken) {
    return revyoosToken;
  }

  const hashedPassword = sha1(REVOOYS_PASSWORD);
  const url = `${API_BASE_URL}/signin?email=${encodeURIComponent(REVOOYS_EMAIL)}&password=${hashedPassword}`;

  const response = await fetch(url);
  const data: SignInResponse = await response.json();

  if (!data.b_valid || !data.s_token) {
    throw new Error(`Revyoos sign-in failed: ${data.s_message || 'No token returned'}`);
  }

  revyoosToken = data.s_token;
  return revyoosToken;
}

/**
 * Fetches reviews from the Revyoos API.
 * @param holdingIds Optional array of holding IDs to filter reviews.
 */
export async function getReviews(holdingIds?: string[]): Promise<Review[]> {
  if (!holdingIds || holdingIds.length === 0) {
    return [];
  }

  try {
    const token = await signIn();

    const reviewPromises = holdingIds.map(async (id_holding) => {
      const url = `${API_BASE_URL}/reviews?token=${token}&id_holding=${id_holding}`;
      const response = await fetch(url);
      const data: ReviewsResponse = await response.json();
      if (!data.b_valid || !data.reviews) {
        console.warn(`Failed to fetch Revyoos reviews for holding ${id_holding}: ${data.s_message || 'Invalid response'}`);
        return [];
      }
      return data.reviews;
    });

    const results = await Promise.all(reviewPromises);
    const allReviews = results.flat();

    // Remove duplicates, just in case
    const uniqueReviews = Array.from(new Map(allReviews.map(review => [review.id_review, review]))).values();

    // Transform the DTOs into the format expected by the UI
    return uniqueReviews.map((reviewDto) => ({
      id: reviewDto.id_review,
      author: reviewDto.s_name,
      avatar: reviewDto.s_photo,
      rating: reviewDto.i_rating,
      date: format(parseISO(reviewDto.d_created), 'd MMMM yyyy', { locale: fr }),
      comment: reviewDto.s_comment,
    }));
  } catch (error) {
    console.error("Error fetching reviews from Revyoos:", error);
    throw error;
  }
}