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
    const { token, password, firstName, lastName, cguvVersion } = await req.json();
    if (!token || !password) {
      throw new Error("token et password sont requis.");
    }
    if (typeof password !== 'string' || password.length < 6) {
      return new Response(JSON.stringify({ error: "Le mot de passe doit contenir au moins 6 caractères." }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Vérifier l'invitation
    const { data: invite, error: inviteError } = await adminClient
      .from('account_members')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (inviteError || !invite) {
      console.warn("[join-shared-space] Invitation introuvable", { error: inviteError?.message });
      return new Response(JSON.stringify({ error: "Invitation introuvable." }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (invite.status !== 'pending') {
      return new Response(JSON.stringify({ error: "Cette invitation n'est plus valide." }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 2. Créer le compte membre, email déjà confirmé (pas d'email de confirmation)
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: invite.member_email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName || '',
        last_name: lastName || '',
      },
    });

    if (createError || !created?.user) {
      const msg = createError?.message || '';
      console.error("[join-shared-space] Erreur création utilisateur", { error: msg });
      if (msg.toLowerCase().includes('already') || (createError as any)?.status === 422) {
        return new Response(JSON.stringify({ error: "already_exists" }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      throw new Error(msg || "Impossible de créer le compte.");
    }

    const memberId = created.user.id;
    const nowIso = new Date().toISOString();

    // 3. Activer directement le profil (pas de mode estimation) + CGUV acceptées
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        first_name: firstName || null,
        last_name: lastName || null,
        email: invite.member_email,
        onboarding_status: 'live',
        cguv_accepted_at: nowIso,
        cguv_version: cguvVersion || null,
      })
      .eq('id', memberId);

    if (profileError) {
      console.warn("[join-shared-space] Impossible de mettre à jour le profil", { error: profileError.message });
    }

    // 4. Accepter automatiquement l'invitation
    const { error: acceptError } = await adminClient
      .from('account_members')
      .update({ member_id: memberId, status: 'accepted', accepted_at: nowIso })
      .eq('id', invite.id);

    if (acceptError) {
      console.error("[join-shared-space] Impossible d'accepter l'invitation", { error: acceptError.message });
      throw new Error("Compte créé mais l'invitation n'a pas pu être acceptée.");
    }

    console.log("[join-shared-space] Membre créé et invitation acceptée", { memberId, master: invite.master_id });

    return new Response(JSON.stringify({ success: true, email: invite.member_email }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error("[join-shared-space] Erreur", { error: error?.message || error });
    return new Response(JSON.stringify({ error: error.message || 'Erreur inconnue' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
