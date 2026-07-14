import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, ExternalLink, Loader2, Pin, Terminal } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import {
  Announcement,
  getAnnouncements,
  markAnnouncementAsRead,
} from "@/lib/announcements-api";
import { ANNOUNCEMENT_LEVELS } from "@/lib/announcement-levels";

const AnnouncementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const data = await getAnnouncements();
        const found = data.find((a) => a.id === id) ?? null;
        if (!found) {
          setError("Annonce introuvable ou non disponible.");
        } else {
          setAnnouncement(found);
          if (!found.is_read) {
            markAnnouncementAsRead(found.id).catch((err) =>
              console.error("Failed to mark announcement as read:", err),
            );
          }
        }
      } catch (err: any) {
        setError("Impossible de charger l'annonce. Veuillez réessayer plus tard.");
        console.error("Failed to fetch announcement:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncement();
  }, [id]);

  if (loading) {
    return (
      <MainLayout>
        <div className="w-full py-6 text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
          <p>Chargement de l'annonce…</p>
        </div>
      </MainLayout>
    );
  }

  if (error || !announcement) {
    return (
      <MainLayout>
        <div className="mx-auto w-full max-w-3xl py-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/announcements")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux annonces
          </Button>
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error ?? "Annonce introuvable."}</AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  const level = ANNOUNCEMENT_LEVELS[announcement.level] ?? ANNOUNCEMENT_LEVELS.info;
  const Icon = level.icon;

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-4xl py-2">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/announcements">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux annonces
          </Link>
        </Button>

        <article className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          {/* Bandeau coloré */}
          <div className={cn("flex items-center gap-3 border-b p-6", level.cardClass)}>
            <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", level.badgeClass)}>
              <Icon className={cn("h-6 w-6", level.iconClass)} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={level.badgeClass} variant="secondary">
                {level.label}
              </Badge>
              {announcement.is_pinned && (
                <Badge variant="outline" className="gap-1 border-orange-300 text-orange-700 dark:text-orange-300">
                  <Pin className="h-3 w-3" /> Épinglée
                </Badge>
              )}
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{announcement.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Publié le {format(new Date(announcement.created_at), "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
            </p>

            <div
              className="prose prose-sm mt-6 max-w-none dark:prose-invert prose-a:text-orange-600 sm:prose-base"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(announcement.content || "") }}
            />

            {announcement.link_url && (
              <div className="mt-8 border-t pt-6">
                {announcement.link_url.startsWith("http") ? (
                  <Button asChild size="lg" className="bg-orange-600 hover:bg-orange-700">
                    <a href={announcement.link_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-5 w-5" />
                      Découvrir la page
                    </a>
                  </Button>
                ) : (
                  <Button asChild size="lg" className="bg-orange-600 hover:bg-orange-700">
                    <Link to={announcement.link_url}>
                      <ExternalLink className="mr-2 h-5 w-5" />
                      Découvrir la page
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </article>
      </div>
    </MainLayout>
  );
};

export default AnnouncementDetailPage;
