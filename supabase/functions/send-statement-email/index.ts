import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { encode as encodeBase64 } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024; // 12MB max pour la pièce jointe

function escapeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Thème email Hello Keys (identique au thème newsletter)
function buildEmailHtml(subject: string, bodyHtml: string): string {
  const brandPrimary = "#255F85";
  const brandPrimaryText = "#FFFFFF";
  const brandLightBg = "#E1F2FF";
  const brandAccentBorder = "#CDE8FF";
  const textColor = "#111827";
  const mutedText = "#6B7280";
  const pageBg = "#F3F4F6";
  const containerBg = "#FFFFFF";
  const fontStack =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const logoUrl = "https://beta.proprietaire.hellokeys.fr/logo.png";

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${escapeText(subject)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <style>
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; }
      .content { padding: 16px !important; }
      .header-inner { padding: 16px !important; }
      .logo { width: 110px !important; height: auto !important; }
    }
    a { color: ${brandPrimary}; text-decoration: underline; }
    img { max-width: 100%; border: 0; line-height: 100%; }
    a[data-btn] {
      display: inline-block;
      background: ${brandPrimary};
      color: ${brandPrimaryText} !important;
      text-decoration: none !important;
      padding: 10px 16px;
      border-radius: 8px;
      font-weight: 600;
    }
  </style>
</head>
<body style="margin:0; padding:0; background:${pageBg};">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:${pageBg};">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" class="container" border="0" cellpadding="0" cellspacing="0" width="600" style="width:600px; max-width:600px; background:${containerBg}; border-radius:12px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.06); font-family:${fontStack};">
          <!-- Header -->
          <tr>
            <td style="background:${brandLightBg}; color:${brandPrimary};">
              <div class="header-inner" style="padding: 20px 24px;">
                <table role="presentation" width="100%">
                  <tr>
                    <td style="vertical-align: middle;">
                      <img class="logo" src="${logoUrl}" alt="Hello Keys" width="128" style="display:block; border:0; outline:none; text-decoration:none;">
                    </td>
                    <td align="right" style="vertical-align: middle;">
                      <div style="font-size:14px; opacity:0.9; font-weight:600; text-align:right;">${escapeText(subject)}</div>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Bande accent -->
          <tr>
            <td style="background:${brandLightBg}; height: 6px; line-height: 6px; font-size: 0;">&nbsp;</td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="content" style="padding: 24px; color:${textColor}; font-size:15px; line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Callout -->
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <table role="presentation" width="100%" style="border:1px solid ${brandAccentBorder}; border-radius:8px; background:#FAFCFF;">
                <tr>
                  <td style="padding:16px; color:${mutedText}; font-size:13px;">
                    Cet email vous est envoyé par Hello Keys. Si vous ne souhaitez plus recevoir ces communications,
                    vous pouvez mettre à jour vos préférences dans votre espace client.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 24px; color:${mutedText}; font-size:12px; background:${brandLightBg};">
              © ${new Date().getFullYear()} Hello Keys · Tous droits réservés
              <br />
              <span style="color:${mutedText};">Ce message peut contenir des informations confidentielles.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
      body: `Bonjour {{userName}},\n\nVotre nouveau relevé pour la période de {{period}} est disponible en pièce jointe de cet email, ainsi que sur votre espace client.\n\nVous pouvez également le télécharger ici : {{pdfLink}}\n\nConnectez-vous pour consulter tous vos relevés : {{appUrl}}/finances\n\nCordialement,\nL'équipe Hello Keys`,
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
        <h2 style="font-size: 16px; color: #255F85; margin-bottom: 12px;">📊 Votre récap du mois — ${escapeText(period)}</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; border: 1px solid #CDE8FF; border-radius: 8px;">
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
    let contentHtml = body.replace(/\n/g, '<br>');

    // Insérer le récap : via la variable {{recap}} si présente dans le template, sinon l'ajouter après le corps
    if (contentHtml.includes('{{recap}}')) {
      contentHtml = contentHtml.replace(/{{recap}}/g, recapHtml);
    } else {
      contentHtml = `${contentHtml}${recapHtml}`;
    }

    // Bouton de téléchargement du PDF
    contentHtml += `
      <div style="text-align: center; margin: 8px 0 16px 0;">
        <a data-btn href="${pdfDownloadUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; background:#255F85; color:#FFFFFF !important; text-decoration:none !important; padding:10px 16px; border-radius:8px; font-weight:600;">📄 Télécharger mon relevé PDF</a>
      </div>`;

    // Appliquer le thème Hello Keys
    const htmlBody = buildEmailHtml(replaceVars(effectiveTemplate.subject), contentHtml);

    // 4. Télécharger le PDF pour le joindre à l'email
    console.log("[send-statement-email] Téléchargement du PDF pour pièce jointe", { pdfPath });
    let attachments: { filename: string; content: string }[] = [];
    try {
      const { data: pdfBlob, error: downloadError } = await supabaseAdmin.storage
        .from('statements')
        .download(pdfPath);

      if (downloadError || !pdfBlob) {
        console.warn("[send-statement-email] Impossible de télécharger le PDF, envoi sans pièce jointe", { error: downloadError?.message });
      } else {
        const arrayBuffer = await pdfBlob.arrayBuffer();
        if (arrayBuffer.byteLength > MAX_ATTACHMENT_BYTES) {
          console.warn("[send-statement-email] PDF trop volumineux pour être joint", { size: arrayBuffer.byteLength });
        } else {
          const safePeriod = period.replace(/[^a-zA-Z0-9àâäéèêëîïôöùûüç\s-]/g, '').replace(/\s+/g, '-');
          attachments = [{
            filename: `Releve-HelloKeys-${safePeriod}.pdf`,
            content: encodeBase64(new Uint8Array(arrayBuffer)),
          }];
        }
      }
    } catch (e) {
      console.warn("[send-statement-email] Erreur lors de la préparation de la pièce jointe", { error: (e as any)?.message });
    }

    // 5. Envoyer l'e-mail avec la pièce jointe
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
            ...(attachments.length > 0 ? { attachments } : {}),
        }),
    });

    if (!res.ok) {
        const errorBody = await res.json();
        throw new Error(`Échec de l'envoi de l'e-mail: ${JSON.stringify(errorBody)}`);
    }

    // 6. Créer une notification pour l'utilisateur (si activée via event template ou par défaut)
    // En mode test, on ne notifie pas le client
    const shouldNotify = testEmail ? false : (statementEvent ? (statementEvent.sendNotification ?? true) : true);
    if (shouldNotify) {
      await supabaseAdmin.from('notifications').insert({
        user_id: invoice.user_id,
        message: `Votre relevé pour la période "${period}" vous a été envoyé par email.`,
        link: '/finances'
      })
    }

    return new Response(JSON.stringify({ message: "E-mail envoyé avec succès avec le PDF en pièce jointe", subject, attached: attachments.length > 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("[send-statement-email] Erreur", error)
    return new Response(JSON.stringify({ error: (error as any).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
