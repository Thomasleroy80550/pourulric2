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
    const body = await req.json()
    const email = body?.email as string
    const secret = body?.secret as string

    if (!email || !secret) {
      return new Response(JSON.stringify({ error: 'Missing email or secret.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Validate secret against configured project secrets (prefer CRON_SECRET, fallback CRON_SECRET_2)
    const expectedSecret = Deno.env.get('CRON_SECRET') ?? Deno.env.get('CRON_SECRET_2') ?? ''
    if (!expectedSecret || secret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized: invalid secret.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Service role client (bypass RLS)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Find profile by email to get user id
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, email, role')
      .eq('email', email)
      .single()

    if (profileError || !profile?.id) {
      return new Response(JSON.stringify({ error: 'Profile not found for given email.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const userId = profile.id

    // Update auth.users metadata to include role=admin
    const { data: userData, error: getUserError } = await admin.auth.admin.getUserById(userId)
    if (getUserError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unable to fetch auth user.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const mergedMetadata = { ...userData.user.user_metadata, role: 'admin' }
    const { error: updateAuthError } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: mergedMetadata
    })
    if (updateAuthError) {
      return new Response(JSON.stringify({ error: `Failed to update auth metadata: ${updateAuthError.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Update public.profiles role
    const { error: updateProfileError } = await admin
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userId)

    if (updateProfileError) {
      return new Response(JSON.stringify({ error: `Failed to update profile role: ${updateProfileError.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    return new Response(JSON.stringify({ ok: true, user_id: userId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err: any) {
    console.error('recover-admin error:', err?.message || err)
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})