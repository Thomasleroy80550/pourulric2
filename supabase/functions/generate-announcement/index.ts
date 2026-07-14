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
      console.error("[generate-announcement] Auth error", authError?.message);
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
      console.error("[generate-announcement] Forbidden - not admin");
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { topic, level } = await req.json();
    if (!topic || typeof topic !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'topic'" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      console.error("[generate-announcement] missing OPENAI_API_KEY");
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const levelLabel = level === "urgent" ? "urgent" : level === "important" ? "important" : "informatif";

    const prompt = `
Tu es le responsable communication de Hello Keys (conciergerie de locations saisonnières).
Rédige une annonce interne destinée à tous les propriétaires clients, à partir du sujet suivant :

"${topic}"

Ton attendu : ${levelLabel}, professionnel, chaleureux et clair (voix Hello Keys).

Contraintes de forme :
- Le champ "title" : un titre court et accrocheur (max 70 caractères), sans guillemets.
- Le champ "content" : du HTML simple et bien structuré. Autorisé : <p>, <strong>, <em>, <ul>, <ol>, <li>, <a>, <br>. Interdit : <script>, <style>, titres <h1>-<h6>, images.
- Longueur du contenu : 90 à 180 mots.
- Commence par une phrase d'accroche, puis développe, et termine par une phrase d'action ou de remerciement.
- N'invente pas de dates, chiffres ou liens précis s'ils ne sont pas fournis.

Réponds STRICTEMENT en JSON valide avec exactement les clés "title" et "content".
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
              "Tu es un assistant de communication qui rédige des annonces claires en français et répond uniquement en JSON valide.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.6,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      console.error("[generate-announcement] OpenAI error", aiResponse.status, text);
      return new Response(JSON.stringify({ error: `OpenAI error: ${aiResponse.status}` }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const json = await aiResponse.json();
    const raw = json?.choices?.[0]?.message?.content ?? "{}";

    let parsed: { title?: string; content?: string } = {};
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("[generate-announcement] Failed to parse AI JSON", e);
      return new Response(JSON.stringify({ error: "AI returned invalid format" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("[generate-announcement] success for user", user.id);
    return new Response(
      JSON.stringify({ title: parsed.title ?? "", content: parsed.content ?? "" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (e: any) {
    console.error("[generate-announcement] Unhandled error", e?.message);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
