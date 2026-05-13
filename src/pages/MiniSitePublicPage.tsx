import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getMiniSiteBySlug, MiniSite } from "@/lib/mini-site-api";
import MiniSitePublicTemplate from "@/components/MiniSitePublicTemplate";

const MiniSitePublicPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [site, setSite] = useState<MiniSite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSite = async () => {
      if (!slug) {
        setError("Mini-site introuvable.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const loadedSite = await getMiniSiteBySlug(slug);
        if (!loadedSite) {
          setError("Ce mini-site n'existe pas ou n'est pas publié.");
          return;
        }
        setSite(loadedSite);
      } catch (err: any) {
        setError(err.message || "Erreur lors du chargement du mini-site.");
      } finally {
        setLoading(false);
      }
    };

    loadSite();
  }, [slug]);

  useEffect(() => {
    if (!site) {
      return;
    }

    const previousTitle = document.title;
    const nextTitle = site.seo_title || site.site_name;
    document.title = nextTitle;

    const description = site.seo_description || site.hero_subtitle || site.slogan || "Mini-site client publié";
    let metaDescription = document.querySelector('meta[name="description"]');

    if (!metaDescription) {
      metaDescription = document.createElement("meta");
      metaDescription.setAttribute("name", "description");
      document.head.appendChild(metaDescription);
    }

    metaDescription.setAttribute("content", description);

    return () => {
      document.title = previousTitle;
    };
  }, [site]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Chargement du mini-site...</div>;
  }

  if (error || !site) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-xl space-y-4">
          <Alert variant="destructive">
            <AlertTitle>Mini-site indisponible</AlertTitle>
            <AlertDescription>{error || "Le mini-site demandé n'est pas accessible."}</AlertDescription>
          </Alert>
          <Button asChild variant="outline">
            <a href="/login">Retour à l&apos;espace client</a>
          </Button>
        </div>
      </div>
    );
  }

  return <MiniSitePublicTemplate site={site} />;
};

export default MiniSitePublicPage;
