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
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé : utilisateur non authentifié." }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { data: callerProfile, error: profileError } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: "Interdit : accès administrateur requis." }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { target_user_id } = await req.json();
    if (!target_user_id) {
      throw new Error("Champ requis manquant : target_user_id.");
    }

    // 2. Garde-fous
    if (target_user_id === user.id) {
      return new Response(JSON.stringify({ error: "Vous ne pouvez pas supprimer votre propre compte." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('role, first_name, last_name')
      .eq('id', target_user_id)
      .maybeSingle();

    if (targetProfile?.role === 'admin') {
      return new Response(JSON.stringify({ error: "Impossible de supprimer un compte administrateur." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 3. Supprimer les fichiers de stockage connus de l'utilisateur (relevés)
    try {
      const { data: statementFiles } = await adminClient.storage
        .from('statements')
        .list(target_user_id);
      if (statementFiles && statementFiles.length > 0) {
        const paths = statementFiles.map((f: any) => `${target_user_id}/${f.name}`);
        await adminClient.storage.from('statements').remove(paths);
        console.log("[delete-user-admin] Fichiers de relevés supprimés", { count: paths.length });
      }
    } catch (e) {
      console.warn("[delete-user-admin] Nettoyage storage non bloquant en échec", { error: (e as any)?.message });
    }

    // 4. Supprimer le compte auth : toutes les tables liées en CASCADE sont purgées
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(target_user_id);
    if (deleteError) {
      console.error("[delete-user-admin] Échec de la suppression", { error: deleteError.message });
      throw new Error(`Échec de la suppression : ${deleteError.message}`);
    }

    console.log("[delete-user-admin] Utilisateur supprimé totalement", {
      deleted_by: user.id,
      target_user_id,
      target_name: `${targetProfile?.first_name ?? ''} ${targetProfile?.last_name ?? ''}`.trim(),
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error("[delete-user-admin] Erreur", { error: error?.message || error });
    return new Response(JSON.stringify({ error: error.message || 'Erreur inconnue' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
