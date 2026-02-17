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
      console.error('[export-accountant-statements] auth.getUser failed', { userErr })
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const accountantId = userData.user.id

    const { data: myProfile, error: profileErr } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', accountantId)
      .single()

    if (profileErr) {
      console.error('[export-accountant-statements] failed to load profile role', { profileErr })
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    if (myProfile?.role !== 'accountant') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const { data: relations, error: relErr } = await supabaseUser
      .from('accountant_client_relations')
      .select('client_id')
      .eq('accountant_id', accountantId)

    if (relErr) {
      console.error('[export-accountant-statements] failed to load relations', { relErr })
      throw relErr
    }

    const clientIds = Array.from(new Set((relations ?? []).map((r: any) => r.client_id).filter(Boolean)))

    if (clientIds.length === 0) {
      return new Response(JSON.stringify({ invoices: [], clients: [] }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { data: invoices, error: invErr } = await supabaseAdmin
      .from('invoices')
      .select('id,user_id,period,invoice_data,totals,created_at,is_paid,paid_at')
      .in('user_id', clientIds)
      .order('created_at', { ascending: false })

    if (invErr) {
      console.error('[export-accountant-statements] failed to load invoices', { invErr })
      throw invErr
    }

    const { data: clients, error: clientsErr } = await supabaseAdmin
      .from('profiles')
      .select('id,first_name,last_name,email')
      .in('id', clientIds)

    if (clientsErr) {
      console.error('[export-accountant-statements] failed to load client profiles', { clientsErr })
      throw clientsErr
    }

    return new Response(JSON.stringify({ invoices: invoices ?? [], clients: clients ?? [] }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (error: any) {
    console.error('[export-accountant-statements] unexpected error', { message: error?.message })
    return new Response(JSON.stringify({ error: error?.message || 'Erreur inconnue' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
