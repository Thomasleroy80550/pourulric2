import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Début de la création du lien d\'onboarding Stripe');
    
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    console.log('Clé Stripe récupérée:', stripeSecretKey ? 'Présente' : 'Manquante');
    
    if (!stripeSecretKey) {
      throw new Error('La clé secrète Stripe (STRIPE_SECRET_KEY) n\'est pas configurée.');
    }

    const { account_id, refresh_url, return_url } = await req.json();
    console.log('Données reçues:', { account_id, refresh_url, return_url });

    if (!account_id) {
      return new Response(JSON.stringify({ error: 'L\'ID du compte est requis.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const params = new URLSearchParams();
    params.append('account', account_id);
    params.append('refresh_url', refresh_url || 'https://hellokeys.fr/admin/users');
    params.append('return_url', return_url || 'https://hellokeys.fr/admin/users');
    params.append('type', 'account_onboarding');

    console.log('Paramètres envoyés à Stripe:', params.toString());

    const response = await fetch('https://api.stripe.com/v1/account_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();
    console.log('Réponse Stripe:', { status: response.status, data });

    if (!response.ok) {
      console.error('Erreur API Stripe détaillée:', {
        status: response.status,
        statusText: response.statusText,
        error: data.error,
        error_type: data.error?.type,
        error_code: data.error?.code,
        error_message: data.error?.message
      });
      
      return new Response(JSON.stringify({ 
        error: data.error?.message || 'Erreur lors de la création du lien d\'onboarding',
        details: data.error 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Lien d\'onboarding créé avec succès:', data.url);
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Erreur complète lors de la création du lien d\'onboarding:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erreur interne du serveur',
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})