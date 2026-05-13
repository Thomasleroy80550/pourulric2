import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Eye } from "lucide-react";
import { MiniSite, buildMiniSitePublicUrl } from "@/lib/mini-site-api";
import MiniSitePublicTemplate from "@/components/MiniSitePublicTemplate";

interface MiniSitePreviewCardProps {
  site: MiniSite;
}

const MiniSitePreviewCard = ({ site }: MiniSitePreviewCardProps) => {
  const publicUrl = buildMiniSitePublicUrl(site.slug);

  return (
    <Card className="overflow-hidden border-orange-100 shadow-sm">
      <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Eye className="h-5 w-5" />
              Aperçu du mini-site
            </CardTitle>
            <CardDescription>Rendu standardisé du template public avec vos contenus actuels.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={site.status === "published" ? "default" : "secondary"}>
              {site.status === "published" ? "Publié" : "Brouillon"}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <a href={publicUrl} target="_blank" rel="noreferrer noopener">
                <ExternalLink className="mr-2 h-4 w-4" />
                Ouvrir
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <MiniSitePublicTemplate site={site} preview />
      </CardContent>
    </Card>
  );
};

export default MiniSitePreviewCard;
