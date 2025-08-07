import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const APP_BASE_URL = Deno.env.get('APP_BASE_URL');

console.log('--- auth-verify-sms function starting ---');
console.log(`SUPABASE_URL: ${SUPABASE_URL ? 'Loaded' : 'MISSING'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? 'Loaded' : 'MISSING'}`);
console.log(`APP_BASE_URL: ${APP_BASE_URL ? 'Loaded' : 'MISSING'}`);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !APP_BASE_URL) {
  const missing = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!APP_BASE_URL) missing.push('APP_BASE_URL');
  const errorMessage = `Missing environment variables: ${missing.join(', ')}`;
  console.error(`Critical Error: ${errorMessage}`);
  throw new Error(errorMessage);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DUMMY_EMAIL_DOMAIN = 'phone.hellokeys.app';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { phoneNumber, otp } = await req.json();
    if (!phoneNumber || !otp) {
      return new Response(JSON.stringify({ error: 'Paramètres manquants: phoneNumber et otp sont requis.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Verify OTP
    const { data: otpData, error: findError } = await supabaseAdmin
      .from('sms_otps')
      .select('id, expires_at')
      .eq('phone_number', phoneNumber)
      .eq('otp_code', otp)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (findError || !otpData) {
      return new Response(JSON.stringify({ error: 'Code invalide.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    await supabaseAdmin.from('sms_otps').delete().eq('id', otpData.id);

    if (new Date(otpData.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Code expiré.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 2. Find or create user
    let userEmail;
    let userId;

    // Using listUsers with a high perPage limit to avoid pagination issues
    const { data: { users }, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });

    if (listUsersError) {
      console.error('Error listing users:', listUsersError);
      throw new Error('Erreur lors de la recherche de l\'utilisateur.');
    }

    let existingUser = users.find(u => u.phone === phoneNumber);

    // If user not found by phone, try finding by the dummy email
    if (!existingUser) {
      const dummyEmail = `${phoneNumber}@${DUMMY_EMAIL_DOMAIN}`;
      existingUser = users.find(u => u.email === dummyEmail);
      if (existingUser && !existingUser.phone) {
        // If found by dummy email but phone is not set, update the phone
        const { error: updatePhoneError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { phone: phoneNumber });
        if (updatePhoneError) {
          console.error('Error updating user phone:', updatePhoneError);
          throw new Error('Impossible de mettre à jour le numéro de téléphone de l\'utilisateur existant.');
        }
      }
    }

    if (!existingUser) {
      // Create new user
      userEmail = `${phoneNumber}@${DUMMY_EMAIL_DOMAIN}`;
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        phone: phoneNumber,
        email: userEmail,
        phone_confirm: true,
        email_confirm: true,
      });
      if (createUserError) {
        if (createUserError.message.includes('duplicate key value violates unique constraint')) {
             return new Response(JSON.stringify({ error: 'Un conflit est survenu. Veuillez réessayer.' }), { status: 409, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
          }
        console.error('Error creating user:', createUserError);
        throw new Error('Impossible de créer un nouvel utilisateur.');
      }
      userId = newUser.user.id;
      userEmail = newUser.user.email; // Ensure userEmail is set from the newly created user
    } else {
      userId = existingUser.id;
      userEmail = existingUser.email;
      if (!userEmail) {
          userEmail = `${phoneNumber}@${DUMMY_EMAIL_DOMAIN}`;
          const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(userId, { email: userEmail });
          if (updateUserError) {
              console.error('Error updating user with dummy email:', updateUserError);
              throw new Error('Impossible de mettre à jour le profil utilisateur.');
          }
      }
    }

    // 3. Generate session tokens via magic link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
      options: {
        redirectTo: `${APP_BASE_URL}/`
      }
    });

    if (linkError) {
      console.error('Error generating magic link:', linkError);
      throw new Error('Impossible de générer la session de connexion.');
    }

    if (!linkData?.properties?.action_link) {
      console.error('Error: generateLink did not return an action_link.', linkData);
      throw new Error('Impossible de générer le lien de connexion. Réponse de l\'API invalide.');
    }

    const url = new URL(linkData.properties.action_link);
    const params = new URLSearchParams(url.hash.substring(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      console.error('Failed to extract tokens from magic link.', { action_link: linkData.properties.action_link });
      throw new Error('Impossible d\'extraire les tokens de session. Vérifiez que l\'URL de base de votre application (APP_BASE_URL) est bien ajoutée à la liste des URLs de redirection autorisées dans les paramètres d\'authentification de votre projet Supabase.');
    }

    // 4. Return tokens
    return new Response(JSON.stringify({
      message: 'Connexion réussie.',
      access_token: accessToken,
      refresh_token: refreshToken
    }), {
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