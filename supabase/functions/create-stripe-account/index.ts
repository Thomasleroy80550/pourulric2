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
    console.log('Début de la création du compte Stripe');
    
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    console.log('Clé Stripe récupérée:', stripeSecretKey ? 'Présente' : 'Manquante');
    
    if (!stripeSecretKey) {
      throw new Error('La clé secrète Stripe (STRIPE_SECRET_KEY) n\'est pas configurée.');
    }

    const { email, country } = await req.json();
    console.log('Données reçues:', { email, country });

    if (!email || !country) {
      return new Response(JSON.stringify({ error: 'L\'email et le pays sont requis.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Format d\'email invalide.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const params = new URLSearchParams();
    params.append('type', 'express');
    params.append('email', email);
    params.append('country', country);
    params.append('controller[fees][payer]', 'application');
    params.append('controller[losses][payments]', 'application');
    params.append('controller[stripe_dashboard][type]', 'express');

    console.log('Paramètres envoyés à Stripe:', params.toString());

    const response = await fetch('https://api.stripe.com/v1/accounts', {
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
        error: data.error?.message || 'Erreur lors de la création du compte Stripe',
        details: data.error 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Compte Stripe créé avec succès:', data.id);
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Erreur complète lors de la création du compte Stripe:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erreur interne du serveur',
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})