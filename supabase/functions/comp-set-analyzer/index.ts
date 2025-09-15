import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define which boolean fields from user_rooms contribute to the score
const scoringFields = [
  'has_alarm_or_cctv',
  'parking_badge_or_disk',
  'is_non_smoking',
  'are_pets_allowed',
  'has_baby_cot',
  'has_high_chair',
  'has_cleaning_equipment',
  'has_house_manual',
  'has_smoke_detector',
  'has_co_detector'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get('Authorization')!;
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authorization } } }
    );

    const { data: { user }, error: authError } = await userSupabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const adminSupabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Get the user's primary room
    const { data: userRooms, error: userRoomsError } = await adminSupabaseClient
      .from('user_rooms')
      .select('property_type, wifi_code, parking_info, has_alarm_or_cctv, parking_badge_or_disk, is_non_smoking, are_pets_allowed, has_baby_cot, has_high_chair, has_cleaning_equipment, has_house_manual, has_smoke_detector, has_co_detector')
      .eq('user_id', user.id)
      .limit(1);

    if (userRoomsError) throw userRoomsError;
    if (!userRooms || userRooms.length === 0) {
      return new Response(JSON.stringify({ error: "No rooms found for the user." }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userRoom = userRooms[0];

    // 2. Find competitors based on property_type only (no city filter)
    const { data: competitorProfiles, error: competitorsError } = await adminSupabaseClient
      .from('profiles')
      .select('id, user_rooms(property_type, wifi_code, parking_info, has_alarm_or_cctv, parking_badge_or_disk, is_non_smoking, are_pets_allowed, has_baby_cot, has_high_chair, has_cleaning_equipment, has_house_manual, has_smoke_detector, has_co_detector)')
      .neq('id', user.id); // Exclude the current user

    if (competitorsError) throw competitorsError;

    const competitorRooms = competitorProfiles
      .flatMap(p => p.user_rooms || []) // Ensure p.user_rooms is an array, even if null
      .filter(room => room.property_type === userRoom.property_type); // Filter by property_type

    if (competitorRooms.length === 0) {
      return new Response(JSON.stringify({ error: "No competitors found with the same property type." }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. Calculate scores
    const calculateScore = (room: any) => {
      let score = 0;
      if (room.wifi_code) score++;
      if (room.parking_info) score++;
      for (const field of scoringFields) {
        if (room[field] === true) {
          score++;
        }
      }
      return score;
    };

    const userScore = calculateScore(userRoom);
    const totalCompetitorScore = competitorRooms.reduce((sum, room) => sum + calculateScore(room), 0);
    const averageCompetitorScore = totalCompetitorScore / competitorRooms.length;

    const responsePayload = {
      userScore,
      averageCompetitorScore,
      competitorCount: competitorRooms.length,
      maxScore: scoringFields.length + 2 // +2 for wifi and parking
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error in comp-set-analyzer function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});