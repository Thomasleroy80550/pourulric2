import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

// Get secrets from environment
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_VERIFY_SERVICE_SID = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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

    // Normalisation FR au format E.164 (+33)
    function normalizeFR(raw: string): string {
      let p = raw.trim().replace(/[\s\-\(\)]/g, '');
      if (p.startsWith('00')) p = `+${p.slice(2)}`;
      if (p.startsWith('33') && !p.startsWith('+')) p = `+${p}`;
      if (!p.startsWith('+') && p.length === 10 && p.startsWith('0')) p = `+33${p.slice(1)}`;
      if (p.startsWith('+0')) p = `+33${p.slice(2)}`;
      // remove trunk '0' après +33 (ex: "+3306..." -> "+336...")
      if (p.startsWith('+33') && p.length > 3 && p[3] === '0') p = `+33${p.slice(4)}`;
      return p;
    }
    const normalizedPhone = normalizeFR(phoneNumber);

    // NEW: Twilio Verify - démarrer la vérification (envoi du SMS)
    const verifyUrl = `https://verify.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Services/${TWILIO_VERIFY_SERVICE_SID}/Verifications`;
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
})