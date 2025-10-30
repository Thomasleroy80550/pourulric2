"use client";

import React from "react";
import DOMPurify from "dompurify";
import { buildNewsletterHtml, NewsletterTheme } from "./EmailNewsletterTheme";

type EmailThemePreviewProps = {
  subject: string;
  rawHtml: string; // contenu depuis l'éditeur
  theme?: NewsletterTheme;
  className?: string;
};

const EmailThemePreview: React.FC<EmailThemePreviewProps> = ({
  subject,
  rawHtml,
  theme = "default",
  className,
}) => {
  // Nettoie le contenu avant injection dans le template
  const sanitizedBody = React.useMemo(() => DOMPurify.sanitize(rawHtml), [rawHtml]);

  const finalHtml = React.useMemo(
    () => buildNewsletterHtml({ subject: subject || "Newsletter", bodyHtml: sanitizedBody, theme }),
    [subject, sanitizedBody, theme]
  );

  return (
    <div className={className}>
      <div
        className="rounded-lg border bg-white shadow-sm overflow-hidden"
        // On affiche le HTML complet; pour un iso email, un iframe sandbox serait idéal, mais on reste simple ici
        dangerouslySetInnerHTML={{ __html: finalHtml }}
      />
    </div>
  );
};

export default EmailThemePreview;