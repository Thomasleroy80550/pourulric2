import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { sha1 } from 'https://esm.sh/js-sha1@0.7.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CACHE_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get('Authorization')!;

    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authorization } } }
    );
    const { data: { user }, error: authError } = await userSupabaseClient.auth.getUser();
    if (authError || !user) {
      console.error("Auth error in review-analyzer:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { holdingIds } = await req.json();
    if (!holdingIds || !Array.isArray(holdingIds) || holdingIds.length === 0) {
      return new Response(JSON.stringify({ error: "Missing or invalid holdingIds" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const adminSupabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const sortedHoldingIds = [...holdingIds].sort();
    const holdingIdsHash = sha1(JSON.stringify(sortedHoldingIds));

    // 1. Check cache
    const { data: cachedData, error: cacheError } = await adminSupabaseClient
      .from('cached_improvement_points')
      .select('improvement_points, cached_at')
      .eq('holding_ids_hash', holdingIdsHash)
      .single();

    if (cacheError && cacheError.code !== 'PGRST116') {
      console.error("Error fetching from cache:", cacheError);
    }

    if (cachedData) {
      const cachedAt = new Date(cachedData.cached_at).getTime() / 1000;
      const now = Date.now() / 1000;
      if (now - cachedAt < CACHE_EXPIRY_SECONDS) {
        const synthesis = cachedData.improvement_points?.synthesis;
        if (synthesis) {
          console.log("Returning cached synthesis.");
          return new Response(JSON.stringify(synthesis), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
      } else {
        console.log("Cached data expired, re-fetching.");
      }
    }

    // 2. If not in cache or expired, fetch reviews and analyze
    const { data: reviewsData, error: reviewsError } = await adminSupabaseClient.functions.invoke('revyoos-proxy', {
      body: { holdingIds },
      headers: { Authorization: authorization }
    });

    if (reviewsError) {
      console.error("Error from revyoos-proxy:", reviewsError.message);
      throw new Error(`Error fetching reviews via proxy: ${reviewsError.message}`);
    }

    const reviews = reviewsData as { comment: string }[];
    if (!reviews || reviews.length === 0) {
      return new Response(JSON.stringify(""), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const allComments = reviews.map(r => r.comment).join("\n\n");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set in environment variables.");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Vous êtes un assistant qui analyse les avis clients pour un hébergement. Votre tâche est de rédiger une synthèse concise des retours concernant UNIQUEMENT le logement et ses équipements.\n\n**Règles strictes à suivre :**\n1. Ne mentionnez JAMAIS la propreté.\n2. Ne mentionnez JAMAIS le service de conciergerie, l'accueil, la communication ou le personnel.\n3. Concentrez-vous exclusivement sur les aspects physiques du logement : l'état des lieux, les meubles, les appareils électroménagers, la literie, l'isolation, etc.\n4. Rédigez une synthèse fluide et naturelle en 2-3 phrases maximum.\n5. La réponse doit être en français.\n6. Répondez uniquement avec un objet JSON contenant une seule clé `synthesis` qui est une chaîne de caractères. N'incluez aucun autre texte.",
          },
          {
            role: "user",
            content: `Analysez les avis suivants et générez la synthèse en respectant toutes les règles :\n\n${allComments}\n\nExemple de sortie : { "synthesis": "Les voyageurs apprécient la qualité de la literie, mais suggèrent d'améliorer l'isolation phonique. Certains équipements de cuisine pourraient être modernisés." }`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const aiData = await response.json();
    const synthesisContent = aiData.choices[0].message.content;
    let synthesisText: string = "";
    let synthesisObjectForCache: { synthesis: string };

    try {
      const jsonContent = JSON.parse(synthesisContent);
      if (typeof jsonContent.synthesis === 'string') {
        synthesisText = jsonContent.synthesis;
        synthesisObjectForCache = { synthesis: synthesisText };
      } else {
        throw new Error("AI response is not a valid object with a 'synthesis' key.");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", synthesisContent, parseError);
      synthesisText = "Erreur d'analyse de la synthèse (format inattendu de l'IA).";
      synthesisObjectForCache = { synthesis: synthesisText };
    }

    // 3. Cache the new results
    const { error: upsertError } = await adminSupabaseClient
      .from('cached_improvement_points')
      .upsert({
        holding_ids_hash: holdingIdsHash,
        holding_ids: sortedHoldingIds,
        improvement_points: synthesisObjectForCache,
        cached_at: new Date().toISOString(),
      }, { onConflict: 'holding_ids_hash' });

    if (upsertError) {
      console.error("Error upserting cache:", upsertError);
    }

    return new Response(JSON.stringify(synthesisText), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Error in review-analyzer function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});