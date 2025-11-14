import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_VERIFY_SERVICE_SID = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');

// REMOVED: top-level throw on missing env (to avoid opaque 500 at boot)
// if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
//   throw new Error("Missing environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID");
// }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizeFR(raw: string): string {
  let p = raw.trim().replace(/[\s\-\(\)]/g, '');
  if (p.startsWith('00')) p = `+${p.slice(2)}`;
  if (p.startsWith('33') && !p.startsWith('+')) p = `+${p}`;
  if (!p.startsWith('+') && p.length === 10 && p.startsWith('0')) p = `+33${p.slice(1)}`;
  if (p.startsWith('+0')) p = `+33${p.slice(2)}`;
  // Corrige "+3306..." -> "+336..."
  if (p.startsWith('+33') && p.length > 3 && p[3] === '0') p = `+33${p.slice(4)}`;
  return p;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // NEW: runtime check with explicit JSON error
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    const missing = [];
    if (!TWILIO_ACCOUNT_SID) missing.push('TWILIO_ACCOUNT_SID');
    if (!TWILIO_AUTH_TOKEN) missing.push('TWILIO_AUTH_TOKEN');
    if (!TWILIO_VERIFY_SERVICE_SID) missing.push('TWILIO_VERIFY_SERVICE_SID');
    return new Response(JSON.stringify({
      error: "Configuration Twilio manquante. Merci d'ajouter ces secrets dans Supabase → Edge Functions → Manage Secrets.",
      missing
    }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }

  try {
    const { phoneNumber } = await req.json();
    if (!phoneNumber) {
      return new Response(JSON.stringify({ error: 'Le numéro de téléphone est requis.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const normalizedPhone = normalizeFR(phoneNumber);

    // REPLACED: ancien endpoint 2010-04-01 -> nouveau endpoint v2
    const verifyUrl = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/Verifications`;
    const bodyParams = new URLSearchParams({
      To: normalizedPhone,
      Channel: 'sms',
    });
    const authHeader = 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const resp = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('Twilio Verify start error:', errText);
      const message = errText || "Échec de l'envoi du code de vérification.";
      return new Response(JSON.stringify({ error: message }), {
        status: resp.status || 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ message: 'Code de vérification envoyé.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('Server Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});