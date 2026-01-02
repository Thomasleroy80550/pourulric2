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
    // Vérifier que l'appelant est un administrateur
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await userSupabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Non autorisé : Utilisateur non authentifié.");
    }

    const { data: profile, error: profileError } = await userSupabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: "Interdit : Accès administrateur requis." }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Obtenir l'ID de l'utilisateur cible
    const { target_user_id } = await req.json();
    if (!target_user_id) {
      throw new Error("Champ requis manquant : target_user_id.");
    }

    // Client admin (service role)
    const adminSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Vérifier que l'utilisateur cible existe
    const { data: userToImpersonate, error: getUserError } = await adminSupabaseClient.auth.admin.getUserById(target_user_id);
    if (getUserError || !userToImpersonate?.user) {
      throw new Error("Impossible de trouver l'utilisateur cible.");
    }

    // Créer une session directe pour l'utilisateur cible et retourner les tokens
    const { data: sessionData, error: createSessionError } = await adminSupabaseClient.auth.admin.createSession(target_user_id);
    if (createSessionError || !sessionData?.access_token || !sessionData?.refresh_token) {
      throw new Error(createSessionError?.message || "Échec de création de la session impersonation.");
    }

    return new Response(JSON.stringify({
      access_token: sessionData.access_token,
      refresh_token: sessionData.refresh_token,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Erreur dans la fonction impersonate-user:", error?.message || error);
    return new Response(JSON.stringify({ error: error.message || 'Erreur inconnue' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});