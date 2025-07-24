import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Configuration ---
const OTP_EXPIRATION_MINUTES = 5;
const DEV_TEST_PHONE_NUMBER = Deno.env.get('DEV_TEST_PHONE_NUMBER') || '33600000000'; // Numéro de test sans le '+'
const DEV_TEST_OTP = '123456';

// Helper to generate a 6-digit code
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, phone, otp } = await req.json();
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // --- Action: Send OTP ---
    if (action === 'send') {
      if (!phone) throw new Error("Le numéro de téléphone est requis.");

      const otpCode = phone === DEV_TEST_PHONE_NUMBER ? DEV_TEST_OTP : generateOtp();
      const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);

      // Store OTP in the database
      const { error: storeError } = await supabaseAdmin.from('sms_otps').insert({
        phone_number: phone,
        otp_code: otpCode, // In a real-world high-security scenario, you'd hash this.
        expires_at: expiresAt.toISOString(),
      });
      if (storeError) throw storeError;

      // Send SMS via SMSFactor, except for the test number
      if (phone !== DEV_TEST_PHONE_NUMBER) {
        const smsFactorToken = Deno.env.get('SMSFACTOR_API_TOKEN');
        const smsFactorSender = Deno.env.get('SMSFACTOR_SENDER') || 'HelloKeys';
        if (!smsFactorToken) throw new Error("La clé API SMSFactor n'est pas configurée.");

        const response = await fetch('https://api.smsfactor.com/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${smsFactorToken}`,
          },
          body: JSON.stringify({
            to: phone,
            text: `Votre code de connexion HelloKeys est : ${otpCode}`,
            sender: smsFactorSender,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.json();
          console.error("SMSFactor API Error:", errorBody);
          throw new Error("Erreur lors de l'envoi du SMS.");
        }
      }

      return new Response(JSON.stringify({ success: true, message: "Code OTP envoyé." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // --- Action: Verify OTP ---
    if (action === 'verify') {
      if (!phone || !otp) throw new Error("Le téléphone et l'OTP sont requis.");

      // Find the OTP in the database
      const { data: otpEntry, error: findError } = await supabaseAdmin
        .from('sms_otps')
        .select('*')
        .eq('phone_number', phone)
        .eq('otp_code', otp)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (findError || !otpEntry) throw new Error("Code OTP invalide.");
      if (new Date(otpEntry.expires_at) < new Date()) throw new Error("Code OTP expiré.");

      // Clean up used OTP
      await supabaseAdmin.from('sms_otps').delete().eq('id', otpEntry.id);

      // --- NEW LOGIC: Find user by phone number in profiles first ---
      let targetEmail: string | null = null;

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('phone_number', phone)
        .single();

      if (profile) {
        // Profile found, get the user's real email
        const { data: { user }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
        if (getUserError || !user) {
          console.error(`Profile found for phone ${phone} but no matching auth user with id ${profile.id}`);
          throw new Error("Utilisateur associé non trouvé. Veuillez contacter le support.");
        }
        if (!user.email) {
            throw new Error("L'utilisateur associé n'a pas d'email. Connexion impossible.");
        }
        targetEmail = user.email;
      } else {
        // No profile found, proceed with phone-based user lookup/creation
        const { data: { users }, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers({ phone });
        if (listUsersError) throw listUsersError;

        const existingUser = users.find(u => u.phone === phone);

        if (existingUser) {
          targetEmail = existingUser.email!;
        } else {
          // Create a new user
          const newDummyEmail = `${phone}@hellokeys.com`;
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            phone: phone,
            email: newDummyEmail,
            phone_confirmed_at: new Date().toISOString(),
            email_confirm: true, // Auto-confirm dummy email
          });
          if (createError) throw createError;
          
          // Also add the phone number to the new user's profile
          await supabaseAdmin.from('profiles').update({ phone_number: phone }).eq('id', newUser.user.id);

          targetEmail = newDummyEmail;
        }
      }

      if (!targetEmail) {
        throw new Error("Impossible de déterminer l'email pour la connexion.");
      }

      // Generate magic link to create a session
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: targetEmail,
      });
      if (linkError) throw linkError;

      return new Response(JSON.stringify({ success: true, action_link: linkData.properties.action_link }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    throw new Error("Action non valide.");

  } catch (error) {
    console.error('Error in custom-sms-auth function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});