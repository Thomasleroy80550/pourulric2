import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { Resend } from "npm:resend";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Auth check for calling user (must be admin)
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: authError } = await userSupabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized: User not authenticated.");
    }
    const { data: profile, error: profileError } = await userSupabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileError || profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required." }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 2. Get new user data from request body
    const { email, password, first_name, last_name, role, estimation_details, estimated_revenue, referral_code } = await req.json();
    if (!email || !password || !first_name || !last_name || !role) {
      throw new Error("Missing required fields: email, password, first_name, last_name, role.");
    }

    // 3. Create Supabase admin client
    const adminSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 4. Create the new user
    const { data: createData, error: createError } = await adminSupabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Automatically confirm user's email
      user_metadata: {
        first_name,
        last_name,
        role,
        estimation_details,
        estimated_revenue,
      },
    });

    if (createError) {
      throw createError;
    }

    // Handle referral if a code was provided
    if (referral_code && createData.user) {
      // Find the referrer
      const { data: referrerProfile, error: referrerError } = await adminSupabaseClient
        .from('profiles')
        .select('id, referral_credits')
        .eq('referral_code', referral_code.toUpperCase())
        .single();

      if (referrerError) {
        console.warn(`Referral code "${referral_code}" not found or invalid.`, referrerError.message);
      } else if (referrerProfile) {
        const referrerId = referrerProfile.id;
        const newUserId = createData.user.id;
        const creditsToAward = 10;

        // 1. Create a record in the referrals table
        await adminSupabaseClient.from('referrals').insert({
          referrer_id: referrerId,
          referred_id: newUserId,
        });

        // 2. Update the referrer's credit balance
        const newCreditBalance = (referrerProfile.referral_credits || 0) + creditsToAward;
        await adminSupabaseClient
          .from('profiles')
          .update({ referral_credits: newCreditBalance })
          .eq('id', referrerId);

        // 3. Log the credit transaction
        await adminSupabaseClient.from('credit_transactions').insert({
          user_id: referrerId,
          amount: creditsToAward,
          description: `Parrainage de ${first_name} ${last_name}`,
        });
      }
    }

    // 5. Send welcome email with temporary password via Resend
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY is not set. Skipping welcome email.");
    } else {
      const resend = new Resend(RESEND_API_KEY);
      const loginUrl = Deno.env.get('APP_BASE_URL') ? `${Deno.env.get('APP_BASE_URL')}/login` : 'http://beta.proprietaire.hellokeys.fr/';
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <img src="https://dkjaejzwmmwwzhokpbgs.supabase.co/storage/v1/object/public/public-assets/logo.png" alt="Hello Keys Logo" style="width: 150px; margin-bottom: 20px;">
            <h2 style="color: #1a202c;">Bienvenue chez Hello Keys, ${first_name} !</h2>
            <p>Votre compte a été créé par un administrateur.</p>
            <p>Vous pouvez maintenant vous connecter à votre espace personnel en utilisant les identifiants suivants :</p>
            <div style="background-color: #f7fafc; padding: 15px; border-radius: 5px; border: 1px solid #e2e8f0; margin: 20px 0;">
              <p style="margin: 0;"><strong>Email :</strong> ${email}</p>
              <p style="margin: 10px 0 0 0;"><strong>Mot de passe temporaire :</strong> <code style="background-color: #e2e8f0; padding: 3px 6px; border-radius: 3px;">${password}</code></p>
            </div>
            <p>Pour des raisons de sécurité, nous vous recommandons vivement de <strong>changer ce mot de passe</strong> dès votre première connexion depuis la page "Mon Profil".</p>
            <a href="${loginUrl}" style="background-color: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; margin-top: 10px;">Se connecter à mon espace</a>
            <p style="margin-top: 30px; font-size: 0.9em; color: #718096;">À bientôt,<br>L'équipe Hello Keys</p>
          </div>
        </div>
      `;

      await resend.emails.send({
        from: 'Hello Keys <noreply@notifications.hellokeys.fr>',
        to: [email],
        subject: 'Bienvenue ! Vos accès à votre espace Hello Keys',
        html: emailHtml,
      });
    }

    return new Response(JSON.stringify({ data: createData, message: "User created successfully." }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in create-user-proxy function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});