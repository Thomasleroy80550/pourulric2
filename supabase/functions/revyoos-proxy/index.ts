import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { sha1 } from 'https://esm.sh/js-sha1@0.7.0';
import { format, parseISO } from 'npm:date-fns';
import { fr } from 'npm:date-fns/locale/fr';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const REVOOYS_EMAIL = Deno.env.get('REVOOYS_EMAIL');
const REVOOYS_PASSWORD = Deno.env.get('REVOOYS_PASSWORD');
const API_BASE_URL = 'https://www.revyoos.com/lapi';

// Simple in-memory cache for the token.
let revyoosToken: string | null = null;
let tokenExpiry: number | null = null;

interface SignInResponse {
  b_valid: boolean;
  code: number;
  s_token?: string;
  s_message?: string;
}

interface RevyoosReviewDTO {
  _id: string;
  name_user_reviews: string;
  img_user_reviews: string;
  score_reviews: number;
  date: string;
  content_reviews: string;
  type_source_reviews: string; // Added field
}

interface ReviewsResponse {
  b_valid: boolean;
  code: number;
  a_reviews: RevyoosReviewDTO[];
  s_message?: string;
}

async function getRevyoosToken(): Promise<string> {
  if (revyoosToken && tokenExpiry && Date.now() < tokenExpiry) {
    return revyoosToken;
  }

  if (!REVOOYS_EMAIL || !REVOOYS_PASSWORD) {
    throw new Error("Revyoos credentials are not set in environment variables.");
  }

  const hashedPassword = sha1(REVOOYS_PASSWORD);
  const url = `${API_BASE_URL}/signin?email=${encodeURIComponent(REVOOYS_EMAIL)}&password=${hashedPassword}`;

  const response = await fetch(url);
  const data: SignInResponse = await response.json();

  if (!data.b_valid || !data.s_token) {
    throw new Error(`Revyoos sign-in failed: ${data.s_message || 'No token returned'}`);
  }

  revyoosToken = data.s_token;
  tokenExpiry = Date.now() + (60 * 60 * 1000); // Cache for 1 hour
  return revyoosToken;
}

// Helper function to fetch all reviews for a single holding, handling pagination.
async function fetchAllReviewsForHolding(id_holding: string, token: string): Promise<RevyoosReviewDTO[]> {
  let allHoldingReviews: RevyoosReviewDTO[] = [];
  let page = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const url = `${API_BASE_URL}/reviews?token=${token}&id_holding=${id_holding}&page=${page}`;
    const response = await fetch(url);
    const data: ReviewsResponse = await response.json();

    if (!data.b_valid || !data.a_reviews) {
      console.warn(`Failed to fetch Revyoos reviews for holding ${id_holding} on page ${page}: ${data.s_message || 'Invalid response'}`);
      hasMorePages = false; // Stop if the request is invalid
    } else if (data.a_reviews.length > 0) {
      allHoldingReviews = allHoldingReviews.concat(data.a_reviews);
      page++; // Prepare for the next page
    } else {
      hasMorePages = false; // No more reviews on this page, so we're done.
    }
  }
  return allHoldingReviews;
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Auth check
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { holdingIds } = await req.json();
    if (!holdingIds || !Array.isArray(holdingIds) || holdingIds.length === 0) {
      return new Response(JSON.stringify([]), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = await getRevyoosToken();

    // Use the new paginated fetch function for each holding ID.
    const reviewPromises = holdingIds.map(id_holding => 
      fetchAllReviewsForHolding(id_holding, token)
    );

    const results = await Promise.all(reviewPromises);
    const allReviews = results.flat();

    // Deduplicate reviews in case multiple holdings return the same review.
    const uniqueReviews = Array.from(new Map(allReviews.map(review => [review._id, review])).values());

    const formattedReviews = uniqueReviews.map((reviewDto) => ({
      id: reviewDto._id,
      author: reviewDto.name_user_reviews,
      avatar: reviewDto.img_user_reviews,
      rating: reviewDto.score_reviews,
      date: format(parseISO(reviewDto.date), 'd MMMM yyyy', { locale: fr }),
      comment: reviewDto.content_reviews,
      source: reviewDto.type_source_reviews, // Map the new field
    }));

    return new Response(JSON.stringify(formattedReviews), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in revyoos-proxy function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})