"use client";

import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Calendar,
  Book,
  Banknote,
  BarChart2,
  LayoutGrid,
  Wrench,
  Sparkles,
  MessageSquare,
  Bell,
  Building,
  Star,
  Copy,
  Zap,
  LayoutDashboard,
  FileCheck2,
  Megaphone,
  HelpCircle,
  Store,
  Plug,
  Gift,
  Shield,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  disabled?: boolean;
  badge?: number;
  badgeColor?: string;
};

interface DesktopTopNavProps {
  isPaymentSuspended: boolean;
  isAdmin: boolean;
  unreadCount: number;
  announcementUnread: number;
}

const DesktopTopNav: React.FC<DesktopTopNavProps> = ({
  isPaymentSuspended,
  isAdmin,
  unreadCount,
  announcementUnread,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryTabs: NavItem[] = [
    { name: "Accueil", href: "/", icon: Home },
    { name: "Calendrier", href: "/calendar", icon: Calendar, disabled: isPaymentSuspended },
    { name: "Réservations", href: "/bookings", icon: Book, disabled: isPaymentSuspended },
    { name: "Finances", href: "/finances", icon: Banknote, disabled: isPaymentSuspended },
    { name: "Performances", href: "/performance", icon: BarChart2 },
  ];

  const moreGroups: { title: string; items: NavItem[] }[] = [
    {
      title: "Activité",
      items: [
        { name: "Incidents", href: "/reports", icon: Wrench },
        { name: "Ménage", href: "/housekeeping", icon: Sparkles, disabled: isPaymentSuspended },
        { name: "Mes tickets", href: "/tickets", icon: MessageSquare },
        { name: "Notifications", href: "/notifications", icon: Bell, badge: unreadCount, badgeColor: "bg-blue-600" },
        { name: "Mes logements", href: "/my-rooms", icon: Building, disabled: isPaymentSuspended },
      ],
    },
    {
      title: "Analyse",
      items: [
        { name: "Compta LMNP", href: "/lmnp", icon: Banknote, disabled: isPaymentSuspended },
        { name: "Taxe de Séjour", href: "/tourist-tax", icon: Banknote },
        { name: "Mes Avis", href: "/reviews", icon: Star },
        { name: "Analyse Concurrentielle", href: "/comp-set", icon: Copy },
        { name: "PowerSense", href: "/powersense", icon: Zap },
        { name: "Thermo Sync", href: "/thermo-sync", icon: LayoutDashboard },
      ],
    },
    {
      title: "Ressources",
      items: [
        { name: "N° d'enregistrement", href: "/numero-enregistrement", icon: FileCheck2 },
        { name: "Annonces", href: "/announcements", icon: Megaphone, badge: announcementUnread, badgeColor: "bg-orange-600" },
        { name: "Aides", href: "/help", icon: HelpCircle },
        { name: "Marketplace", href: "/marketplace", icon: Store },
        { name: "Modules", href: "/modules", icon: Plug },
        { name: "Nouveautés", href: "/new-version", icon: Gift },
      ],
    },
  ];

  const isActive = (href: string) =>
    href === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(href);

  const moreBadgeTotal = unreadCount + announcementUnread;
  const isMoreActive = moreGroups.some((g) => g.items.some((i) => isActive(i.href)));

  return (
    <nav className="flex items-center gap-1">
      {primaryTabs.map((tab) => {
        const active = isActive(tab.href);
        const Icon = tab.icon;
        return (
          <button
            key={tab.href}
            onClick={tab.disabled ? undefined : () => navigate(tab.href)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              tab.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={active ? 2.4 : 2} />
            <span className="hidden lg:inline">{tab.name}</span>
          </button>
        );
      })}

      <Popover open={moreOpen} onOpenChange={setMoreOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isMoreActive || moreOpen
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden lg:inline">Plus</span>
            {moreBadgeTotal > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {moreBadgeTotal}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[640px] p-4">
          <div className="grid grid-cols-3 gap-4">
            {moreGroups.map((group) => (
              <div key={group.title}>
                <h4 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.title}
                </h4>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <li key={item.href}>
                        <button
                          onClick={
                            item.disabled
                              ? undefined
                              : () => {
                                  setMoreOpen(false);
                                  navigate(item.href);
                                }
                          }
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                            active
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-foreground/80 hover:bg-muted",
                            item.disabled && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate text-left">{item.name}</span>
                          {item.badge != null && item.badge > 0 && (
                            <span
                              className={cn(
                                "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white",
                                item.badgeColor ?? "bg-blue-600"
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          {isAdmin && (
            <div className="mt-3 border-t pt-3">
              <button
                onClick={() => {
                  setMoreOpen(false);
                  navigate("/admin");
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                <Shield className="h-4 w-4 text-muted-foreground" />
                Administration
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </nav>
  );
};

export default DesktopTopNav;
