import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { differenceInDays, parseISO } from 'https://esm.sh/date-fns@3.6.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const KROSSBOOKING_PROXY_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/krossbooking-proxy";

interface Reservation {
    id: string;
    check_in_date: string;
    check_out_date: string;
    status: string; // 'PROP0', 'PROPRI', 'CANC'
    amount: string; // "123.45€"
}

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

    // 1. Get user's rooms
    const { data: userRooms, error: userRoomsError } = await userSupabaseClient
      .from('user_rooms')
      .select('room_id');

    if (userRoomsError) throw userRoomsError;
    if (!userRooms || userRooms.length === 0) {
      return new Response(JSON.stringify({ error: "No rooms found for the user." }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Fetch reservations for each room
    const allReservations: Reservation[] = [];
    let successfulFetches = 0;
    for (const room of userRooms) {
        const response = await fetch(KROSSBOOKING_PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authorization, // Pass the user's token
            },
            body: JSON.stringify({ action: 'get_reservations_for_room', id_room: room.room_id }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.warn(`Failed to fetch reservations for room ${room.room_id}. Status: ${response.status}. Body: ${errorBody}`);
            continue; // Skip this room on error
        }
        successfulFetches++;

        const krossbookingResponse = await response.json();
        const reservationsData = krossbookingResponse.data;

        if (Array.isArray(reservationsData)) {
            const mappedReservations = reservationsData.map((res: any): Reservation => ({
                id: res.id_reservation.toString(),
                check_in_date: res.arrival || '',
                check_out_date: res.departure || '',
                status: res.cod_reservation_status,
                amount: res.charge_total_amount ? `${res.charge_total_amount}€` : '0€',
            }));
            allReservations.push(...mappedReservations);
        }
    }
    
    if (userRooms.length > 0 && successfulFetches === 0) {
        throw new Error("Could not fetch any reservation data from the booking service proxy. Performance analysis failed.");
    }
    
    // 3. Calculate metrics for the last 90 days
    const analysisPeriodDays = 90;
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - analysisPeriodDays);

    const confirmedReservations = allReservations.filter(res => {
        try {
            const checkIn = parseISO(res.check_in_date);
            return (res.status === 'PROP0' || res.status === 'PROPRI') && checkIn >= startDate && checkIn <= today;
        } catch (e) {
            return false;
        }
    });

    let totalRevenue = 0;
    let totalBookedNights = 0;

    confirmedReservations.forEach(res => {
        const revenue = parseFloat(res.amount.replace('€', ''));
        if (!isNaN(revenue)) {
            totalRevenue += revenue;
        }
        
        try {
            const checkIn = parseISO(res.check_in_date);
            const checkOut = parseISO(res.check_out_date);
            totalBookedNights += differenceInDays(checkOut, checkIn);
        } catch(e) {
            // ignore if dates are invalid
        }
    });

    const totalAvailableNights = userRooms.length * analysisPeriodDays;
    
    const occupancyRate = totalAvailableNights > 0 ? (totalBookedNights / totalAvailableNights) * 100 : 0;
    const adr = totalBookedNights > 0 ? totalRevenue / totalBookedNights : 0;
    const revPar = totalAvailableNights > 0 ? totalRevenue / totalAvailableNights : 0;

    const responsePayload = {
      occupancyRate,
      adr,
      revPar,
      totalBookedNights,
      totalRevenue,
      analysisPeriodDays,
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error in user-performance-analyzer function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});