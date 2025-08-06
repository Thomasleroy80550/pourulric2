import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { invoiceId, pdfPath } = await req.json()
    if (!invoiceId || !pdfPath) {
      throw new Error("invoiceId et pdfPath sont requis");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Récupérer les détails de la facture, le profil et le modèle d'e-mail
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('*, profiles(first_name, last_name)')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) throw invoiceError;
    if (!invoice) throw new Error("Facture non trouvée");

    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(invoice.user_id);
    if (userError) throw userError;
    if (!user || !user.email) {
      throw new Error(`E-mail de l'utilisateur non trouvé pour user_id: ${invoice.user_id}`);
    }

    const { data: templateSetting } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'statement_email_template')
      .single();

    // 2. Télécharger le PDF depuis le stockage
    const { data: pdfBlob, error: storageError } = await supabaseAdmin.storage
      .from('statements')
      .download(pdfPath);

    if (storageError) throw storageError;
    if (!pdfBlob) throw new Error("PDF non trouvé dans le stockage");

    const arrayBuffer = await pdfBlob.arrayBuffer();
    const pdfBase64 = encode(arrayBuffer);

    // 3. Préparer le contenu de l'e-mail
    const defaultTemplate = {
      subject: 'Votre relevé Hello Keys pour {{period}} est disponible',
      body: `Bonjour {{userName}},\n\nVotre nouveau relevé pour la période de {{period}} est disponible en pièce jointe et sur votre espace client.\n\nConnectez-vous pour le consulter : {{appUrl}}/finances\n\nCordialement,\nL'équipe Hello Keys`,
    };
    const template = templateSetting?.value || defaultTemplate;
    const appUrl = Deno.env.get('SUPABASE_URL')?.replace('.co', '.app') ?? 'https://app.hellokeys.fr';
    
    const userName = invoice.profiles?.first_name || 'Client';
    const period = invoice.period;

    let subject = template.subject.replace('{{userName}}', userName).replace('{{period}}', period);
    let body = template.body.replace(/{{userName}}/g, userName).replace(/{{period}}/g, period).replace(/{{appUrl}}/g, appUrl);
    
    const htmlBody = body.replace(/\n/g, '<br>');

    // 4. Envoyer l'e-mail avec la pièce jointe
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) throw new Error("RESEND_API_KEY n'est pas configuré.");

    const clientName = invoice.profiles ? `${invoice.profiles.first_name}_${invoice.profiles.last_name}` : 'Client';
    const pdfFileName = `Releve_${clientName}_${invoice.period.replace(/\s/g, '_')}.pdf`;

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
            from: 'Hello Keys <noreply@notifications.hellokeys.fr>',
            to: [user.email],
            subject: subject,
            html: htmlBody,
            attachments: [
              {
                filename: pdfFileName,
                content: pdfBase64,
              },
            ],
        }),
    });

    if (!res.ok) {
        const errorBody = await res.json();
        throw new Error(`Échec de l'envoi de l'e-mail: ${JSON.stringify(errorBody)}`);
    }

    // 5. Créer une notification pour l'utilisateur
    await supabaseAdmin.from('notifications').insert({
      user_id: invoice.user_id,
      message: `Votre relevé pour la période "${period}" vous a été envoyé par email.`,
      link: '/finances'
    })

    return new Response(JSON.stringify({ message: "E-mail envoyé avec succès avec la pièce jointe PDF" }), {
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