import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
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

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find OTP in database
    const { data: otpData, error: findError } = await supabaseAdmin
      .from('sms_otps')
      .select('id, expires_at')
      .eq('phone_number', phoneNumber)
      .eq('otp_code', otp)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (findError || !otpData) {
      return new Response(JSON.stringify({ error: 'Code invalide ou expiré.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (new Date(otpData.expires_at) < new Date()) {
      // Clean up expired OTP
      await supabaseAdmin.from('sms_otps').delete().eq('id', otpData.id);
      return new Response(JSON.stringify({ error: 'Code expiré.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // OTP is valid, delete it
    await supabaseAdmin.from('sms_otps').delete().eq('id', otpData.id);

    // Update user's profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ phone_number: phoneNumber })
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