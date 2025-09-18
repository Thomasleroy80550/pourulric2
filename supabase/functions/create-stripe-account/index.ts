import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Début de la création du compte Stripe');
    
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('La clé secrète Stripe (STRIPE_SECRET_KEY) n\'est pas configurée.');
    }

    const { email, country } = await req.json();
    if (!email || !country) {
      return new Response(JSON.stringify({ error: 'L\'email et le pays sont requis.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const params = new URLSearchParams();
    params.append('type', 'express');
    params.append('email', email);
    params.append('country', country);

    const response = await fetch('https://api.stripe.com/v1/accounts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const accountData = await response.json();

    if (!response.ok) {
      console.error('Erreur API Stripe (Création de compte):', data.error);
      return new Response(JSON.stringify({ 
        error: accountData.error?.message || 'Erreur lors de la création du compte Stripe',
        details: accountData.error 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Compte Stripe créé avec succès:', accountData.id);

    // Étape 2: Créer un lien d'onboarding pour le compte
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:5173';
    
    const accountLinkParams = new URLSearchParams();
    accountLinkParams.append('account', accountData.id);
    accountLinkParams.append('refresh_url', `${appBaseUrl}/admin/users`);
    accountLinkParams.append('return_url', `${appBaseUrl}/profile`);
    accountLinkParams.append('type', 'account_onboarding');

    const accountLinkResponse = await fetch('https://api.stripe.com/v1/account_links', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: accountLinkParams.toString(),
    });

    const accountLinkData = await accountLinkResponse.json();

    if (!accountLinkResponse.ok) {
        console.error('Erreur API Stripe (Account Link):', accountLinkData.error);
        return new Response(JSON.stringify({ 
            error: accountLinkData.error?.message || 'Erreur lors de la création du lien d\'onboarding Stripe',
            details: accountLinkData.error 
        }), {
            status: accountLinkResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    
    console.log('Lien d\'onboarding créé avec succès.');

    return new Response(JSON.stringify({ account: accountData, accountLink: accountLinkData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Erreur complète dans la fonction Edge:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erreur interne du serveur',
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})