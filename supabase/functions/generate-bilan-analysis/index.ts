import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

type BilanInput = {
  year: number;
  totals: {
    totalCA: number;
    totalMontantVerse: number;
    totalFrais: number;
    totalDepenses: number;
    resultatNet: number;
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
    const prompt = `
Tu es un analyste financier pour des locations saisonnières. Écris une analyse claire et concise pour l'année ${input.year}, en français.
Inclure:
1) Synthèse générale (CA, montant versé, frais, autres dépenses, résultat net).
2) Tendances mensuelles clés (saisonnalité, variations fortes).
3) Indicateurs opérationnels (nuits, réservations, prix par nuit) avec insights.
4) Recommandations concrètes pour la prochaine saison.

Données:
- Totaux: CA=${input.totals.totalCA.toFixed(2)}, Montant versé=${input.totals.totalMontantVerse.toFixed(2)}, Frais=${input.totals.totalFrais.toFixed(2)}, Dépenses=${input.totals.totalDepenses.toFixed(2)}, Résultat net=${input.totals.resultatNet.toFixed(2)}.
- Mensuel (mois; CA; Versé; Frais; Bénéf; Nuits; Réserv.; Prix/Nuit):
${input.monthly.map(m => `${m.name}: CA=${m.ca.toFixed(2)}; Versé=${m.montantVerse.toFixed(2)}; Frais=${m.frais.toFixed(2)}; Bénéf=${m.benef.toFixed(2)}; Nuits=${m.nuits}; Réserv=${m.reservations}; Px/Nuit=${m.prixParNuit.toFixed(2)}`).join("\n")}

Style: professionnel, accessible, avec sous-titres et puces si utile. Ne pas dépasser ~400 mots.
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
          { role: "system", content: "Tu es un analyste financier spécialisé en locations saisonnières." },
          { role: "user", content: prompt }
        ],
        temperature: 0.4,
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