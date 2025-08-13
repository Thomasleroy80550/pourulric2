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
    // 1. Create a Supabase client with the user's auth token
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 2. Check if the calling user is authenticated
    const { data: { user }, error: authError } = await userSupabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized: User not authenticated.");
    }

    // 3. Check if the calling user is an admin
    const { data: profile, error: profileError } = await userSupabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required." }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 4. Get the new user's data from the request body
    const { email, first_name, last_name, role, estimation_details, estimated_revenue } = await req.json();
    if (!email || !first_name || !last_name || !role) {
      throw new Error("Missing required fields: email, first_name, last_name, role.");
    }
    if (!['user', 'admin', 'accountant'].includes(role)) {
      throw new Error("Invalid role specified.");
    }

    // 5. Create a Supabase admin client with the service role key
    const adminSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 6. Invite the new user by email
    const redirectTo = `${Deno.env.get('APP_BASE_URL') || 'http://localhost:5173'}/onboarding-status`;

    const { data: inviteData, error: inviteError } = await adminSupabaseClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          first_name,
          last_name,
          role,
          estimation_details,
          estimated_revenue,
        },
        redirectTo: redirectTo,
      }
    );

    if (inviteError) {
      throw inviteError;
    }

    return new Response(JSON.stringify({ data: inviteData, message: "User invited successfully." }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in create-user-proxy function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});