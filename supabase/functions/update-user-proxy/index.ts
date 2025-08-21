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
    const body = await req.json();
    console.log("Incoming request body:", JSON.stringify(body)); // Log incoming body
    const { user_id, ...updateData } = body;

    if (!user_id) {
      throw new Error("Missing required field: user_id.");
    }

    // 3. Create admin client
    const adminSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 4. Prepare data for public.profiles, handling empty strings for optional fields
    const profileUpdatePayload: { [key: string]: any } = {};
    const authUpdatePayload: { [key: string]: any } = {};

    // Iterate over all keys in updateData
    for (const key in updateData) {
      if (Object.prototype.hasOwnProperty.call(updateData, key)) {
        let value = updateData[key];

        // Convert empty strings to null for all fields, except for revyoos_holding_ids which is an array
        if (typeof value === 'string' && value.trim() === '') {
          value = null;
        }

        // Separate fields for auth.users metadata vs public.profiles
        if (key === 'first_name' || key === 'last_name' || key === 'role') {
          // These fields are part of auth.users metadata AND public.profiles
          authUpdatePayload[key] = value;
          profileUpdatePayload[key] = value;
        } else {
          // All other fields go directly to public.profiles
          profileUpdatePayload[key] = value;
        }
      }
    }

    // Ensure user_id is not in the payload for update
    delete profileUpdatePayload.user_id;

    console.log("Auth update payload:", JSON.stringify(authUpdatePayload));
    console.log("Profile data for public.profiles update:", JSON.stringify(profileUpdatePayload));

    // Update auth.users metadata if there's anything to update
    if (Object.keys(authUpdatePayload).length > 0) {
      console.log(`Attempting to update auth.users metadata for user_id: ${user_id}`);
      
      // Fetch existing user to merge metadata, preventing accidental overwrites
      const { data: { user: targetUser }, error: getUserError } = await adminSupabaseClient.auth.admin.getUserById(user_id);
      if (getUserError) {
        console.error("Error fetching user to update metadata:", getUserError);
        throw new Error(`Failed to get user for update: ${getUserError.message}`);
      }

      const newMetadata = { ...targetUser.user_metadata, ...authUpdatePayload };

      const { error: updateUserError } = await adminSupabaseClient.auth.admin.updateUserById(
        user_id,
        { user_metadata: newMetadata } // Use merged metadata
      );
      if (updateUserError) {
        console.error("Error updating auth.users metadata:", updateUserError);
        throw new Error(`Failed to update auth.users metadata: ${updateUserError.message}`);
      }
      console.log("Successfully updated auth.users metadata.");
    } else {
      console.log("No auth.users metadata to update.");
    }

    // 5. Update public.profiles table
    console.log(`Attempting to update public.profiles for user_id: ${user_id} with data: ${JSON.stringify(profileUpdatePayload)}`);
    const { data: updatedProfile, error: updateProfileError } = await adminSupabaseClient
      .from('profiles')
      .update(profileUpdatePayload)
      .eq('id', user_id)
      .select()
      .single();
    if (updateProfileError) {
      console.error("Error updating public.profiles table:", updateProfileError);
      throw new Error(`Failed to update public.profiles: ${updateProfileError.message}`);
    }
    console.log("Successfully updated public.profiles table.");

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