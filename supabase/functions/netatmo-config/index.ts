import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const NETATMO_CLIENT_ID = Deno.env.get("NETATMO_CLIENT_ID") || null;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized user" }), { status: 401, headers: corsHeaders });
  }

  if (!NETATMO_CLIENT_ID) {
    return new Response(JSON.stringify({ error: "NETATMO_CLIENT_ID missing in secrets" }), { status: 404, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ client_id: NETATMO_CLIENT_ID }), {
    status: 200,
    headers: corsHeaders,
  });
});