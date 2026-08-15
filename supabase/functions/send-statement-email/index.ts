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
    const { invoiceId, pdfPath, testEmail } = await req.json()
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

    // Construction du récap mensuel à partir des totaux du relevé
    const totals = invoice.totals || {};
    const invoiceData: any[] = Array.isArray(invoice.invoice_data) ? invoice.invoice_data : [];
    const totalCA = invoiceData.reduce((sum, r) => sum + (Number(r?.ca) || 0), 0);
    const reservationCount = invoiceData.length;

    const formatEuro = (value: unknown) =>
      new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(value) || 0);

    const recapRow = (label: string, value: string, bold = false) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #374151; ${bold ? 'font-weight: bold;' : ''}">${label}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #111827; ${bold ? 'font-weight: bold;' : ''}">${value}</td>
      </tr>`;

    const recapHtml = `
      <div style="margin: 24px 0;">
        <h2 style="font-size: 16px; color: #111827; margin-bottom: 12px;">📊 Votre récap du mois — ${period}</h2>
        <table style="width: 100%; max-width: 480px; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px; border: 1px solid #e5e7eb; border-radius: 8px;">
          ${recapRow('Réservations', String(reservationCount))}
          ${recapRow('Nuits réservées', String(Number(totals.totalNuits) || 0))}
          ${recapRow('Voyageurs accueillis', String(Number(totals.totalVoyageurs) || 0))}
          ${recapRow("Chiffre d'affaires", formatEuro(totalCA))}
          ${recapRow('Revenus générés', formatEuro(totals.totalRevenuGenere))}
          ${recapRow('Frais de ménage', formatEuro(totals.totalFraisMenage))}
          ${recapRow('Taxe de séjour', formatEuro(totals.totalTaxeDeSejour))}
          ${recapRow('Commission Hello Keys', formatEuro(totals.totalCommission))}
          ${recapRow('Montant versé', formatEuro(totals.totalMontantVerse), true)}
        </table>
      </div>`;

    // Remplacement basique des variables
    const replaceVars = (tpl: string) =>
      tpl
        .replace(/{{userName}}/g, userName)
        .replace(/{{period}}/g, period)
        .replace(/{{appUrl}}/g, appUrl)
        .replace(/{{pdfLink}}/g, pdfDownloadUrl);

    const subject = testEmail
      ? `[TEST] ${replaceVars(effectiveTemplate.subject)}`
      : replaceVars(effectiveTemplate.subject);
    const body = replaceVars(effectiveTemplate.body);
    let htmlBody = body.replace(/\n/g, '<br>');

    // Insérer le récap : via la variable {{recap}} si présente dans le template, sinon l'ajouter après le corps
    if (htmlBody.includes('{{recap}}')) {
      htmlBody = htmlBody.replace(/{{recap}}/g, recapHtml);
    } else {
      htmlBody = `${htmlBody}${recapHtml}`;
    }

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
            to: [testEmail || user.email],
            subject: subject,
            html: htmlBody,
        }),
    });

    if (!res.ok) {
        const errorBody = await res.json();
        throw new Error(`Échec de l'envoi de l'e-mail: ${JSON.stringify(errorBody)}`);
    }

    // 5. Créer une notification pour l'utilisateur (si activée via event template ou par défaut)
    // En mode test, on ne notifie pas le client
    const shouldNotify = testEmail ? false : (statementEvent ? (statementEvent.sendNotification ?? true) : true);
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