import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MonthlyPoint {
  month: string;
  totalCA: number;
  totalMontantVerse: number;
  totalFacture: number;
  totalNuits: number;
  adr: number;
  revpar: number;
  occupation: number;
}

interface YearlyTotals {
  totalCA: number;
  totalMontantVerse: number;
  totalFacture: number;
  totalNuits: number;
  totalReservations: number;
  totalVoyageurs: number;
  adr: number;
  revpar: number;
  yearlyOccupation: number;
  net: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Optional: verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { clientName, year, yearlyTotals, monthlySeries } = await req.json() as {
      clientName: string;
      year: number;
      yearlyTotals: YearlyTotals;
      monthlySeries: MonthlyPoint[];
    };

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const shortMonthly = monthlySeries.map((m) => `${m.month}: CA ${m.totalCA.toFixed(0)}, Occ ${m.occupation.toFixed(1)}%`).join(' | ');

    const prompt = `
Tu es un analyste financier pour des locations saisonnières. Rédige une synthèse claire et concise en français (150 à 220 mots) pour le client "${clientName}" sur l'année ${year}.
Données annuelles:
- CA: ${yearlyTotals.totalCA.toFixed(2)} €
- Versé: ${yearlyTotals.totalMontantVerse.toFixed(2)} €
- Frais HK: ${yearlyTotals.totalFacture.toFixed(2)} €
- Net: ${yearlyTotals.net.toFixed(2)} €
- Nuits vendues: ${yearlyTotals.totalNuits} | Réservations: ${yearlyTotals.totalReservations} | Voyageurs: ${yearlyTotals.totalVoyageurs}
- ADR: ${yearlyTotals.adr.toFixed(2)} € | RevPAR: ${yearlyTotals.revpar.toFixed(2)} € | Occupation: ${yearlyTotals.yearlyOccupation.toFixed(1)} %

Tendance mensuelle (résumé):
${shortMonthly}

Structure demandée:
1) Aperçu des performances (CA, occupation, ADR/RevPAR, net) avec points forts/faibles.
2) 3 recommandations concrètes et actionnables (tarification, calendrier, distribution, contenu, etc.).
3) Une phrase de conclusion positive.

Reste factuel, sans jargon inutile, et mets les chiffres clés en valeur (formats € et %).`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Tu es un expert en analyse de performance d’hébergements touristiques. Écris en français, clair et utile.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(JSON.stringify({ error: `OpenAI error: ${response.status} - ${text}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const json = await response.json();
    const summary = json?.choices?.[0]?.message?.content || 'Synthèse indisponible.';

    return new Response(JSON.stringify({ summary }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('performance-summary error:', e?.message || e);
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});