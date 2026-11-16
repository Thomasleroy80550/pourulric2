import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (req.method !== "POST") return respond({ error: "Méthode non autorisée." }, 405);

  try {
    if (Number(req.headers.get("content-length") || 0) > 4096) return respond({ error: "Question trop longue." }, 413);
    const text = await req.text();
    if (text.length > 4096) return respond({ error: "Question trop longue." }, 413);
    let body;
    try { body = JSON.parse(text); } catch { return respond({ error: "Données invalides." }, 400); }
    if (!body || typeof body.question !== "string" || (body.website !== undefined && body.website !== "")) return respond({ error: "Données invalides." }, 400);
    const question = body.question.trim();
    if (question.length < 10 || question.length > 1000) return respond({ error: "La question doit contenir entre 10 et 1 000 caractères." }, 400);

    // Envoi public volontaire : aucune session utilisateur n’est requise.
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ip = req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unknown";
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${key}:${ip}`));
    const requesterHash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await admin.rpc("submit_maintenance_question", { question_text: question, requester_hash_value: requesterHash });
    if (error) {
      if (error.message.includes("question_rate_limit")) return respond({ error: "Vous avez déjà envoyé trois questions. Patientez dix minutes avant de réessayer." }, 429);
      console.error("[maintenance-question] Submission failed", { code: error.code });
      return respond({ error: "Impossible de publier votre question pour le moment." }, 500);
    }
    console.info("[maintenance-question] Anonymous question published", { id: data });
    return respond({ id: data });
  } catch {
    console.error("[maintenance-question] Unexpected submission failure");
    return respond({ error: "Impossible de publier votre question pour le moment." }, 500);
  }
});
