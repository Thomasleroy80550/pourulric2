import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import MainLayout from "@/components/MainLayout";
import { useSession } from "@/components/SessionContextProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, LayoutTemplate, Sparkles } from "lucide-react";
import MiniSiteEditor from "@/components/MiniSiteEditor";
import MiniSitePreviewCard from "@/components/MiniSitePreviewCard";
import DomainRequestForm from "@/components/DomainRequestForm";
import DomainRequestStatusCard from "@/components/DomainRequestStatusCard";
import {
  MiniSite,
  MiniSiteInput,
  buildMiniSitePublicUrl,
  createMyMiniSite,
  getMyMiniSite,
  publishMyMiniSite,
  slugifyMiniSiteValue,
  updateMyMiniSite,
  uploadMiniSiteAsset,
} from "@/lib/mini-site-api";
import { createDomainRequest, DomainRequest, getMyDomainRequests } from "@/lib/domain-request-api";
import { Button } from "@/components/ui/button";

function buildDefaultMiniSite(profile?: { first_name?: string; last_name?: string } | null): MiniSiteInput {
  const defaultName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() || "Mon mini-site";
  const defaultSlug = slugifyMiniSiteValue(defaultName) || "mon-mini-site";

  return {
    site_name: defaultName,
    slug: defaultSlug,
    status: "draft",
    template_key: "premium-v1",
    primary_color: "#f97316",
    slogan: "",
    logo_url: "",
    hero_image_url: "",
    hero_title: defaultName,
    hero_subtitle: "",
    about_text: "",
    highlights: ["", "", "", ""],
    gallery_images: [],
    contact_email: "",
    contact_phone: "",
    cta_label: "",
    cta_url: "",
    seo_title: "",
    seo_description: "",
    custom_domain: "",
  };
}

function mapSiteToInput(site: MiniSite): MiniSiteInput {
  return {
    site_name: site.site_name,
    slug: site.slug,
    status: site.status,
    template_key: site.template_key,
    primary_color: site.primary_color,
    slogan: site.slogan || "",
    logo_url: site.logo_url || "",
    hero_image_url: site.hero_image_url || "",
    hero_title: site.hero_title || "",
    hero_subtitle: site.hero_subtitle || "",
    about_text: site.about_text || "",
    highlights: [...site.highlights, "", "", "", ""].slice(0, 4),
    gallery_images: site.gallery_images || [],
    contact_email: site.contact_email || "",
    contact_phone: site.contact_phone || "",
    cta_label: site.cta_label || "",
    cta_url: site.cta_url || "",
    seo_title: site.seo_title || "",
    seo_description: site.seo_description || "",
    custom_domain: site.custom_domain || "",
  };
}

