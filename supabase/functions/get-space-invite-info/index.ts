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
    const { token } = await req.json();
    if (!token) {
      throw new Error("Token manquant.");
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: invite, error } = await adminClient
      .from('account_members')
      .select('member_email, status, master_id')
      .eq('token', token)
      .maybeSingle();

    if (error || !invite) {
      console.warn("[get-space-invite-info] Invitation introuvable", { error: error?.message });
      return new Response(JSON.stringify({ error: "Invitation introuvable." }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (invite.status !== 'pending') {
      return new Response(JSON.stringify({ error: "Cette invitation n'est plus valide." }), {
        status: 410,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Récupérer le nom du compte maître pour l'affichage
    const { data: masterProfile } = await adminClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', invite.master_id)
      .maybeSingle();

    return new Response(JSON.stringify({
      inviteeEmail: invite.member_email,
      masterName: masterProfile ? `${masterProfile.first_name ?? ''} ${masterProfile.last_name ?? ''}`.trim() : null,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error("[get-space-invite-info] Erreur", { error: error?.message || error });
    return new Response(JSON.stringify({ error: error.message || 'Erreur inconnue' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
