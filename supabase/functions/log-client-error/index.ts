import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

type LogPayload = {
  route?: string | null
  component?: string | null
  message: string
  stack?: string | null
  metadata?: Record<string, unknown> | null
  user_email?: string | null
  user_description?: string | null
}

const truncate = (value: string, max = 5000) => {
  if (!value) return value
  return value.length > max ? value.slice(0, max) : value
}

const scrubStack = (stack?: string | null) => {
  if (!stack) return null
  const lines = stack.split("\n").slice(0, 6).map((l) => l.trim())
  return truncate(lines.join("\n"), 5000)
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      })
    }

    const body = (await req.json()) as LogPayload

    if (!body?.message || typeof body.message !== "string") {
      return new Response(JSON.stringify({ error: "Missing required field: message" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      })
    }

    const authHeader = req.headers.get("Authorization") ?? undefined

    // Best-effort user identification (optional)
    let userId: string | null = null
    if (authHeader) {
      const supabaseAuthClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      )

      const { data, error } = await supabaseAuthClient.auth.getUser()
      if (error) {
        console.warn("[log-client-error] auth getUser failed", { message: error.message })
      } else {
        userId = data.user?.id ?? null
      }
    }

    // Insert with service role (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const route = typeof body.route === "string" ? truncate(body.route, 500) : null
    const component = typeof body.component === "string" ? truncate(body.component, 200) : null
    const message = truncate(body.message, 1000)
    const stack = scrubStack(typeof body.stack === "string" ? body.stack : null)
    const user_email = typeof body.user_email === "string" ? truncate(body.user_email, 320) : null
    const user_description =
      typeof body.user_description === "string" ? truncate(body.user_description, 5000) : null

    const metadata =
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? body.metadata
        : {}

    const { error: insertError } = await supabaseAdmin.from("error_logs").insert({
      user_id: userId,
      route,
      component,
      message,
      stack,
      user_email,
      user_description,
      metadata,
    })

    if (insertError) {
      console.error("[log-client-error] insert failed", { message: insertError.message })
      return new Response(JSON.stringify({ error: "Failed to insert error log" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    })
  } catch (error) {
    console.error("[log-client-error] unexpected error", { error })
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    })
  }
})
