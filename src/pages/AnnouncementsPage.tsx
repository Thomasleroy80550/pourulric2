import React, { useEffect, useState } from "react";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCheck, Loader2, Megaphone, Pin, Terminal } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import DOMPurify from "dompurify";
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
      <div className="container mx-auto max-w-3xl py-6">
        {/* ── En-tête ─────────────────────────────── */}
        <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 p-6 text-white shadow-lg sm:p-8">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-10 -left-6 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-white/90">
                <Megaphone className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-widest">Hello Keys</span>
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Annonces</h1>
              <p className="mt-1 max-w-xl text-sm text-white/85">
                Les dernières actualités et informations importantes de l'équipe.
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="shrink-0 bg-white/15 text-white hover:bg-white/25"
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {announcements.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-16 text-center">
            <Megaphone className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">Aucune annonce pour le moment.</p>
          </div>
        ) : (
          <div className="relative space-y-5 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border sm:before:left-[19px]">
            {announcements.map((a) => {
              const level = ANNOUNCEMENT_LEVELS[a.level] ?? ANNOUNCEMENT_LEVELS.info;
              const Icon = level.icon;
              return (
                <div key={a.id} className="relative pl-10 sm:pl-12">
                  {/* Point sur la timeline */}
                  <div
                    className={cn(
                      "absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-card shadow-sm sm:h-10 sm:w-10",
                      level.cardClass,
                    )}
                  >
                    <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", level.iconClass)} />
                  </div>

                  <article
                    className={cn(
                      "rounded-2xl border bg-card p-5 shadow-sm transition hover:shadow-md",
                      !a.is_read && "ring-2 ring-orange-500/30",
                      a.is_pinned && "border-orange-300 dark:border-orange-900/50",
                    )}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge className={level.badgeClass} variant="secondary">
                        {level.label}
                      </Badge>
                      {a.is_pinned && (
                        <Badge variant="outline" className="gap-1 border-orange-300 text-orange-700 dark:text-orange-300">
                          <Pin className="h-3 w-3" /> Épinglée
                        </Badge>
                      )}
                      {!a.is_read && (
                        <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" variant="secondary">
                          Nouveau
                        </Badge>
                      )}
                    </div>

                    <h2 className="text-xl font-semibold text-foreground">{a.title}</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {format(new Date(a.created_at), "d MMMM yyyy", { locale: fr })} ·{" "}
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: fr })}
                    </p>

                    <div
                      className="prose prose-sm dark:prose-invert mt-3 max-w-none prose-a:text-orange-600"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(a.content || "") }}
                    />
                  </article>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AnnouncementsPage;
