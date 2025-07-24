import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OTP_EXPIRATION_MINUTES = 5;
const DEV_TEST_PHONE_NUMBER = Deno.env.get('DEV_TEST_PHONE_NUMBER') || '33600000000';
const DEV_TEST_OTP = '123456';

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendSms(phone: string, otpCode: string) {
  console.log(`[sendSms] Début de l'envoi de SMS pour le numéro : ${phone}`);

  if (phone === DEV_TEST_PHONE_NUMBER) {
    console.log(`[sendSms] Numéro de test détecté (${phone}). Aucun SMS ne sera envoyé.`);
    return;
  }

  const smsFactorToken = Deno.env.get('SMSFACTOR_API_TOKEN');
  if (!smsFactorToken) {
    console.error("[sendSms] Erreur critique : La variable d'environnement SMSFACTOR_API_TOKEN est manquante.");
    throw new Error("La clé API SMSFactor n'est pas configurée.");
  }
  
  const smsFactorSender = Deno.env.get('SMSFACTOR_SENDER') || 'HelloKeys';
  
  const payload = {
    text: `Votre code de connexion HelloKeys est : ${otpCode}`,
    to: phone,
    sender: smsFactorSender,
  };

  console.log('[sendSms] Préparation de l\'envoi vers SMSFactor avec le payload :', JSON.stringify(payload));

  try {
    const response = await fetch('https://api.smsfactor.com/api/v2/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${smsFactorToken}`,
      },
      body: JSON.stringify(payload),
    });

    console.log(`[sendSms] Réponse de SMSFactor reçue avec le statut : ${response.status}`);
    const responseText = await response.text();

    if (!response.ok) {
      console.error("[sendSms] Erreur de l'API SMSFactor. Réponse brute :", responseText);
      let errorMessage = `Erreur lors de l'envoi du SMS (status: ${response.status}).`;
      if (responseText) {
        try {
          const errorBody = JSON.parse(responseText);
          errorMessage = errorBody?.message || errorMessage;
        } catch (e) {
          errorMessage += ` Réponse: ${responseText}`;
        }
      }
      throw new Error(errorMessage);
    }

    if (responseText) {
      const responseBody = JSON.parse(responseText);
      console.log('[sendSms] SMS envoyé avec succès via SMSFactor. Réponse :', responseBody);
    } else {
      console.log('[sendSms] SMS envoyé avec succès via SMSFactor (réponse vide).');
    }

  } catch (error) {
    console.error("[sendSms] Exception lors de l'appel à l'API SMSFactor :", error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, phone, otp } = await req.json();
    console.log(`[Handler] Action reçue: ${action}, Téléphone: ${phone ? phone : 'non fourni'}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authorization = req.headers.get('Authorization');

    // --- Authenticated Actions ---
    if (action === 'send-verification' || action === 'verify-and-update') {
      if (!authorization) throw new Error("Authentification requise.");
      
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authorization } } }
      );
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Utilisateur non authentifié.");

      if (action === 'send-verification') {
        console.log(`[send-verification] Début pour l'utilisateur ${user.id} et le téléphone ${phone}`);
        if (!phone) throw new Error("Le numéro de téléphone est requis.");

        const { data: existingProfile, error: profileError } = await supabaseAdmin
          .from('profiles').select('id').eq('phone_number', phone).not('id', 'eq', user.id).single();
        if (existingProfile) throw new Error("Ce numéro est déjà utilisé.");
        if (profileError && profileError.code !== 'PGRST116') throw profileError;

        const otpCode = phone === DEV_TEST_PHONE_NUMBER ? DEV_TEST_OTP : generateOtp();
        await supabaseAdmin.from('sms_otps').upsert({ phone_number: phone, otp_code: otpCode, expires_at: new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000).toISOString() }, { onConflict: 'phone_number' });
        
        await sendSms(phone, otpCode);
        console.log(`[send-verification] Processus terminé pour le téléphone ${phone}`);

        return new Response(JSON.stringify({ success: true, message: "Code envoyé." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (action === 'verify-and-update') {
        console.log(`[verify-and-update] Début pour l'utilisateur ${user.id} et le téléphone ${phone}`);
        if (!phone || !otp) throw new Error("Téléphone et OTP requis.");

        const { data: otpEntry, error: findError } = await supabaseAdmin.from('sms_otps').select('*').eq('phone_number', phone).eq('otp_code', otp).single();
        if (findError || !otpEntry) throw new Error("Code OTP invalide.");
        if (new Date(otpEntry.expires_at) < new Date()) throw new Error("Code OTP expiré.");

        await supabaseAdmin.from('sms_otps').delete().eq('id', otpEntry.id);
        const { error: updateError } = await supabaseAdmin.from('profiles').update({ phone_number: phone }).eq('id', user.id);
        if (updateError) throw updateError;
        
        console.log(`[verify-and-update] Numéro mis à jour avec succès pour l'utilisateur ${user.id}`);
        return new Response(JSON.stringify({ success: true, message: "Numéro mis à jour." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // --- Unauthenticated Actions (Login) ---
    if (action === 'send') {
      console.log(`[send] Début de l'envoi de l'OTP pour le téléphone ${phone}`);
      if (!phone) throw new Error("Le numéro de téléphone est requis.");
      const otpCode = phone === DEV_TEST_PHONE_NUMBER ? DEV_TEST_OTP : generateOtp();
      await supabaseAdmin.from('sms_otps').upsert({ phone_number: phone, otp_code: otpCode, expires_at: new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000).toISOString() }, { onConflict: 'phone_number' });
      
      await sendSms(phone, otpCode);
      console.log(`[send] Processus d'envoi de l'OTP terminé pour le téléphone ${phone}`);
      
      return new Response(JSON.stringify({ success: true, message: "Code OTP envoyé." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'verify') {
      console.log(`[verify] Début de la vérification de l'OTP pour le téléphone ${phone}`);
      if (!phone || !otp) throw new Error("Téléphone et OTP requis.");
      const { data: otpEntry, error: findError } = await supabaseAdmin.from('sms_otps').select('*').eq('phone_number', phone).eq('otp_code', otp).single();
      if (findError || !otpEntry) throw new Error("Code OTP invalide.");
      if (new Date(otpEntry.expires_at) < new Date()) throw new Error("Code OTP expiré.");
      await supabaseAdmin.from('sms_otps').delete().eq('id', otpEntry.id);

      let targetEmail: string | null = null;
      const { data: profile } = await supabaseAdmin.from('profiles').select('id').eq('phone_number', phone).single();

      if (profile) {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(profile.id);
        if (!user || !user.email) throw new Error("Utilisateur associé non trouvé ou sans email.");
        targetEmail = user.email;
      } else {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ phone });
        const existingUser = users.find(u => u.phone === phone);
        if (existingUser) {
          targetEmail = existingUser.email!;
        } else {
          const newDummyEmail = `${phone}@hellokeys.com`;
          const { data: { user } } = await supabaseAdmin.auth.admin.createUser({ phone: phone, email: newDummyEmail, phone_confirmed_at: new Date().toISOString(), email_confirm: true });
          await supabaseAdmin.from('profiles').update({ phone_number: phone }).eq('id', user.id);
          targetEmail = newDummyEmail;
        }
      }

      if (!targetEmail) throw new Error("Impossible de déterminer l'email pour la connexion.");
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email: targetEmail });
      if (linkError) throw linkError;

      console.log(`[verify] Lien magique généré avec succès pour ${targetEmail}`);
      return new Response(JSON.stringify({ success: true, action_link: linkData.properties.action_link }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    throw new Error("Action non valide.");

  } catch (error) {
    console.error('Error in custom-sms-auth function:', error);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
});