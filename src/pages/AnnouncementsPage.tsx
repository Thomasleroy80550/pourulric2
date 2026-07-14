import React, { useEffect, useState } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCheck, Loader2, Pin, Terminal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Announcement,
  getAnnouncements,
  markAllAnnouncementsAsRead,
} from "@/lib/announcements-api";
import { ANNOUNCEMENT_LEVELS } from "@/lib/announcement-levels";

const AnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = announcements.filter((a) => !a.is_read).length;

  const fetchAnnouncements = async () => {
    try {
      const data = await getAnnouncements();
      setAnnouncements(data);
    } catch (err: any) {
      setError("Impossible de charger les annonces. Veuillez réessayer plus tard.");
      console.error("Failed to fetch announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    // Marque tout comme lu à l'ouverture de la page, après un court délai de lecture.
    const timer = setTimeout(async () => {
      try {
        await markAllAnnouncementsAsRead();
        setAnnouncements((prev) => prev.map((a) => ({ ...a, is_read: true })));
      } catch (err) {
        console.error("Failed to mark announcements as read:", err);
      }
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAnnouncementsAsRead();
      setAnnouncements((prev) => prev.map((a) => ({ ...a, is_read: true })));
      toast.success("Toutes les annonces ont été marquées comme lues.");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Chargement des annonces…</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6 max-w-3xl">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Annonces</h1>
            <p className="text-muted-foreground mt-1">
              Retrouvez ici les dernières actualités et informations de l'équipe Hello Keys.
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Tout marquer comme lu
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {announcements.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">
            Aucune annonce pour le moment.
          </p>
        ) : (
          <div className="space-y-4">
            {announcements.map((a) => {
              const level = ANNOUNCEMENT_LEVELS[a.level] ?? ANNOUNCEMENT_LEVELS.info;
              const Icon = level.icon;
              return (
                <Card key={a.id} className={cn("shadow-sm border-l-4", level.cardClass)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("h-5 w-5 shrink-0", level.iconClass)} />
                        <h2 className="text-lg font-semibold">{a.title}</h2>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {a.is_pinned && <Pin className="h-4 w-4 text-orange-600" />}
                        {!a.is_read && (
                          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" title="Non lu" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={level.badgeClass} variant="secondary">
                        {level.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: a.content || "" }}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AnnouncementsPage;
