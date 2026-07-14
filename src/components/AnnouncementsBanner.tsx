import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Announcement, getAnnouncements, markAnnouncementAsRead } from "@/lib/announcements-api";
import { ANNOUNCEMENT_LEVELS } from "@/lib/announcement-levels";

/**
 * Affiche l'annonce non lue la plus prioritaire (épinglée puis la plus récente)
 * en haut du tableau de bord. Se masque une fois lue/fermée.
 */
const AnnouncementsBanner: React.FC = () => {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getAnnouncements();
        const firstUnread = data.find((a) => !a.is_read);
        if (firstUnread) setAnnouncement(firstUnread);
      } catch (err) {
        console.error("Failed to fetch announcements for banner:", err);
      }
    })();
  }, []);

  if (!announcement || dismissed) return null;

  const level = ANNOUNCEMENT_LEVELS[announcement.level] ?? ANNOUNCEMENT_LEVELS.info;
  const Icon = level.icon;

  const plainText = (() => {
    const div = document.createElement("div");
    div.innerHTML = announcement.content || "";
    const text = (div.textContent || div.innerText || "").trim();
    return text.length > 160 ? text.slice(0, 160) + "…" : text;
  })();

  const handleDismiss = async () => {
    setDismissed(true);
    try {
      await markAnnouncementAsRead(announcement.id);
    } catch (err) {
      console.error("Failed to mark announcement as read:", err);
    }
  };

  return (
    <div
      className={cn(
        "relative mb-6 flex items-start gap-4 overflow-hidden rounded-2xl border-l-4 bg-card p-4 shadow-sm sm:p-5",
        level.cardClass,
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          level.badgeClass,
        )}
      >
        <Icon className={cn("h-5 w-5", level.iconClass)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge className={level.badgeClass} variant="secondary">
            {level.label}
          </Badge>
          <span className="text-xs font-medium text-orange-600">Nouveau</span>
        </div>
        <p className="mt-1.5 font-semibold text-foreground">{announcement.title}</p>
        {plainText && (
          <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{plainText}</p>
        )}
        <Button asChild variant="link" size="sm" className="mt-1 h-auto p-0 text-orange-600">
          <Link to="/announcements">
            Voir toutes les annonces
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground"
        onClick={handleDismiss}
        title="Marquer comme lu"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default AnnouncementsBanner;