const MiniSitePage = () => {
  const { profile } = useSession();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmittingDomain, setIsSubmittingDomain] = useState(false);
  const [site, setSite] = useState<MiniSite | null>(null);
  const [domainRequests, setDomainRequests] = useState<DomainRequest[]>([]);
  const [values, setValues] = useState<MiniSiteInput>(buildDefaultMiniSite(profile));
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const mySite = await getMyMiniSite();

        if (mySite) {
          setSite(mySite);
          setValues(mapSiteToInput(mySite));
          setIsSlugManuallyEdited(true);
          const requests = await getMyDomainRequests(mySite.id);
          setDomainRequests(requests);
        } else {
          setSite(null);
          setValues(buildDefaultMiniSite(profile));
          setDomainRequests([]);
          setIsSlugManuallyEdited(false);
        }
      } catch (error: any) {
        toast.error(error.message || "Erreur lors du chargement du mini-site.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [profile]);

  const publicUrl = useMemo(() => {
    const path = buildMiniSitePublicUrl(values.slug || "mon-mini-site");
    return typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
  }, [values.slug]);

  const previewSite = useMemo<MiniSite>(() => {
    const now = new Date().toISOString();

    return {
      id: site?.id || "preview",
      user_id: site?.user_id || profile?.id || "preview",
      site_name: values.site_name,
      slug: values.slug || "mon-mini-site",
      status: site?.status || "draft",
      template_key: values.template_key || "premium-v1",
      primary_color: values.primary_color,
      slogan: values.slogan || null,
      logo_url: values.logo_url || null,
      hero_image_url: values.hero_image_url || null,
      hero_title: values.hero_title || null,
      hero_subtitle: values.hero_subtitle || null,
      about_text: values.about_text || null,
      highlights: (values.highlights || []).filter(Boolean),
      gallery_images: values.gallery_images || [],
      contact_email: values.contact_email || null,
      contact_phone: values.contact_phone || null,
      cta_label: values.cta_label || null,
      cta_url: values.cta_url || null,
      seo_title: values.seo_title || null,
      seo_description: values.seo_description || null,
      custom_domain: values.custom_domain || null,
      created_at: site?.created_at || now,
      updated_at: site?.updated_at || now,
    };
  }, [profile?.id, site, values]);

  const latestRequest = domainRequests[0] || null;

  const handleChange = <K extends keyof MiniSiteInput>(field: K, value: MiniSiteInput[K]) => {
    setValues((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "site_name" && !isSlugManuallyEdited) {
        next.slug = slugifyMiniSiteValue(String(value)) || "mon-mini-site";
      }

      return next;
    });

    if (field === "slug") {
      setIsSlugManuallyEdited(true);
    }
  };

  const handleHighlightChange = (index: number, value: string) => {
    const nextHighlights = [...(values.highlights || [])];
    nextHighlights[index] = value;
    handleChange("highlights", nextHighlights);
  };

  const handleGalleryRemove = (index: number) => {
    const nextGallery = [...(values.gallery_images || [])];
    nextGallery.splice(index, 1);
    handleChange("gallery_images", nextGallery);
  };

  const persistMiniSite = async (status?: "draft" | "published") => {
    const payload: MiniSiteInput = {
      ...values,
      status: status || site?.status || "draft",
    };

    if (site) {
      return updateMyMiniSite(site.id, payload);
    }

    return createMyMiniSite(payload);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const savedSite = await persistMiniSite();
      setSite(savedSite);
      setValues(mapSiteToInput(savedSite));
      toast.success("Mini-site enregistré avec succès.");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!values.site_name.trim() || !values.slug.trim() || !values.hero_title?.trim() || !values.about_text?.trim()) {
      toast.error("Pour publier, renseignez au minimum le nom, le slug, le titre hero et le texte de présentation.");
      return;
    }

    setIsPublishing(true);
    try {
      let publishedSite: MiniSite;

      if (site) {
        const savedSite = await updateMyMiniSite(site.id, { ...values, status: site.status });
        publishedSite = await publishMyMiniSite(savedSite.id);
      } else {
        publishedSite = await createMyMiniSite({ ...values, status: "published" });
      }

      setSite(publishedSite);
      setValues(mapSiteToInput(publishedSite));
      toast.success("Mini-site publié avec succès.");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la publication.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleAssetUpload = async (file: File, type: "logo" | "hero" | "gallery") => {
    setIsUploading(true);
    try {
      const uploadedUrl = await uploadMiniSiteAsset(file, type);

      if (type === "logo") {
        handleChange("logo_url", uploadedUrl);
      } else if (type === "hero") {
        handleChange("hero_image_url", uploadedUrl);
      } else {
        const nextGallery = [...(values.gallery_images || []), uploadedUrl].slice(0, 3);
        handleChange("gallery_images", nextGallery);
      }

      toast.success("Image téléversée avec succès.");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du téléversement.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleGalleryUpload = async (files: FileList) => {
    const availableSlots = Math.max(0, 3 - (values.gallery_images?.length || 0));
    const selectedFiles = Array.from(files).slice(0, availableSlots);

    for (const file of selectedFiles) {
      await handleAssetUpload(file, "gallery");
    }
  };

  const handleDomainRequestSubmit = async (payload: { requested_domain: string; alternative_domains: string[]; notes: string }) => {
    if (!site || site.status !== "published") {
      toast.error("Publiez d'abord votre mini-site avant de demander un domaine.");
      return;
    }

    setIsSubmittingDomain(true);
    try {
      const request = await createDomainRequest({
        mini_site_id: site.id,
        requested_domain: payload.requested_domain,
        alternative_domains: payload.alternative_domains,
        notes: payload.notes,
      });
      setDomainRequests((prev) => [request, ...prev]);
      toast.success("Votre demande de domaine a bien été envoyée.");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi de la demande.");
    } finally {
      setIsSubmittingDomain(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto space-y-6 py-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Skeleton className="h-[720px] w-full" />
            <Skeleton className="h-[720px] w-full" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto space-y-6 py-6">
        <Card className="border-orange-100 bg-gradient-to-r from-orange-50 via-white to-white shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-3xl">
                  <LayoutTemplate className="h-7 w-7" />
                  Mini-site client
                </CardTitle>
                <CardDescription>
                  Créez votre page vitrine unique à partir d&apos;un template premium, publiez-la puis demandez un domaine personnalisé.
                </CardDescription>
              </div>
              <Badge variant={site?.status === "published" ? "default" : "secondary"}>
                {site?.status === "published" ? "Publié" : "Brouillon"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-4">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <Sparkles className="h-4 w-4" />
                Ce que vous personnalisez
              </div>
              <p className="text-sm text-muted-foreground">Logo, couleurs, textes, images, CTA et coordonnées. Une page unique, claire et vendable rapidement.</p>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <Globe className="h-4 w-4" />
                URL temporaire d&apos;abord
              </div>
              <p className="text-sm text-muted-foreground">La publication se fait d&apos;abord via un slug interne. Le domaine final est traité séparément ensuite.</p>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <div className="mb-2 font-medium">Gestion de domaine manuelle</div>
              <p className="text-sm text-muted-foreground">Notre équipe gère la réservation/configuration sans promettre de disponibilité temps réel dans ce MVP.</p>
            </div>
          </CardContent>
        </Card>

        {!site ? (
          <Alert>
            <AlertTitle>Commencez votre mini-site</AlertTitle>
            <AlertDescription>
              Vous n&apos;avez pas encore de mini-site enregistré. Complétez le formulaire ci-dessous puis enregistrez un brouillon ou publiez directement.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <MiniSiteEditor
            values={values}
            status={site?.status || "draft"}
            publicUrl={publicUrl}
            isSaving={isSaving}
            isPublishing={isPublishing}
            isUploading={isUploading}
            onChange={handleChange}
            onHighlightChange={handleHighlightChange}
            onGalleryRemove={handleGalleryRemove}
            onLogoUpload={(file) => handleAssetUpload(file, "logo")}
            onHeroUpload={(file) => handleAssetUpload(file, "hero")}
            onGalleryUpload={handleGalleryUpload}
            onSave={handleSave}
            onPublish={handlePublish}
            onPreview={() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          />

          <div ref={previewRef} className="space-y-6">
            <MiniSitePreviewCard site={previewSite} />
            {site?.status === "published" ? (
              <Button asChild variant="outline" className="w-full">
                <a href={buildMiniSitePublicUrl(site.slug)} target="_blank" rel="noreferrer noopener">
                  Ouvrir la page publique
                </a>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <DomainRequestForm
            disabled={!site || site.status !== "published"}
            isSubmitting={isSubmittingDomain}
            onSubmit={handleDomainRequestSubmit}
          />

          <div className="space-y-4">
            {site?.status !== "published" ? (
              <Alert>
                <AlertTitle>Publiez d&apos;abord votre mini-site</AlertTitle>
                <AlertDescription>
                  La demande de domaine n&apos;est disponible qu&apos;une fois votre mini-site publié sur son URL temporaire.
                </AlertDescription>
              </Alert>
            ) : latestRequest ? (
              <DomainRequestStatusCard request={latestRequest} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Aucune demande de domaine pour le moment</CardTitle>
                  <CardDescription>Votre mini-site est publié. Vous pouvez maintenant soumettre une demande de domaine personnalisé.</CardDescription>
                </CardHeader>
              </Card>
            )}

            {domainRequests.length > 1 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Historique des demandes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {domainRequests.slice(1).map((request) => (
                    <div key={request.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                      <div>
                        <div className="font-medium">{request.requested_domain}</div>
                        <div className="text-muted-foreground">{new Date(request.created_at).toLocaleDateString("fr-FR")}</div>
                      </div>
                      <Badge variant="secondary">{request.status}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default MiniSitePage;
