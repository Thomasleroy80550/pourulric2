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
      console.error("[generate-newsletter] Auth error", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      console.error("[generate-newsletter] Forbidden - not admin");
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = await req.json().catch(() => ({}));
    const brief = body?.brief as string | undefined;
    const tone = (body?.tone as string | undefined) ?? "chaleureux";
    const existingHtml = body?.existingHtml as string | undefined;
    const mode = existingHtml && existingHtml.trim().length > 0 ? "improve" : "create";

    if (!brief || typeof brief !== "string" || brief.trim().length < 5) {
      return new Response(JSON.stringify({ error: "Missing or too short 'brief'" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      console.error("[generate-newsletter] missing OPENAI_API_KEY");
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const toneLabel =
      tone === "professionnel" ? "professionnel et sobre" :
      tone === "commercial" ? "commercial et enthousiaste" :
      "chaleureux et convivial";

    const improveBlock = mode === "improve"
      ? `
Voici le contenu HTML existant à améliorer / réécrire en tenant compte des consignes :
---
${existingHtml!.slice(0, 8000)}
---
`
      : "";

    const prompt = `
Tu es le responsable communication de Hello Keys (conciergerie de locations saisonnières).
${mode === "improve" ? "Améliore la newsletter existante ci-dessous" : "Rédige une newsletter"} destinée à tous les propriétaires clients, à partir des consignes suivantes :

"${brief.trim()}"
${improveBlock}
Ton attendu : ${toneLabel} (voix Hello Keys), en français.

Contraintes de forme :
- Le champ "subject" : un objet d'email court et engageant (max 70 caractères), sans guillemets ni emoji excessifs (1 emoji max).
- Le champ "html" : le corps de la newsletter en HTML simple, compatible email. Autorisé : <h2>, <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li>, <a>, <br>. Interdit : <script>, <style>, <img>, <h1>, tableaux, CSS inline complexe.
- Structure : une accroche, 1 à 3 sections avec sous-titres <h2> si pertinent, et une conclusion avec appel à l'action ou remerciement.
- Longueur : 120 à 300 mots.
- N'invente pas de dates, chiffres, prix ou liens précis s'ils ne sont pas fournis dans les consignes.

Réponds STRICTEMENT en JSON valide avec exactement les clés "subject" et "html".
`.trim();

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
            content:
              "Tu es un assistant de communication qui rédige des newsletters claires en français et répond uniquement en JSON valide.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      console.error("[generate-newsletter] OpenAI error", aiResponse.status, text);
      return new Response(JSON.stringify({ error: `OpenAI error: ${aiResponse.status}` }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const json = await aiResponse.json();
    const raw = json?.choices?.[0]?.message?.content ?? "{}";

    let parsed: { subject?: string; html?: string } = {};
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("[generate-newsletter] Failed to parse AI JSON", e);
      return new Response(JSON.stringify({ error: "AI returned invalid format" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("[generate-newsletter] success for user", user.id, { mode });
    return new Response(
      JSON.stringify({ subject: parsed.subject ?? "", html: parsed.html ?? "" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (e: any) {
    console.error("[generate-newsletter] Unhandled error", e?.message);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
