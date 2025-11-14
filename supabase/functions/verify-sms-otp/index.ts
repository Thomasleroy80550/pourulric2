import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') ?? '').trim();
const SUPABASE_SERVICE_ROLE_KEY = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim();
const TWILIO_ACCOUNT_SID = (Deno.env.get('TWILIO_ACCOUNT_SID') ?? '').trim();
const TWILIO_AUTH_TOKEN = (Deno.env.get('TWILIO_AUTH_TOKEN') ?? '').trim();
const TWILIO_VERIFY_SERVICE_SID = (Deno.env.get('TWILIO_VERIFY_SERVICE_SID') ?? '').trim();

const APP_BASE_URL_RAW =
  Deno.env.get('APP_BASE_URL') ||
  Deno.env.get('APP_BASE_URL\n') ||
  Deno.env.get('APP_BASE_URL\n\n') ||
  Deno.env.get('APP_BASE_URL\r\n');
const APP_BASE_URL = APP_BASE_URL_RAW ? APP_BASE_URL_RAW.trim() : undefined;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DUMMY_EMAIL_DOMAIN = 'phone.hellokeys.app';

function normalizeFR(raw: string): string {
  let p = raw.trim().replace(/[\s\-\(\)]/g, '');
  if (p.startsWith('00')) p = `+${p.slice(2)}`;
  if (p.startsWith('33') && !p.startsWith('+')) p = `+${p}`;
  if (!p.startsWith('+') && p.length === 10 && p.startsWith('0')) p = `+33${p.slice(1)}`;
  if (p.startsWith('+0')) p = `+33${p.slice(2)}`;
  if (p.startsWith('+33') && p.length > 3 && p[3] === '0') p = `+33${p.slice(4)}`;
  return p;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

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
    const { phoneNumber, otp, mode } = await req.json();
    if (!phoneNumber || !otp) {
      return new Response(JSON.stringify({ error: 'Missing parameters: phoneNumber and otp are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const normalizedPhone = normalizeFR(phoneNumber);
    const flowMode = (mode === 'login' || mode === 'profile') ? mode : 'profile';

    // Twilio Verify v2 - vérifier le code
    const checkUrl = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`;
    const bodyParams = new URLSearchParams({ To: normalizedPhone, Code: otp });
    const twilioAuthHeader = 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const checkResp = await fetch(checkUrl, {
      method: 'POST',
      headers: { 'Authorization': twilioAuthHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
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

    if (flowMode === 'login') {
      // 1) Chercher le profil lié au numéro
      const { data: matchedProfile, error: profileMatchError } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('phone_number', normalizedPhone)
        .limit(1)
        .single();

      if (profileMatchError || !matchedProfile) {
        return new Response(JSON.stringify({ error: 'Aucun compte n’est associé à ce numéro. Veuillez contacter le support.' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // 2) Récupérer l’utilisateur auth
      const { data: userById, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(matchedProfile.id);
      if (getUserError || !userById?.user) {
        console.error('Profil trouvé mais utilisateur Auth introuvable:', getUserError, matchedProfile.id);
        throw new Error('Utilisateur introuvable pour ce numéro. Veuillez contacter le support.');
      }

      const existingUser = userById.user;
      const userId = existingUser.id;
      const userEmail = existingUser.email || matchedProfile.email || `${normalizedPhone}@${DUMMY_EMAIL_DOMAIN}`;

      // 3) Mise à jour (phone / email) si nécessaire
      const needsPhoneUpdate = existingUser.phone !== normalizedPhone;
      const needsEmailUpdate = !existingUser.email && !!userEmail;
      if (needsPhoneUpdate || needsEmailUpdate) {
        const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          phone: normalizedPhone,
          email: userEmail,
        });
        if (updateAuthError) {
          console.error('Erreur mise à jour utilisateur Auth (phone/email):', updateAuthError);
          throw new Error('Impossible de mettre à jour le compte utilisateur.');
        }
      }

      // 4) Générer le magic link et extraire les tokens
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: userEmail,
        options: APP_BASE_URL ? { redirectTo: APP_BASE_URL } : undefined
      });

      if (linkError || !linkData?.properties?.action_link) {
        console.error('Error generating magic link:', linkError);
        throw new Error("Impossible de générer le lien de connexion.");
      }

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
          throw new Error("Impossible d'extraire les tokens de session. Vérifiez que APP_BASE_URL est ajouté aux URLs de redirection autorisées dans Supabase.");
        }
      }

      if (!accessToken || !refreshToken) {
        throw new Error("Impossible d'obtenir les tokens de session.");
      }

      return new Response(JSON.stringify({
        message: 'Connexion réussie.',
        access_token: accessToken,
        refresh_token: refreshToken
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Mode 'profile': mise à jour du téléphone vérifié pour l’utilisateur courant
    const anonKey = req.headers.get('apikey');
    const authHeader = req.headers.get('Authorization');
    if (!anonKey || !authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }
    const supabaseAuthClient = createClient(SUPABASE_URL, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: getUserErr } = await supabaseAuthClient.auth.getUser();
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