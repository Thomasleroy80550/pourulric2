import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { Resend } from "npm:resend";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing environment variables.");
}

const resend = new Resend(RESEND_API_KEY);
const SMS_FACTOR_EMAIL = 'j97LxXQQEQc-alert@mail2sms.smsmarkt.com';

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

    const { phoneNumber } = await req.json();
    if (!phoneNumber) {
      return new Response(JSON.stringify({ error: 'Missing parameter: phoneNumber is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Store or update OTP in database
    const { error: dbError } = await supabaseAdmin.from('sms_otps').upsert(
      {
        phone_number: phoneNumber,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: 'phone_number' } // Specify the column to check for conflict
    );

    if (dbError) {
      console.error('DB Error storing OTP:', dbError);
      throw new Error('Could not save OTP.');
    }

    // Send email to SMS gateway
    const { error: emailError } = await resend.emails.send({
      from: 'Hello Keys OTP <noreply@notifications.hellokeys.fr>',
      to: [SMS_FACTOR_EMAIL],
      subject: phoneNumber, // Phone number as subject
      html: `Votre code de vérification Hello Keys est : ${otp}`,
    });

    if (emailError) {
      console.error('Resend API Error:', emailError);
      throw new Error('Failed to send OTP SMS.');
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