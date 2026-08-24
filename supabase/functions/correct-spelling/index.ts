import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error("[correct-spelling] Auth error", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { text } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Missing 'text'" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      console.error("[correct-spelling] missing OPENAI_API_KEY");
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: [
              "Tu es un correcteur orthographique et grammatical pour le français.",
              "Corrige uniquement l'orthographe, la grammaire, la conjugaison, les accents et la ponctuation du texte fourni.",
              "NE change PAS le sens, le ton, la mise en forme (sauts de ligne, tirets, sections comme '--- DEVIS DE RÉPARATION ---') ni les chiffres/montants.",
              "Réponds STRICTEMENT en JSON valide avec exactement la clé \"corrected\" contenant le texte corrigé.",
            ].join(" "),
          },
          { role: "user", content: text },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[correct-spelling] OpenAI error", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: `OpenAI error: ${aiResponse.status}` }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const json = await aiResponse.json();
    const raw = json?.choices?.[0]?.message?.content ?? "{}";

    let parsed: { corrected?: string } = {};
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("[correct-spelling] Failed to parse AI JSON", e);
      return new Response(JSON.stringify({ error: "AI returned invalid format" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("[correct-spelling] success for user", user.id);
    return new Response(
      JSON.stringify({ corrected: parsed.corrected ?? text }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (e: any) {
    console.error("[correct-spelling] Unhandled error", e?.message);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
