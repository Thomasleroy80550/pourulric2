import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AnalyzeErrorPayload = {
  route?: string | null;
  component?: string | null;
  message: string;
  stack?: string | null;
  metadata?: Record<string, unknown> | null;
  user_email?: string | null;
  user_description?: string | null;
};

type AiAnalysisResponse = {
  summary: string;
  probable_causes: string[];
  recommended_fix: string;
  verification_steps: string[];
  browser_specific: boolean;
};

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}…` : trimmed;
}

function sanitizeMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  try {
    const json = JSON.stringify(value);
    if (json.length <= 3000) return value;
    return { truncated_preview: `${json.slice(0, 3000)}…` };
  } catch {
    return {};
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const openAiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openAiKey) {
      console.error("[analyze-error-log] missing OPENAI_API_KEY");
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      console.error("[analyze-error-log] auth.getUser failed", { userError });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[analyze-error-log] profile lookup failed", { profileError });
      return new Response(JSON.stringify({ error: "Failed to validate user" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile?.role !== "admin") {
      console.warn("[analyze-error-log] forbidden user", { userId: userData.user.id });
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as AnalyzeErrorPayload;
    if (!body?.message || typeof body.message !== "string") {
      return new Response(JSON.stringify({ error: "Missing required field: message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = {
      route: sanitizeText(body.route, 500),
      component: sanitizeText(body.component, 200),
      message: sanitizeText(body.message, 1500),
      stack: sanitizeText(body.stack, 4000),
      user_email: sanitizeText(body.user_email, 320),
      user_description: sanitizeText(body.user_description, 2000),
      metadata: sanitizeMetadata(body.metadata),
    };

    const prompt = [
      "Analyse cette erreur applicative web et propose un correctif concret.",
      "Réponds uniquement en JSON avec les clés exactes suivantes : summary, probable_causes, recommended_fix, verification_steps, browser_specific.",
      "Contraintes :",
      "- summary: 1 à 3 phrases en français, simples et utiles pour un développeur.",
      "- probable_causes: tableau de 1 à 3 causes probables, spécifiques.",
      "- recommended_fix: un plan de correction concret et actionnable, en français.",
      "- verification_steps: tableau de 2 à 4 étapes de vérification après correction.",
      "- browser_specific: true si les informations indiquent un problème probablement lié à un navigateur en particulier, sinon false.",
      "- N’invente pas de contexte absent.",
      "- Si le stack est vague, indique clairement que la certitude est limitée.",
      "- Prends en compte route, composant, navigateur, stack et metadata si présents.",
      "Données de l’erreur :",
      JSON.stringify(payload, null, 2),
    ].join("\n");

    console.log("[analyze-error-log] requesting AI analysis", {
      route: payload.route,
      component: payload.component,
    });

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "Tu es un ingénieur frontend senior spécialisé React, TypeScript et debugging cross-browser. Tu aides à analyser des erreurs de production et à proposer des correctifs concrets. Réponds uniquement avec du JSON valide.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[analyze-error-log] OpenAI request failed", {
        status: aiResponse.status,
        errorText,
      });
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResponse.json();
    const content = aiJson?.choices?.[0]?.message?.content;

    if (typeof content !== "string") {
      console.error("[analyze-error-log] invalid AI response shape", { aiJson });
      return new Response(JSON.stringify({ error: "Invalid AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: Partial<AiAnalysisResponse>;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error("[analyze-error-log] failed to parse AI response", { parseError, content });
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response: AiAnalysisResponse = {
      summary: sanitizeText(parsed.summary, 1200) ?? "Analyse indisponible.",
      probable_causes: Array.isArray(parsed.probable_causes)
        ? parsed.probable_causes.map((item) => sanitizeText(item, 500)).filter(Boolean) as string[]
        : [],
      recommended_fix: sanitizeText(parsed.recommended_fix, 2500) ?? "Aucun correctif proposé.",
      verification_steps: Array.isArray(parsed.verification_steps)
        ? parsed.verification_steps.map((item) => sanitizeText(item, 500)).filter(Boolean) as string[]
        : [],
      browser_specific: Boolean(parsed.browser_specific),
    };

    console.log("[analyze-error-log] analysis generated", {
      causes: response.probable_causes.length,
      verificationSteps: response.verification_steps.length,
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[analyze-error-log] unexpected error", { error });
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
