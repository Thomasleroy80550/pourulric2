import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

type BilanInput = {
  year: number;
  totals: {
    totalCA: number;
    totalMontantVerse: number;
    totalFrais: number;
    totalDepenses: number;
    resultatNet: number;
    totalReservations?: number;
  };
  monthly: Array<{
    name: string;
    ca: number;
    montantVerse: number;
    frais: number;
    benef: number;
    nuits: number;
    reservations: number;
    prixParNuit: number;
  }>;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const input = await req.json() as BilanInput;
    if (!input || !input.year || !input.totals || !Array.isArray(input.monthly)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: corsHeaders });
    }

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), { status: 500, headers: corsHeaders });
    }

    // Compose a structured prompt
    const nextYear = (input.year || 0) + 1;
    const totalRes = input.totals.totalReservations ?? input.monthly.reduce((sum, m) => sum + (m.reservations || 0), 0);

    const prompt = `
Tu écris en tant qu'agent Hello Keys. Produit une analyse brève, concrète et actionnable pour l'année ${input.year}, en français.
Contraintes:
- Longueur: 150 à 220 mots maximum
- Pas de Markdown, pas de #, ##, ###, ni de backticks
- Ton: professionnel, direct, utile (voix Hello Keys)
- Structure: 
  1) Phrase de synthèse claire (une ou deux phrases)
  2) 3 à 5 puces d'insights clés (saisonnalité, variations, prix/nuit, réservations, nuits)
- N'invente pas de données si elles manquent. Cite le nombre exact de réservations: ${totalRes}.

Données disponibles:
Totaux: CA=${input.totals.totalCA.toFixed(2)}€; Versé=${input.totals.totalMontantVerse.toFixed(2)}€; Frais=${input.totals.totalFrais.toFixed(2)}€; Dépenses=${input.totals.totalDepenses.toFixed(2)}€; Résultat net=${input.totals.resultatNet.toFixed(2)}€; Réservations=${totalRes}.

Mensuel (mois; CA; Versé; Frais; Bénéf; Nuits; Réserv.; Prix/Nuit):
${input.monthly.map(m => `${m.name}: CA=${m.ca.toFixed(2)}€; Versé=${m.montantVerse.toFixed(2)}€; Frais=${m.frais.toFixed(2)}€; Bénéf=${m.benef.toFixed(2)}€; Nuits=${m.nuits}; Réserv=${m.reservations}; Px/Nuit=${m.prixParNuit.toFixed(2)}€`).join("\n")}

Rédige en gardant un style clair et centré sur la valeur pour le propriétaire Hello Keys.
    `.trim();

    // Call OpenAI Chat Completions
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Tu es un agent Hello Keys qui produit des analyses financières courtes, concrètes et actionnables pour des locations saisonnières. N'utilise pas de Markdown." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: `OpenAI error: ${resp.status} ${text}` }), { status: 500, headers: corsHeaders });
    }

    const json = await resp.json();
    const analysis = json?.choices?.[0]?.message?.content || "Analyse indisponible.";

    return new Response(JSON.stringify({ analysis }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), { status: 500, headers: corsHeaders });
  }
});