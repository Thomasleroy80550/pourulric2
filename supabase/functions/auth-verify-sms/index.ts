import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
// Try multiple keys for APP_BASE_URL in case it was saved with newline characters
const APP_BASE_URL_RAW =
  Deno.env.get('APP_BASE_URL') ||
  Deno.env.get('APP_BASE_URL\n') ||
  Deno.env.get('APP_BASE_URL\n\n') ||
  Deno.env.get('APP_BASE_URL\r\n');

const APP_BASE_URL = APP_BASE_URL_RAW ? APP_BASE_URL_RAW.trim() : undefined;

console.log('--- auth-verify-sms function starting ---');
console.log(`SUPABASE_URL: ${SUPABASE_URL ? 'Loaded' : 'MISSING'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? 'Loaded' : 'MISSING'}`);
console.log(`APP_BASE_URL: ${APP_BASE_URL ? 'Loaded' : 'Not set, proceeding without redirect'}`);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  const missing = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
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

    // Tenter d'abord de faire correspondre le numéro au bon compte via la table profiles
    const { data: matchedProfile, error: profileMatchError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('phone_number', phoneNumber)
      .limit(1)
      .single();

    let existingUser;

    if (!profileMatchError && matchedProfile) {
      // On a trouvé un profil avec ce numéro: récupérer l'utilisateur Auth par son id
      const { data: userById, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(matchedProfile.id);
      if (getUserError || !userById?.user) {
        console.error('Profil trouvé mais utilisateur Auth introuvable:', getUserError, matchedProfile.id);
        throw new Error('Utilisateur introuvable pour ce numéro. Veuillez contacter le support.');
      }
      existingUser = userById.user;

      userId = existingUser.id;
      userEmail = existingUser.email || matchedProfile.email || `${phoneNumber}@${DUMMY_EMAIL_DOMAIN}`;

      // S'assurer que le téléphone et l'email sont bien renseignés sur l’utilisateur Auth
      const needsPhoneUpdate = existingUser.phone !== phoneNumber;
      const needsEmailUpdate = !existingUser.email;

      if (needsPhoneUpdate || needsEmailUpdate) {
        const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          phone: phoneNumber,
          email: userEmail,
        });
        if (updateAuthError) {
          console.error('Erreur mise à jour utilisateur Auth (phone/email):', updateAuthError);
          throw new Error('Impossible de mettre à jour le compte utilisateur.');
        }
      }
    } else {
      // Fallback précédent: rechercher côté Auth par téléphone ou email "dummy", puis créer si nécessaire
      const { data: { users }, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers({
        perPage: 1000,
      });

      if (listUsersError) {
        console.error('Error listing users:', listUsersError);
        throw new Error('Erreur lors de la recherche de l\'utilisateur.');
      }

      existingUser = users.find(u => u.phone === phoneNumber);

      // Si non trouvé par téléphone, essayer par l'email "dummy" construit avec le numéro
      if (!existingUser) {
        const dummyEmail = `${phoneNumber}@${DUMMY_EMAIL_DOMAIN}`;
        existingUser = users.find(u => u.email === dummyEmail);
        if (existingUser && !existingUser.phone) {
          const { error: updatePhoneError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { phone: phoneNumber });
          if (updatePhoneError) {
            console.error('Error updating user phone:', updatePhoneError);
            throw new Error('Impossible de mettre à jour le numéro de téléphone de l\'utilisateur existant.');
          }
        }
      }

      if (!existingUser) {
        // Créer un nouvel utilisateur (cas rare si aucun profil n'était lié à ce numéro)
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
        userEmail = newUser.user.email;
      } else {
        userId = existingUser.id;
        userEmail = existingUser.email || `${phoneNumber}@${DUMMY_EMAIL_DOMAIN}`;
        if (!existingUser.email) {
          const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(userId, { email: userEmail });
          if (updateUserError) {
            console.error('Error updating user with dummy email:', updateUserError);
            throw new Error('Impossible de mettre à jour le profil utilisateur.');
          }
        }
      }
    }

    // 3. Générer un magic link et l'appeler côté serveur pour récupérer les tokens
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
      options: APP_BASE_URL ? { redirectTo: APP_BASE_URL } : undefined
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('Error generating magic link:', linkError);
      throw new Error("Impossible de générer le lien de connexion.");
    }

    // Appeler le lien de vérification sans suivre la redirection pour lire l'en-tête Location
    const verifyResp = await fetch(linkData.properties.action_link, { redirect: 'manual' });
    let accessToken: string | undefined;
    let refreshToken: string | undefined;

    const locationHeader = verifyResp.headers.get('location') || '';

    if (locationHeader) {
      const fragment = locationHeader.split('#')[1] || '';
      const params = new URLSearchParams(fragment);
      accessToken = params.get('access_token') || undefined;
      refreshToken = params.get('refresh_token') || undefined;
    } else {
      const html = await verifyResp.text();
      const hashMatch = html.match(/#access_token=([^&]+)&refresh_token=([^&"']+)/);
      if (hashMatch && hashMatch.length >= 3) {
        accessToken = decodeURIComponent(hashMatch[1]);
        refreshToken = decodeURIComponent(hashMatch[2]);
      } else {
        console.error('Failed to extract tokens from magic link.', { action_link: linkData.properties.action_link });
        throw new Error("Impossible d'extraire les tokens de session. Vérifiez que l'URL de base de votre application (APP_BASE_URL) est bien ajoutée à la liste des URLs de redirection autorisées dans les paramètres d'authentification de votre projet Supabase.");
      }
    }

    if (!accessToken || !refreshToken) {
      console.error('Failed to obtain tokens after parsing response.');
      throw new Error("Impossible d'obtenir les tokens de session.");
    }

    // 4. Retourner les tokens
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