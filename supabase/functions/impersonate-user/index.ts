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
    // 1. Vérifier que l'appelant est un administrateur
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

    // 2. Obtenir l'ID de l'utilisateur cible depuis le corps de la requête
    const { target_user_id } = await req.json();
    if (!target_user_id) {
      throw new Error("Champ requis manquant : target_user_id.");
    }

    // 3. Créer un client avec les droits de service
    const adminSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 4. Récupérer l'utilisateur cible par son ID pour obtenir son email
    const { data: userToImpersonate, error: getUserError } = await adminSupabaseClient.auth.admin.getUserById(target_user_id);
    if (getUserError || !userToImpersonate.user || !userToImpersonate.user.email) {
      throw new Error("Impossible de trouver l'utilisateur cible ou son email.");
    }

    // 5. Générer un lien magique pour l'utilisateur cible en utilisant son email
    // L'URL de redirection doit être une URL de votre application où vous pouvez gérer les tokens
    const { data: sessionData, error: sessionError } = await adminSupabaseClient.auth.admin.generateLink({
        type: 'magiclink',
        email: userToImpersonate.user.email,
        options: {
            redirectTo: 'http://localhost:5173/' // Remplacez par l'URL de votre application où les tokens seront gérés
        }
    });

    if (sessionError) throw sessionError;

    // 6. Retourner le lien d'action au lieu des tokens
    // Le client devra naviguer vers ce lien pour obtenir les tokens de session
    return new Response(JSON.stringify({ action_link: sessionData.properties.action_link }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Erreur dans la fonction impersonate-user:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});