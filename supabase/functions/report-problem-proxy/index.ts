import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate with Supabase to get the user's session
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Authentication error:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized: User not authenticated." }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const requestBody = await req.json();
    const { reservation_id, problem_type, description, contact_email, contact_phone } = requestBody;

    if (!reservation_id || !problem_type || !description) {
      return new Response(JSON.stringify({ error: "Missing required fields: reservation_id, problem_type, description." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Save the report to the database
    const { data: reportData, error: insertError } = await supabaseClient
      .from('reports')
      .insert({
        user_id: user.id,
        reservation_id,
        problem_type,
        description,
        contact_email,
        contact_phone,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting report:", insertError.message);
      throw new Error(`Failed to submit report: ${insertError.message}`);
    }

    return new Response(JSON.stringify({ data: reportData, message: "Report submitted successfully." }), {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in report-problem-proxy function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});