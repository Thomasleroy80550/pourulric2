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
    // 1. Authenticate calling user and check if admin
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await userSupabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized: User not authenticated.");
    }

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

    // 2. Get user data from request body
    const { user_id, first_name, last_name, role } = await req.json();
    if (!user_id || !first_name || !last_name || !role) {
      throw new Error("Missing required fields: user_id, first_name, last_name, role.");
    }

    // 3. Create admin client
    const adminSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 4. Update auth.users metadata to keep it in sync
    const { data: updatedUser, error: updateUserError } = await adminSupabaseClient.auth.admin.updateUserById(
      user_id,
      { user_metadata: { first_name, last_name, role } }
    );
    if (updateUserError) throw updateUserError;

    // 5. Update public.profiles table
    const { data: updatedProfile, error: updateProfileError } = await adminSupabaseClient
      .from('profiles')
      .update({ first_name, last_name, role })
      .eq('id', user_id)
      .select()
      .single();
    if (updateProfileError) throw updateProfileError;

    // 6. Return success response
    return new Response(JSON.stringify({ data: updatedProfile, message: "User updated successfully." }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in update-user-proxy function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});