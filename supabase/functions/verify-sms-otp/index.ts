import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') ?? '').trim();
const SUPABASE_SERVICE_ROLE_KEY = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim();
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

  // Runtime validation: missing/invalid secrets
  const missing: string[] = [];
  const invalid: string[] = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!TWILIO_ACCOUNT_SID) missing.push('TWILIO_ACCOUNT_SID');
  if (!TWILIO_AUTH_TOKEN) missing.push('TWILIO_AUTH_TOKEN');
  if (!TWILIO_VERIFY_SERVICE_SID) missing.push('TWILIO_VERIFY_SERVICE_SID');
  if (TWILIO_ACCOUNT_SID && !TWILIO_ACCOUNT_SID.startsWith('AC')) invalid.push('TWILIO_ACCOUNT_SID doit commencer par "AC"');
  if (TWILIO_VERIFY_SERVICE_SID && !TWILIO_VERIFY_SERVICE_SID.startsWith('VA')) invalid.push('TWILIO_VERIFY_SERVICE_SID doit commencer par "VA"');

  if (missing.length || invalid.length) {
    return new Response(JSON.stringify({
      error: "Configuration manquante/invalide (Supabase/Twilio).",
      missing,
      invalid,
      hint: "Mettez des valeurs correctes dans Supabase → Edge Functions → Manage Secrets (sans guillemets, sans espaces)."
    }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }

  try {
    const { phoneNumber, otp } = await req.json();
    if (!phoneNumber || !otp) {
      return new Response(JSON.stringify({ error: 'Missing parameters: phoneNumber and otp are required.' }), {
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

    // Twilio Verify v2 - vérifier le code
    const checkUrl = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`;
    const bodyParams = new URLSearchParams({
      To: normalizedPhone,
      Code: otp,
    });
    const twilioAuthHeader = 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const checkResp = await fetch(checkUrl, {
      method: 'POST',
      headers: {
        'Authorization': twilioAuthHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });

    if (!checkResp.ok) {
      const errText = await checkResp.text();
      console.error('Twilio Verify check error:', errText);
      return new Response(JSON.stringify({ error: 'Code invalide ou expiré.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const checkJson = await checkResp.json();
    if (checkJson.status !== 'approved') {
      return new Response(JSON.stringify({ error: 'Code invalide ou expiré.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: getUserErr } = await createClient(SUPABASE_URL, req.headers.get('apikey') || '').auth.getUser();
    const userId = user?.id;
    if (!userId || getUserErr) {
      return new Response(JSON.stringify({ error: 'Unauthorized: User not authenticated.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ phone_number: normalizedPhone })
      .eq('id', userId);

    if (updateError) {
      console.error('DB Error updating profile:', updateError);
      throw new Error('Could not update profile with new phone number.');
    }

    return new Response(JSON.stringify({ message: 'Phone number verified successfully.' }), {
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