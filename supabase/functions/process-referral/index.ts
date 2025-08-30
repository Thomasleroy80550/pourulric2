import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const REFERRAL_CREDIT_AMOUNT = 1; // Credits awarded per referral

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { referral_code } = await req.json();
    if (!referral_code) {
      throw new Error('Le code de parrainage est manquant.');
    }

    // Get the newly signed-up user from the request's auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('En-tête d\'autorisation manquant.');
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: referredUser } } = await supabaseAdmin.auth.getUser(token);
    if (!referredUser) {
      throw new Error('Utilisateur référé non trouvé.');
    }

    // 1. Find the referrer by their code
    const { data: referrerProfile, error: referrerError } = await supabaseAdmin
      .from('profiles')
      .select('id, referral_credits')
      .eq('referral_code', referral_code)
      .single();

    if (referrerError || !referrerProfile) {
      throw new Error('Code de parrainage invalide ou parrain non trouvé.');
    }

    // 2. Check if the user is trying to refer themselves
    if (referrerProfile.id === referredUser.id) {
      throw new Error('Vous ne pouvez pas vous parrainer vous-même.');
    }

    // 3. Check if this user has already been referred
    const { data: existingReferral, error: existingReferralError } = await supabaseAdmin
      .from('referrals')
      .select('id')
      .eq('referred_id', referredUser.id)
      .single();

    if (existingReferral) {
      // This user was already referred, so we don't process it again.
      // Return a success response to not show an error to the user.
      return new Response(JSON.stringify({ message: 'Parrainage déjà enregistré.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 4. Create the referral link
    const { error: referralInsertError } = await supabaseAdmin
      .from('referrals')
      .insert({
        referrer_id: referrerProfile.id,
        referred_id: referredUser.id,
      });

    if (referralInsertError) {
      throw new Error(`Erreur lors de la création du lien de parrainage : ${referralInsertError.message}`);
    }

    // 5. Update the referrer's credit balance
    const newCredits = (referrerProfile.referral_credits || 0) + REFERRAL_CREDIT_AMOUNT;
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ referral_credits: newCredits })
      .eq('id', referrerProfile.id);

    if (profileUpdateError) {
      throw new Error(`Erreur lors de la mise à jour des crédits : ${profileUpdateError.message}`);
    }

    // 6. Log the credit transaction
    const { error: transactionError } = await supabaseAdmin
      .from('credit_transactions')
      .insert({
        user_id: referrerProfile.id,
        amount: REFERRAL_CREDIT_AMOUNT,
        description: `Parrainage du nouvel utilisateur ${referredUser.email}`,
      });
    
    if (transactionError) {
        // This is not critical enough to fail the whole process, just log it
        console.error('Failed to log credit transaction:', transactionError.message);
    }

    return new Response(JSON.stringify({ success: true, message: 'Parrainage traité avec succès !' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});