import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getReservationSources, type ReservationSource } from './channel-reservations-api';
import { advanceChannelReviewsSync, startChannelReviewsSync } from './channel-features-api';

export interface Review {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  /** Date ISO brute pour les agrégations/graphiques. */
  rawDate: string;
  comment: string;
  source: string;
}

interface ChannelReviewRow {
  property_id: string;
  agency_id: string;
  environment: string;
  review_id: string;
  channel_id: string | null;
  title: string | null;
  content: string | null;
  reviewer_name: string | null;
  rating: number | null;
  rating_scale: number | null;
  created_label: string | null;
  payload: Record<string, unknown>;
  imported_at: string;
}

function normalizeRatingToFive(rating: number | null, ratingScale: number | null): number {
  if (rating === null || !Number.isFinite(rating) || rating <= 0) return 0;
  if (ratingScale && ratingScale > 0) return Math.round((rating / ratingScale) * 50) / 10;
  const normalized = rating > 5 ? rating / 2 : rating;
  return Math.round(normalized * 10) / 10;
}

function payloadDate(payload: Record<string, unknown>): string | null {
  const value = ['created_at', 'createdAt', 'review_date', 'reviewDate', 'date']
    .map(key => payload[key])
    .find(item => typeof item === 'string' && isValid(parseISO(item)));
  return typeof value === 'string' ? value : null;
}

function formatReviewDate(value: string | null, fallback: string | null): string {
  if (value) {
    const parsed = parseISO(value);
    if (isValid(parsed)) return format(parsed, 'd MMMM yyyy', { locale: fr });
  }
  return fallback || '';
}

function mapRow(row: ChannelReviewRow): Review {
  const title = (row.title || '').trim();
  const text = (row.content || '').trim();
  const rawDate = payloadDate(row.payload) || row.imported_at;

  return {
    id: `${row.property_id}:${row.review_id}`,
    author: row.reviewer_name?.trim() || 'Voyageur',
    avatar: '',
    rating: normalizeRatingToFive(row.rating, row.rating_scale),
    date: formatReviewDate(rawDate, row.created_label),
    rawDate,
    comment: [title, text].filter(Boolean).join(' — '),
    source: row.channel_id || 'CADENCE',
  };
}

async function getAllSources(): Promise<ReservationSource[]> {
  const sources: ReservationSource[] = [];
  let cursor: string | null = null;
  do {
    const page = await getReservationSources(cursor);
    sources.push(...page.sources);
    cursor = page.next_cursor;
  } while (cursor);
  return sources;
}

async function syncSourceReviews(source: ReservationSource): Promise<void> {
  let job = await startChannelReviewsSync(source.id, false, true);
  let guard = 0;
  while (job.status === 'syncing' && guard < 100) {
    job = await advanceChannelReviewsSync(job.job_id);
    guard += 1;
  }
}

/** Synchronise les avis Cadence du propriétaire connecté au maximum une fois par 24 h par logement. */
async function syncCurrentOwnerReviews(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', auth.user.id).maybeSingle();
  if (profile?.role !== 'user') return;

  const sources = await getAllSources();
  for (const source of sources) {
    try {
      await syncSourceReviews(source);
    } catch (error) {
      console.warn('Cadence review synchronization skipped:', error);
    }
  }
}

/** Récupère les avis Cadence persistés côté serveur ; le RLS limite chaque propriétaire à ses logements attribués. */
export async function getReviews(): Promise<Review[]> {
  try {
    await syncCurrentOwnerReviews();
  } catch (error) {
    console.warn('Cadence review synchronization unavailable:', error);
  }

  const PAGE_SIZE = 1000;
  const allRows: ChannelReviewRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('channel_reviews')
      .select('property_id,agency_id,environment,review_id,channel_id,title,content,reviewer_name,rating,rating_scale,created_label,payload,imported_at')
      .order('imported_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('Error fetching reviews from channel_reviews:', error);
      return allRows.map(mapRow);
    }

    const rows = (data ?? []) as ChannelReviewRow[];
    allRows.push(...rows);

    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRows.map(mapRow).sort((a, b) => Date.parse(b.rawDate) - Date.parse(a.rawDate));
}

/** Génère une synthèse des avis via l'Edge Function review-analyzer. */
export async function getReviewSynthesis(reviews: Review[]): Promise<string> {
  const comments = reviews.map((review) => review.comment).filter(Boolean);
  if (comments.length === 0) return '';

  const { data, error } = await supabase.functions.invoke('review-analyzer', {
    body: { comments },
  });

  if (error) {
    console.error('Error fetching synthesis from review-analyzer:', error);
    return '';
  }

  return (data as string) ?? '';
}
