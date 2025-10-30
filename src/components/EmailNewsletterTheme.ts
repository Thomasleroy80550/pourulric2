"use client";

export type NewsletterTheme = "default";

type BuildNewsletterHtmlParams = {
  subject: string;
  bodyHtml: string; // HTML déjà nettoyé
  theme?: NewsletterTheme;
};

export function buildNewsletterHtml({
  subject,
  bodyHtml,
  theme = "default",
}: BuildNewsletterHtmlParams): string {
  // Palette Hello Keys (cohérente avec globals.css)
  const brandPrimary = "#255F85";        // --sidebar-foreground (bleu marque)
  const brandPrimaryText = "#FFFFFF";
  const brandLightBg = "#E1F2FF";         // --sidebar-background (bleu très clair)
  const brandAccentBorder = "#CDE8FF";    // proche --sidebar-border
  const textColor = "#111827";            // gray-900
  const mutedText = "#6B7280";            // gray-500
  const pageBg = "#F3F4F6";               // gray-100/200
  const containerBg = "#FFFFFF";

  const fontStack =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  // Construire une URL absolue pour le logo (fallback production)
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://hellokeys.fr";
  const logoUrl = `${origin}/logo.png`;

  // Email HTML avec styles inline et structure table 600px (responsive)
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${escapeText(subject)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <style>
    /* Compat email — styles minimaux */
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; }
      .content { padding: 16px !important; }
      .header-inner { padding: 16px !important; }
      .logo { width: 110px !important; height: auto !important; }
    }
    a { color: ${brandPrimary}; text-decoration: underline; }
    img { max-width: 100%; border: 0; line-height: 100%; }
    /* Style de bouton simple si vous insérez <a data-btn> dans le contenu */
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
            <td style="background:${brandPrimary}; color:${brandPrimaryText};">
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

function escapeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}