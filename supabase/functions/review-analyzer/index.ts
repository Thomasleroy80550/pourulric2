import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Récupérer le token d'authentification de l'utilisateur
    const authorization = req.headers.get('Authorization')!;

    // Vérifier que l'utilisateur est bien authentifié
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

    // Utiliser le client admin pour les opérations nécessitant des droits élevés
    const adminSupabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Étape 1: Récupérer les avis en transmettant le token de l'utilisateur
    const { data: reviewsData, error: reviewsError } = await adminSupabaseClient.functions.invoke('revyoos-proxy', {
      body: { holdingIds },
      headers: {
        Authorization: authorization
      }
    });

    if (reviewsError) {
      console.error("Error from revyoos-proxy:", reviewsError.message);
      throw new Error(`Error fetching reviews via proxy: ${reviewsError.message}`);
    }

    const reviews = reviewsData as { comment: string }[];

    if (!reviews || reviews.length === 0) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const allComments = reviews.map(r => r.comment).join("\n\n");

    // Étape 2: Envoyer les commentaires à l'IA pour analyse
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
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an assistant that analyzes customer reviews for an accommodation and extracts key areas for improvement. Provide a concise list of improvement points based on the reviews. Respond only with a JSON object containing a single key 'improvement_points' which is an array of strings. Do not include any other text.",
          },
          {
            role: "user",
            content: `Analyze the following accommodation reviews and list key improvement points:\n\n${allComments}\n\nExample output: { "improvement_points": ["Propreté des salles de bain", "Isolation phonique", "Qualité de la literie"] }`,
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
    const improvementPointsContent = aiData.choices[0].message.content;
    let parsedPoints: string[] = [];
    try {
        const jsonContent = JSON.parse(improvementPointsContent);
        if (Array.isArray(jsonContent.improvement_points)) {
            parsedPoints = jsonContent.improvement_points;
        } else {
            throw new Error("AI response is not a valid array of improvement points under 'improvement_points' key.");
        }
    } catch (parseError) {
        console.error("Failed to parse AI response:", improvementPointsContent, parseError);
        parsedPoints = ["Erreur d'analyse des points d'amélioration (format inattendu de l'IA)."];
    }

    return new Response(JSON.stringify(parsedPoints), {
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