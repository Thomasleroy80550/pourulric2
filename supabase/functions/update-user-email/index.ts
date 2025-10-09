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
    // Vérifier authentification et rôle admin via le token du client
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await userSupabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: User not authenticated." }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
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

    // Récupérer payload
    const body = await req.json();
    const { user_id, new_email } = body as { user_id?: string; new_email?: string };

    if (!user_id || !new_email) {
      return new Response(JSON.stringify({ error: "Missing required fields: user_id and new_email." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Client admin (service role)
    const adminSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Mettre à jour l'email dans auth.users
    const { error: updateAuthError } = await adminSupabaseClient.auth.admin.updateUserById(user_id, {
      email: new_email,
    });
    if (updateAuthError) {
      // Retourner un message clair (doublon d'email, format invalide, etc.)
      return new Response(JSON.stringify({ error: `Failed to update auth email: ${updateAuthError.message}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Mettre à jour l'email miroir dans public.profiles
    const { error: updateProfileError } = await adminSupabaseClient
      .from('profiles')
      .update({ email: new_email })
      .eq('id', user_id);

    if (updateProfileError) {
      // Si le profil échoue, on indique l'anomalie (l'auth est déjà à jour)
      return new Response(JSON.stringify({ error: `Auth email updated but failed to update profile: ${updateProfileError.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ message: "User email updated successfully." }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in update-user-email function:", error?.message || error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});