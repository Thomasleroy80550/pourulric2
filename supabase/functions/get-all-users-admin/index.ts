import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fonction pour vérifier si un utilisateur est admin
async function isAdmin(supabaseClient: any): Promise<boolean> {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return false;

  const { data: profile, error } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    console.error('Error fetching user role:', error);
    return false;
  }

  return profile.role === 'admin';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Vérifier si l'appelant est un admin
    const isUserAdmin = await isAdmin(supabaseClient);
    if (!isUserAdmin) {
      return new Response(JSON.stringify({ error: 'Accès non autorisé' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Récupérer les données d'authentification
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw authError;

    // Récupérer les profils
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*');
    if (profilesError) throw profilesError;

    // Fusionner les données
    const usersById = new Map(authUsers.users.map(u => [u.id, { email: u.email, last_sign_in_at: u.last_sign_in_at }]));
    
    const mergedUsers = profiles.map(profile => {
      const authData = usersById.get(profile.id);
      return {
        ...profile,
        email: authData?.email || profile.email, // Prioriser l'email de auth, fallback sur celui du profil
        last_sign_in_at: authData?.last_sign_in_at,
      };
    });

    return new Response(JSON.stringify(mergedUsers), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('Error in get-all-users-admin function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
})