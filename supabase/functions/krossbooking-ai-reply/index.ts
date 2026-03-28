import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ThreadMessage = {
  id_message?: number;
  date?: string;
  sender?: string;
  text?: string;
};

type ReplyRequest = {
  reservation?: Record<string, unknown> | null;
  room?: Record<string, unknown> | null;
  thread?: {
    id_thread?: number;
    cod_channel?: string;
    messages?: ThreadMessage[];
  } | null;
  additionalInstructions?: string;
};

const roomFieldLabels: Record<string, string> = {
  room_name: "Nom du logement",
  property_type: "Type de logement",
  keybox_code: "Code boîte à clés",
  wifi_ssid: "Nom du Wi‑Fi",
  wifi_code: "Code Wi‑Fi",
  wifi_box_location: "Emplacement box Wi‑Fi",
  arrival_instructions: "Instructions d'arrivée",
  parking_info: "Informations parking",
  parking_address: "Adresse parking",
  parking_spots: "Nombre de places",
  parking_type: "Type de parking",
  parking_badge_or_disk: "Badge / disque requis",
  parking_regulated_zone_instructions: "Consignes zone réglementée",
  house_rules: "Règles de la maison",
  waste_sorting_instructions: "Tri des déchets",
  forbidden_areas: "Zones interdites",
  appliances_list: "Équipements",
  bedding_description: "Literie",
  outdoor_equipment: "Équipements extérieurs",
  specific_appliances: "Équipements spécifiques",
  technical_room_location: "Local technique",
  logement_specificities: "Particularités du logement",
  departure_instructions: "Instructions de départ",
  utility_locations: "Emplacement des compteurs",
  recent_works: "Travaux récents",
};

function normalizeRoomContext(room: Record<string, unknown> | null | undefined) {
  if (!room) {
    return [] as Array<{ label: string; value: string }>;
  }

  return Object.entries(room)
    .filter(([key, value]) => roomFieldLabels[key] && value !== null && value !== undefined && value !== "")
    .map(([key, value]) => ({
      label: roomFieldLabels[key],
      value: String(value),
    }));
}

function normalizeThreadMessages(messages: ThreadMessage[] | undefined) {
  return (messages ?? [])
    .filter((message) => typeof message.text === "string" && message.text.trim())
    .slice(-20)
    .map((message) => ({
      sender: message.sender ?? "unknown",
      date: message.date ?? "",
      text: message.text?.trim() ?? "",
    }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: `Unsupported HTTP method: ${req.method}` }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      console.warn("[krossbooking-ai-reply] missing authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !authData.user) {
      console.warn(`[krossbooking-ai-reply] auth failed error=${authError?.message ?? "missing-user"}`);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      console.error("[krossbooking-ai-reply] missing OPENAI_API_KEY");
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ReplyRequest;
    const roomContext = normalizeRoomContext(body.room);
    const messages = normalizeThreadMessages(body.thread?.messages);

    if (!body.thread?.id_thread || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Missing thread data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = {
      reservation: body.reservation ?? null,
      roomContext,
      channel: body.thread.cod_channel ?? null,
      additionalInstructions: body.additionalInstructions?.trim() || null,
      conversation: messages,
    };

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Tu es un assistant de location saisonnière. Tu lis une conversation voyageur et tu proposes une réponse semi-automatique en français. Tu dois utiliser uniquement les informations présentes dans la conversation, les données de réservation et le contexte du logement. N'invente jamais un code, une adresse, un horaire ou une promesse absente du contexte. Si une information manque, propose une réponse prudente qui le dit clairement ou pose une question. Réponds STRICTEMENT en JSON avec les clés suivantes: intentCategory, intentSummary, confidence, suggestedReply, missingInformation, factsUsed. confidence doit être un nombre entre 0 et 1. factsUsed et missingInformation doivent être des tableaux de chaînes.",
          },
          {
            role: "user",
            content: `Analyse cette demande voyageur et prépare un brouillon prêt à relire avant envoi.\n\nCatégories d'intention possibles: arrivée, départ, parking, wifi, équipement, règles_maison, incident, ménage, accès, localisation, disponibilité, autre.\n\nContraintes pour suggestedReply:\n- ton professionnel, chaleureux et concis\n- en français\n- réponds à la dernière demande du voyageur en tenant compte de l'historique\n- pas de markdown\n- pas de listes sauf si vraiment utile\n- si une information manque, dis-le clairement sans l'inventer\n\nDonnées:\n${JSON.stringify(prompt)}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`[krossbooking-ai-reply] openai error status=${aiResponse.status} body=${errorText}`);
      return new Response(JSON.stringify({ error: `OpenAI error: ${aiResponse.status}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResponse.json();
    const content = aiJson?.choices?.[0]?.message?.content;

    if (!content) {
      console.error("[krossbooking-ai-reply] empty AI response");
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(content);
    console.log(`[krossbooking-ai-reply] generated draft userId=${authData.user.id} threadId=${body.thread.id_thread}`);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[krossbooking-ai-reply] error ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
