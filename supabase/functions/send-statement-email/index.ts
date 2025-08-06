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
    const { invoiceId } = await req.json()
    if (!invoiceId) {
      throw new Error("invoiceId is required");
    }

    // Use the SERVICE_ROLE_KEY for admin-level access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch invoice details and profile
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('*, profiles(first_name)')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) throw invoiceError;
    if (!invoice) throw new Error("Invoice not found");

    // 2. Fetch user email using admin client
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(invoice.user_id);
    if (userError) throw userError;
    
    if (!user || !user.email) {
      console.warn(`No email found for user ${invoice.user_id}. Skipping email.`);
      return new Response(JSON.stringify({ message: "No email found for user, but process completed." }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
      })
    }

    const userEmail = user.email;
    const userName = invoice.profiles?.first_name || 'Client';
    const period = invoice.period;

    // 3. Send email using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error("Le secret RESEND_API_KEY n'est pas configuré dans les variables d'environnement.");
    }

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
            from: 'Hello Keys <noreply@notifications.hellokeys.fr>', // Mis à jour avec le domaine fourni
            to: [userEmail],
            subject: `Votre relevé Hello Keys pour ${period} est disponible`,
            html: `<h1>Bonjour ${userName},</h1><p>Votre nouveau relevé pour la période de <strong>${period}</strong> est disponible sur votre espace client.</p><p>Connectez-vous pour le consulter : <a href="${Deno.env.get('SUPABASE_URL')?.replace('.co', '.app')}/finances">Accéder à mon espace</a></p>`,
        }),
    });

    if (!res.ok) {
        const errorBody = await res.json();
        console.error("Échec de l'envoi de l'e-mail:", errorBody);
        throw new Error(`Échec de l'envoi de l'e-mail: ${JSON.stringify(errorBody)}`);
    }

    // 4. Create a notification for the user
    await supabaseAdmin.from('notifications').insert({
      user_id: invoice.user_id,
      message: `Votre relevé pour la période "${period}" vous a été envoyé par email.`,
      link: '/finances'
    })

    return new Response(JSON.stringify({ message: "Email sent successfully" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})