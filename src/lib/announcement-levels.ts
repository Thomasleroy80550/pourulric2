import { Info, Megaphone, AlertTriangle } from "lucide-react";
import type { AnnouncementLevel } from "@/lib/announcements-api";

export const ANNOUNCEMENT_LEVELS: Record<
  AnnouncementLevel,
  {
    label: string;
    icon: typeof Info;
    badgeClass: string;
    cardClass: string;
    iconClass: string;
  }
> = {
  info: {
    label: "Information",
    icon: Info,
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    cardClass: "border-blue-200 dark:border-blue-900/40",
    iconClass: "text-blue-600 dark:text-blue-400",
  },
  important: {
    label: "Important",
    icon: Megaphone,
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    cardClass: "border-amber-300 dark:border-amber-900/50",
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  urgent: {
    label: "Urgent",
    icon: AlertTriangle,
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    cardClass: "border-red-300 dark:border-red-900/50",
    iconClass: "text-red-600 dark:text-red-400",
  },
};
