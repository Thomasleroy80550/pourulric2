import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

// Get secrets from environment
const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') ?? '').trim();
const TWILIO_ACCOUNT_SID = (Deno.env.get('TWILIO_ACCOUNT_SID') ?? '').trim();
const TWILIO_AUTH_TOKEN = (Deno.env.get('TWILIO_AUTH_TOKEN') ?? '').trim();
const TWILIO_VERIFY_SERVICE_SID = (Deno.env.get('TWILIO_VERIFY_SERVICE_SID') ?? '').trim();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Runtime validation: missing/invalid secrets with helpful hints
  const missing: string[] = [];
  const invalid: string[] = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!TWILIO_ACCOUNT_SID) missing.push('TWILIO_ACCOUNT_SID');
  if (!TWILIO_AUTH_TOKEN) missing.push('TWILIO_AUTH_TOKEN');
  if (!TWILIO_VERIFY_SERVICE_SID) missing.push('TWILIO_VERIFY_SERVICE_SID');
  if (TWILIO_ACCOUNT_SID && !TWILIO_ACCOUNT_SID.startsWith('AC')) invalid.push('TWILIO_ACCOUNT_SID doit commencer par "AC"');
  if (TWILIO_VERIFY_SERVICE_SID && !TWILIO_VERIFY_SERVICE_SID.startsWith('VA')) invalid.push('TWILIO_VERIFY_SERVICE_SID doit commencer par "VA"');

  if (missing.length || invalid.length) {
    return new Response(JSON.stringify({
      error: "Configuration Twilio invalide ou manquante.",
      missing,
      invalid,
      hint: "Vérifiez vos secrets dans Supabase → Edge Functions → Manage Secrets (sans guillemets, sans espaces)."
    }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }

  try {
    // Auth check to ensure only authenticated users can trigger this
    const anonKey = req.headers.get('apikey');
    const authHeader = req.headers.get('Authorization');
    if (!anonKey || !authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }
    const supabaseAuthClient = createClient(SUPABASE_URL, anonKey, {
        global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuthClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: User not authenticated." }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { phoneNumber } = await req.json();
    if (!phoneNumber) {
      return new Response(JSON.stringify({ error: 'Missing parameter: phoneNumber is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    function normalizeFR(raw: string): string {
      let p = raw.trim().replace(/[\s\-\(\)]/g, '');
      if (p.startsWith('00')) p = `+${p.slice(2)}`;
      if (p.startsWith('33') && !p.startsWith('+')) p = `+${p}`;
      if (!p.startsWith('+') && p.length === 10 && p.startsWith('0')) p = `+33${p.slice(1)}`;
      if (p.startsWith('+0')) p = `+33${p.slice(2)}`;
      if (p.startsWith('+33') && p.length > 3 && p[3] === '0') p = `+33${p.slice(4)}`;
      return p;
    }
    const normalizedPhone = normalizeFR(phoneNumber);

    // Twilio Verify v2 - démarrer la vérification
    const verifyUrl = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/Verifications`;
    const bodyParams = new URLSearchParams({
      To: normalizedPhone,
      Channel: 'sms',
    });
    const twilioAuthHeader = 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const resp = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Authorization': twilioAuthHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('Twilio Verify start error:', errText);
      return new Response(JSON.stringify({ error: "Échec de l'envoi du code de vérification." }), {
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
})