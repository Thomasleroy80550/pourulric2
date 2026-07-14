import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CheckCheck,
  ChevronDown,
  ExternalLink,
  Heart,
  Loader2,
  Maximize2,
  Megaphone,
  Pin,
  Terminal,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import {
  Announcement,
  getAnnouncements,
  markAllAnnouncementsAsRead,
  toggleAnnouncementLike,
} from "@/lib/announcements-api";
import { ANNOUNCEMENT_LEVELS } from "@/lib/announcement-levels";

const getPreview = (html: string) => {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  const text = (div.textContent || div.innerText || "").trim();
  return text.length > 220 ? text.slice(0, 220) + "…" : text;
};

const AnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleLike = async (id: string) => {
    // Mise à jour optimiste
    setAnnouncements((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              is_liked: !a.is_liked,
              like_count: (a.like_count || 0) + (a.is_liked ? -1 : 1),
            }
          : a,
      ),
    );
    try {
      const result = await toggleAnnouncementLike(id);
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, is_liked: result.is_liked, like_count: result.like_count } : a,
        ),
      );
    } catch (err: any) {
      toast.error(err.message);
      fetchAnnouncements();
    }
  };

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
        <div className="w-full py-6 text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
          <p>Chargement des annonces…</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="w-full">
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
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {announcements.map((a) => {
              const level = ANNOUNCEMENT_LEVELS[a.level] ?? ANNOUNCEMENT_LEVELS.info;
              const Icon = level.icon;
              const expanded = expandedIds.has(a.id);
              return (
                <article
                  key={a.id}
                  className={cn(
                    "flex flex-col rounded-2xl border bg-card p-5 shadow-sm transition hover:shadow-md sm:p-6",
                    !a.is_read && "ring-2 ring-orange-500/30",
                    a.is_pinned && "border-orange-300 dark:border-orange-900/50",
                  )}
                >
                  {/* Zone cliquable pour déplier */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(a.id)}
                    className="group flex w-full items-start gap-3 text-left"
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        level.badgeClass,
                      )}
                    >
                      <Icon className={cn("h-5 w-5", level.iconClass)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
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
                      <h2 className="text-lg font-semibold text-foreground sm:text-xl">{a.title}</h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {format(new Date(a.created_at), "d MMMM yyyy", { locale: fr })} ·{" "}
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        "mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                        expanded && "rotate-180",
                      )}
                    />
                  </button>

                  {/* Contenu : aperçu ou complet */}
                  {expanded ? (
                    <div
                      className="prose prose-sm mt-4 max-w-none dark:prose-invert prose-a:text-orange-600 sm:prose-base"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(a.content || "") }}
                    />
                  ) : (
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                      {getPreview(a.content || "")}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
                    <Button variant="ghost" size="sm" onClick={() => toggleExpand(a.id)}>
                      <ChevronDown className={cn("mr-1.5 h-4 w-4 transition-transform", expanded && "rotate-180")} />
                      {expanded ? "Replier" : "Déplier"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleLike(a.id)}
                      className={cn(a.is_liked && "text-red-600 hover:text-red-600")}
                    >
                      <Heart className={cn("mr-1.5 h-4 w-4", a.is_liked && "fill-current")} />
                      {a.like_count || 0}
                    </Button>
                    {a.link_url && (
                      a.link_url.startsWith("http") ? (
                        <Button asChild size="sm" className="ml-auto bg-orange-600 hover:bg-orange-700">
                          <a href={a.link_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-1.5 h-4 w-4" />
                            Découvrir
                          </a>
                        </Button>
                      ) : (
                        <Button asChild size="sm" className="ml-auto bg-orange-600 hover:bg-orange-700">
                          <Link to={a.link_url}>
                            <ExternalLink className="mr-1.5 h-4 w-4" />
                            Découvrir
                          </Link>
                        </Button>
                      )
                    )}
                    <Button asChild variant="outline" size="sm" className={cn(!a.link_url && "ml-auto")}>
                      <Link to={`/announcements/${a.id}`}>
                        <Maximize2 className="mr-1.5 h-4 w-4" />
                        Pleine page
                      </Link>
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AnnouncementsPage;
