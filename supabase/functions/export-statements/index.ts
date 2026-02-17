import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userErr } = await supabaseUser.auth.getUser()
    if (userErr || !userData?.user) {
      console.error('[export-statements] auth.getUser failed', { userErr })
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const currentUserId = userData.user.id

    const { data: myProfile, error: profileErr } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', currentUserId)
      .single()

    if (profileErr) {
      console.error('[export-statements] failed to load profile role', { profileErr })
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const role = (myProfile as any)?.role as string | undefined

    // Déterminer les user_id dont on peut exporter les relevés
    const allowedUserIds = new Set<string>()

    // Toujours autoriser l'export de ses propres relevés (si existants)
    allowedUserIds.add(currentUserId)

    // Si comptable : exporter les relevés de tous ses clients
    if (role === 'accountant') {
      const { data: relations, error: relErr } = await supabaseUser
        .from('accountant_client_relations')
        .select('client_id')
        .eq('accountant_id', currentUserId)

      if (relErr) {
        console.error('[export-statements] failed to load accountant relations', { relErr })
        throw relErr
      }

      for (const r of (relations ?? []) as any[]) {
        if (r?.client_id) allowedUserIds.add(r.client_id)
      }
    }

    // Si délégué : exporter les relevés du/des propriétaires (invitation acceptée)
    {
      const { data: delegated, error: delegatedErr } = await supabaseUser
        .from('delegated_invoice_viewers')
        .select('owner_id')
        .eq('viewer_id', currentUserId)
        .eq('status', 'accepted')

      if (delegatedErr) {
        console.error('[export-statements] failed to load delegated owners', { delegatedErr })
        throw delegatedErr
      }

      for (const d of (delegated ?? []) as any[]) {
        if (d?.owner_id) allowedUserIds.add(d.owner_id)
      }
    }

    const userIds = Array.from(allowedUserIds)

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ invoices: [], clients: [] }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { data: invoices, error: invErr } = await supabaseAdmin
      .from('invoices')
      .select('id,user_id,period,invoice_data,totals,created_at,is_paid,paid_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })

    if (invErr) {
      console.error('[export-statements] failed to load invoices', { invErr })
      throw invErr
    }

    const { data: clients, error: clientsErr } = await supabaseAdmin
      .from('profiles')
      .select('id,first_name,last_name,email')
      .in('id', userIds)

    if (clientsErr) {
      console.error('[export-statements] failed to load profiles', { clientsErr })
      throw clientsErr
    }

    return new Response(JSON.stringify({ invoices: invoices ?? [], clients: clients ?? [] }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (error: any) {
    console.error('[export-statements] unexpected error', { message: error?.message })
    return new Response(JSON.stringify({ error: error?.message || 'Erreur inconnue' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})