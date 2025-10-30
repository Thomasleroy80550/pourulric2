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
  // Palette Hello Keys (approx): brandColor = sky-500
  const brandColor = "#0EA5E9";
  const textColor = "#111827"; // gray-900
  const mutedText = "#6B7280"; // gray-500
  const bgColor = "#F4F4F5"; // gray-100/200
  const containerBg = "#FFFFFF";

  const fontStack =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  // Email HTML avec styles inline et structure table 600px
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${escapeText(subject)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <style>
    /* Styles basiques (compat email) */
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; }
      .content { padding: 16px !important; }
    }
    a { color: ${brandColor}; text-decoration: underline; }
    img { max-width: 100%; border: 0; line-height: 100%; }
  </style>
</head>
<body style="margin:0; padding:0; background:${bgColor};">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:${bgColor};">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" class="container" border="0" cellpadding="0" cellspacing="0" width="600" style="width:600px; max-width:600px; background:${containerBg}; border-radius:12px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.06); font-family:${fontStack};">
          <!-- Header -->
          <tr>
            <td style="background:${brandColor}; padding: 20px 24px; color:#ffffff;">
              <div style="font-size:18px; font-weight:600;">Hello Keys</div>
              <div style="font-size:13px; opacity:0.9;">${escapeText(subject)}</div>
            </td>
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
              <table role="presentation" width="100%" style="border:1px solid #E5E7EB; border-radius:8px;">
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
            <td style="padding: 20px 24px; color:${mutedText}; font-size:12px; background:#F9FAFB;">
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