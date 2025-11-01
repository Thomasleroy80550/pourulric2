import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
// import { encode } from "https://deno.land/std@0.190.0/encoding/base64.ts"; // Supprimé car le PDF n'est plus attaché

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
      .select('*, profiles:profiles!invoices_user_id_fkey(first_name, last_name)')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) throw invoiceError;
    if (!invoice) throw new Error("Facture non trouvée");

    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(invoice.user_id);
    if (userError) throw userError;
    if (!user || !user.email) {
      throw new Error(`E-mail de l'utilisateur non trouvé pour user_id: ${invoice.user_id}`);
    }

    // Charger en priorité le système de templates d'événements
    const { data: notifTemplatesSetting } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'notification_templates')
      .single();

    // Fallback vers l'ancien template
    const { data: templateSetting } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'statement_email_template')
      .single();

    // 2. Générer un lien signé pour le PDF
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('statements')
      .createSignedUrl(pdfPath, 3600);

    if (signedUrlError) throw signedUrlError;
    if (!signedUrlData || !signedUrlData.signedUrl) throw new Error("Impossible de générer l'URL signée pour le PDF");

    const pdfDownloadUrl = signedUrlData.signedUrl;

    // 3. Préparer le contenu de l'e-mail
    const defaultTemplate = {
      subject: 'Votre relevé Hello Keys pour {{period}} est disponible',
      body: `Bonjour {{userName}},\n\nVotre nouveau relevé pour la période de {{period}} est disponible en cliquant sur le lien ci-dessous et sur votre espace client.\n\nCliquez ici pour télécharger votre relevé : {{pdfLink}}\n\nConnectez-vous pour consulter tous vos relevés : {{appUrl}}/finances\n\nCordialement,\nL'équipe Hello Keys`,
    };

    // Chercher un event template "statement_email" si présent et activé
    const eventTemplates = notifTemplatesSetting?.value?.events ?? [];
    const statementEvent = Array.isArray(eventTemplates)
      ? eventTemplates.find((e: any) => e?.key === 'statement_email' && (e?.sendEmail ?? true))
      : null;

    const effectiveTemplate = statementEvent
      ? { subject: statementEvent.subject ?? defaultTemplate.subject, body: statementEvent.body ?? defaultTemplate.body }
      : (templateSetting?.value || defaultTemplate);

    // Utilisation de la variable d'environnement APP_BASE_URL
    const appUrl = Deno.env.get('APP_BASE_URL') ?? 'https://beta.proprietaire.hellokeys.fr';
    const userName = invoice.profiles?.first_name || 'Client';
    const period = invoice.period;

    // Remplacement basique des variables
    const replaceVars = (tpl: string) =>
      tpl
        .replace(/{{userName}}/g, userName)
        .replace(/{{period}}/g, period)
        .replace(/{{appUrl}}/g, appUrl)
        .replace(/{{pdfLink}}/g, pdfDownloadUrl);

    const subject = replaceVars(effectiveTemplate.subject);
    const body = replaceVars(effectiveTemplate.body);
    const htmlBody = body.replace(/\n/g, '<br>');

    // 4. Envoyer l'e-mail SANS pièce jointe
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) throw new Error("RESEND_API_KEY n'est pas configuré.");

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
        }),
    });

    if (!res.ok) {
        const errorBody = await res.json();
        throw new Error(`Échec de l'envoi de l'e-mail: ${JSON.stringify(errorBody)}`);
    }

    // 5. Créer une notification pour l'utilisateur (si activée via event template ou par défaut)
    const shouldNotify = statementEvent ? (statementEvent.sendNotification ?? true) : true;
    if (shouldNotify) {
      await supabaseAdmin.from('notifications').insert({
        user_id: invoice.user_id,
        message: `Votre relevé pour la période "${period}" vous a été envoyé par email.`,
        link: '/finances'
      })
    }

    return new Response(JSON.stringify({ message: "E-mail envoyé avec succès avec le lien PDF", subject, body }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: (error as any).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})