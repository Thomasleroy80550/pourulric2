import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_VERIFY_SERVICE_SID = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
  throw new Error("Missing environment variables.");
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
    // Auth check
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

    const { phoneNumber, otp } = await req.json();
    if (!phoneNumber || !otp) {
      return new Response(JSON.stringify({ error: 'Missing parameters: phoneNumber and otp are required.' }), {
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

    // NEW: Twilio Verify - vérifier le code
    const checkUrl = `https://verify.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Services/${TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`;
    const bodyParams = new URLSearchParams({
      To: normalizedPhone,
      Code: otp,
    });
    const authHeader = 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const checkResp = await fetch(checkUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
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

    // OTP validé: mise à jour du numéro dans le profil
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ phone_number: normalizedPhone })
      .eq('id', user.id);

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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
})