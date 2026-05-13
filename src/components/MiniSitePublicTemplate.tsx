import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, Sparkles, Globe, Image as ImageIcon } from "lucide-react";
import { MiniSite, buildMiniSitePublicUrl } from "@/lib/mini-site-api";

interface MiniSitePublicTemplateProps {
  site: MiniSite;
  preview?: boolean;
}

function sanitizeColor(color?: string | null) {
  if (!color) {
    return "#f97316";
  }

  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : "#f97316";
}

function normalizeLink(url?: string | null) {
  if (!url) {
    return null;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function buildContactActions(site: MiniSite) {
  return [
    site.contact_phone
      ? {
          label: site.contact_phone,
          href: `tel:${site.contact_phone}`,
          icon: Phone,
        }
      : null,
    site.contact_email
      ? {
          label: site.contact_email,
          href: `mailto:${site.contact_email}`,
          icon: Mail,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; href: string; icon: typeof Phone }>;
}

const MiniSitePublicTemplate = ({ site, preview = false }: MiniSitePublicTemplateProps) => {
  const primaryColor = sanitizeColor(site.primary_color);
  const ctaUrl = normalizeLink(site.cta_url);
  const publicUrl = buildMiniSitePublicUrl(site.slug);
  const contactActions = buildContactActions(site);
  const highlights = site.highlights?.length ? site.highlights : ["Offre claire", "Présentation rassurante", "Contact immédiat"];

  return (
    <div
      className="min-h-full bg-slate-950 text-white"
      style={{
        backgroundImage: `radial-gradient(circle at top right, ${primaryColor}33, transparent 35%), linear-gradient(180deg, #020617 0%, #111827 100%)`,
      }}
    >
      <section className={`mx-auto w-full ${preview ? "max-w-4xl p-6" : "max-w-6xl px-6 py-12 md:px-10 md:py-16"}`}>
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10">
                {site.status === "published" ? "Mini-site publié" : "Prévisualisation"}
              </Badge>
              <Badge variant="secondary" className="bg-white/10 text-white/80">
                Template premium unique
              </Badge>
            </div>

            {site.logo_url ? (
              <img
                src={site.logo_url}
                alt={site.site_name}
                className="h-16 w-auto rounded-md border border-white/10 bg-white/95 p-2"
              />
            ) : null}

            <div className="space-y-3">
              <h1 className={`${preview ? "text-3xl" : "text-4xl md:text-5xl"} font-semibold tracking-tight`}>
                {site.hero_title || site.site_name}
              </h1>
              <p className="text-lg text-white/70">{site.hero_subtitle || site.slogan || "Une page vitrine claire, élégante et prête à être partagée."}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              {ctaUrl && site.cta_label ? (
                <Button asChild size={preview ? "sm" : "lg"} className="text-white" style={{ backgroundColor: primaryColor }}>
                  <a href={ctaUrl} target="_blank" rel="noreferrer noopener">
                    {site.cta_label}
                  </a>
                </Button>
              ) : null}

              {contactActions[0] ? (
                <Button asChild size={preview ? "sm" : "lg"} variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
                  <a href={contactActions[0].href}>{contactActions[0].label}</a>
                </Button>
              ) : null}
            </div>
          </div>

          <Card className="overflow-hidden border-white/10 bg-white/5 text-white shadow-2xl backdrop-blur">
            {site.hero_image_url ? (
              <img src={site.hero_image_url} alt={site.site_name} className={`w-full object-cover ${preview ? "h-56" : "h-80"}`} />
            ) : (
              <div className={`flex items-center justify-center bg-white/10 ${preview ? "h-56" : "h-80"}`}>
                <div className="text-center text-white/60">
                  <ImageIcon className="mx-auto mb-3 h-10 w-10" />
                  <p>Ajoutez une image hero pour renforcer votre vitrine.</p>
                </div>
              </div>
            )}
            <CardContent className="space-y-3 p-6">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Globe className="h-4 w-4" />
                <span>{site.custom_domain || publicUrl}</span>
              </div>
              <p className="text-sm text-white/70">
                {site.slogan || "Un mini-site standardisé, rassurant et facile à maintenir."}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className={`mx-auto grid w-full gap-6 ${preview ? "max-w-4xl px-6 pb-6" : "max-w-6xl px-6 pb-12 md:px-10 md:pb-16"} lg:grid-cols-[1.1fr_0.9fr]`}>
        <Card className="border-white/10 bg-white/5 text-white backdrop-blur">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-white/60">
              <Sparkles className="h-4 w-4" />
              Présentation
            </div>
            <h2 className="mb-3 text-2xl font-semibold">À propos</h2>
            <p className="whitespace-pre-line text-white/75">
              {site.about_text || "Décrivez ici votre activité, votre promesse client et les informations qui inspirent confiance."}
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white backdrop-blur">
          <CardContent className="p-6">
            <div className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-white/60">Points forts</div>
            <ul className="space-y-3">
              {highlights.map((highlight, index) => (
                <li key={`${highlight}-${index}`} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="mt-0.5 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                  <span className="text-white/80">{highlight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className={`mx-auto w-full ${preview ? "max-w-4xl px-6 pb-6" : "max-w-6xl px-6 pb-12 md:px-10 md:pb-16"}`}>
        <Card className="border-white/10 bg-white/5 text-white backdrop-blur">
          <CardContent className="p-6">
            <div className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-white/60">Galerie</div>
            {site.gallery_images?.length ? (
              <div className="grid gap-4 md:grid-cols-3">
                {site.gallery_images.map((image, index) => (
                  <div key={`${image}-${index}`} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    <img src={image} alt={`${site.site_name} ${index + 1}`} className="h-48 w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center text-white/60">
                Ajoutez jusqu&apos;à 3 images pour illustrer votre activité.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className={`mx-auto w-full ${preview ? "max-w-4xl px-6 pb-6" : "max-w-6xl px-6 pb-12 md:px-10 md:pb-16"}`}>
        <Card className="border-white/10 bg-white/5 text-white backdrop-blur">
          <CardContent className="grid gap-6 p-6 md:grid-cols-[0.95fr_1.05fr] md:items-center">
            <div>
              <div className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-white/60">Contact & CTA</div>
              <h2 className="mb-3 text-2xl font-semibold">Parlons de votre projet</h2>
              <p className="text-white/75">
                Le visiteur doit comprendre immédiatement comment vous joindre et quelle action effectuer ensuite.
              </p>
            </div>

            <div className="space-y-3">
              {contactActions.length > 0 ? (
                contactActions.map((action) => (
                  <a
                    key={action.href}
                    href={action.href}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white/85 transition hover:bg-white/10"
                  >
                    <action.icon className="h-4 w-4" />
                    <span>{action.label}</span>
                  </a>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-3 text-white/60">
                  Ajoutez un email ou un téléphone pour rendre le mini-site actionnable.
                </div>
              )}

              {ctaUrl && site.cta_label ? (
                <Button asChild className="w-full text-white" style={{ backgroundColor: primaryColor }}>
                  <a href={ctaUrl} target="_blank" rel="noreferrer noopener">
                    {site.cta_label}
                  </a>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t border-white/10 px-6 py-6 text-center text-sm text-white/50">
        {site.site_name} • {site.custom_domain || publicUrl}
      </footer>
    </div>
  );
};

export default MiniSitePublicTemplate;
