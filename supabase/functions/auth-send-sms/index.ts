import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_MESSAGING_SERVICE_SID = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_MESSAGING_SERVICE_SID || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
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
    const { phoneNumber } = await req.json();
    if (!phoneNumber) {
      return new Response(JSON.stringify({ error: 'Le numéro de téléphone est requis.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Normalisation côté serveur (France par défaut)
    const normalizeFR = (raw: string): string => {
      let p = raw.trim().replace(/[\s\-\(\)]/g, '');
      if (p.startsWith('00')) p = `+${p.slice(2)}`;
      if (p.startsWith('33') && !p.startsWith('+')) p = `+${p}`;
      if (!p.startsWith('+') && p.length === 10 && p.startsWith('0')) p = `+33${p.slice(1)}`;
      if (p.startsWith('+0')) p = `+33${p.slice(2)}`;
      return p;
    };

    const normalizedPhone = normalizeFR(phoneNumber);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Store or update OTP in the database avec numéro normalisé
    const { error: dbError } = await supabaseAdmin.from('sms_otps').upsert(
      {
        phone_number: normalizedPhone,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: 'phone_number' }
    );

    if (dbError) {
      console.error('DB Error storing OTP:', dbError);
      throw new Error('Impossible de sauvegarder le code de vérification.');
    }

    // Twilio Messages API call via Basic Auth
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const bodyParams = new URLSearchParams({
      To: normalizedPhone,
      MessagingServiceSid: TWILIO_MESSAGING_SERVICE_SID!,
      Body: `Votre code de connexion Hello Keys est : ${otp}`,
    });

    const twilioAuthHeader = 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const smsResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': twilioAuthHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });

    if (!smsResponse.ok) {
      const errorBody = await smsResponse.text();
      console.error('Twilio API Error:', errorBody);
      throw new Error(`Échec de l'envoi du SMS via Twilio. Statut: ${smsResponse.status}`);
    }

    return new Response(JSON.stringify({ message: 'OTP sent successfully' }), {
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