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
    // 1. Authentifier l'appelant (le membre)
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error("[switch-to-master] Utilisateur non authentifié");
      return new Response(JSON.stringify({ error: "Non autorisé : utilisateur non authentifié." }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { master_id } = await req.json();
    if (!master_id) {
      throw new Error("Champ requis manquant : master_id.");
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. Vérifier que l'appelant est bien un membre ACCEPTÉ de l'espace du compte maître
    const { data: membership, error: membershipError } = await adminClient
      .from('account_members')
      .select('id, status')
      .eq('master_id', master_id)
      .eq('member_id', user.id)
      .eq('status', 'accepted')
      .maybeSingle();

    if (membershipError || !membership) {
      console.error("[switch-to-master] Accès refusé", { member: user.id, master_id, error: membershipError?.message });
      return new Response(JSON.stringify({ error: "Accès refusé : vous n'êtes pas membre de cet espace." }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 3. Récupérer l'email du compte maître
    const { data: masterUser, error: getMasterError } = await adminClient.auth.admin.getUserById(master_id);
    if (getMasterError || !masterUser?.user?.email) {
      throw new Error("Impossible de trouver le compte maître.");
    }
    const masterEmail = masterUser.user.email;

    // 4. Générer un magic link pour établir la session du compte maître
    const redirectTo = Deno.env.get('APP_BASE_URL') || 'https://beta.proprietaire.hellokeys.fr/';
    let linkData: any | null = null;
    let linkError: any | null = null;

    {
      const { data, error } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email: masterEmail,
        options: { redirectTo }
      });
      linkData = data;
      linkError = error;
    }

    if (linkError || !linkData?.properties?.action_link) {
      const { data, error } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email: masterEmail
      });
      linkData = data;
      linkError = error;
    }

    if (linkError || !linkData?.properties?.action_link) {
      throw new Error(linkError?.message || "Échec de génération du lien de session.");
    }

    console.log("[switch-to-master] Bascule autorisée", { member: user.id, master_id });

    return new Response(JSON.stringify({
      action_link: linkData.properties.action_link,
      email_otp: linkData.properties.email_otp,
      email: masterEmail
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error("[switch-to-master] Erreur", { error: error?.message || error });
    return new Response(JSON.stringify({ error: error.message || 'Erreur inconnue' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
