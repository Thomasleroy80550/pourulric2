import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { format } from 'https://esm.sh/date-fns@3.6.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // 1. Get the user's primary property type
    const { data: userRoom, error: userRoomError } = await adminSupabaseClient
      .from('user_rooms')
      .select('property_type')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (userRoomError || !userRoom) {
      return new Response(JSON.stringify({ error: "User room or property type not found." }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Find competitor IDs with the same property type
    const { data: competitorRooms, error: competitorsError } = await adminSupabaseClient
      .from('user_rooms')
      .select('user_id')
      .eq('property_type', userRoom.property_type)
      .neq('user_id', user.id);

    if (competitorsError) throw competitorsError;

    const competitorIds = competitorRooms.map(r => r.user_id);

    if (competitorIds.length === 0) {
        return new Response(JSON.stringify({ userAveragePrice: 0, competitorAveragePrice: 0, competitorCount: 0 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    // 3. Calculate average price for the next 90 days
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 90);
    const startDate = format(today, 'yyyy-MM-dd');
    const endDate = format(futureDate, 'yyyy-MM-dd');

    const calculateAveragePrice = async (userIds: string[]) => {
      if (userIds.length === 0) return 0;
      const { data, error } = await adminSupabaseClient
        .from('price_overrides')
        .select('price')
        .in('user_id', userIds)
        .gte('start_date', startDate)
        .lte('end_date', endDate)
        .not('price', 'is', null);
      
      if (error) throw error;
      if (!data || data.length === 0) return 0;

      const total = data.reduce((sum, item) => sum + item.price, 0);
      return total / data.length;
    };

    const userAveragePrice = await calculateAveragePrice([user.id]);
    const competitorAveragePrice = await calculateAveragePrice(competitorIds);

    const responsePayload = {
      userAveragePrice,
      competitorAveragePrice,
      competitorCount: competitorIds.length,
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error in price-position-analyzer function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});