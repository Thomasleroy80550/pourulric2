import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Home, CalendarDays, BookMarked, Wallet, LayoutGrid, RefreshCw } from "lucide-react";
import {
  clearReservationsCache,
  clearHousekeepingTasksCache,
} from "@/lib/krossbooking";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/v4", label: "Accueil", icon: Home },
  { to: "/v4/calendrier", label: "Calendrier", icon: CalendarDays },
  { to: "/v4/reservations", label: "Réservations", icon: BookMarked },
  { to: "/v4/finances", label: "Finances", icon: Wallet },
  { to: "/v4/plus", label: "Plus", icon: LayoutGrid },
];

const PULL_THRESHOLD = 70;
const MAX_PULL = 110;

const V4Layout: React.FC<{ children: React.ReactNode; hideNav?: boolean }> = ({
  children,
  hideNav,
}) => {
  const { pathname } = useLocation();
  const queryClient = useQueryClient();

  const scrollRef = useRef<HTMLElement>(null);
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop <= 0 && !refreshing) {
        startYRef.current = e.touches[0].clientY;
        pullingRef.current = false;
      } else {
        startYRef.current = null;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null || refreshing) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy > 0 && el.scrollTop <= 0) {
        pullingRef.current = true;
        if (e.cancelable) e.preventDefault();
        // Résistance progressive, comme sur une app native
        setPull(Math.min(dy * 0.45, MAX_PULL));
      } else if (pullingRef.current) {
        pullingRef.current = false;
        setPull(0);
      }
    };

    const onTouchEnd = async () => {
      if (startYRef.current === null) return;
      startYRef.current = null;
      if (!pullingRef.current) return;
      pullingRef.current = false;

      setPull((current) => {
        if (current >= PULL_THRESHOLD) {
          void doRefresh();
          return 54; // hauteur de l'indicateur pendant le chargement
        }
        return 0;
      });
    };

    const doRefresh = async () => {
      setRefreshing(true);
      const started = Date.now();
      try {
        clearReservationsCache();
        clearHousekeepingTasksCache();
        await queryClient.invalidateQueries();
      } finally {
        // Durée minimale pour un rendu fluide
        const remaining = Math.max(0, 700 - (Date.now() - started));
        setTimeout(() => {
          setRefreshing(false);
          setPull(0);
        }, remaining);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshing, queryClient]);

  const isActive = (to: string) =>
    to === "/v4" ? pathname === "/v4" : pathname.startsWith(to);

  const progress = Math.min(1, pull / PULL_THRESHOLD);

  return (
    <div className="h-screen [height:100dvh] overflow-hidden bg-[#ecf3f7]">
      <div className="mx-auto flex h-full w-full max-w-md flex-col bg-[#ecf3f7]">
        <main
          ref={scrollRef}
          className={cn("flex-1 overflow-y-auto overscroll-contain", !hideNav && "pb-8")}
        >
          {/* Indicateur pull-to-refresh */}
          <div
            className="flex items-end justify-center overflow-hidden"
            style={{
              height: pull,
              transition: pullingRef.current ? "none" : "height 0.25s ease",
            }}
          >
            <div
              className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md"
              style={{
                opacity: refreshing ? 1 : progress,
                transform: refreshing
                  ? undefined
                  : `rotate(${progress * 270}deg) scale(${0.6 + progress * 0.4})`,
              }}
            >
              <RefreshCw
                className={cn("h-4 w-4 text-hk-600", refreshing && "animate-spin")}
              />
            </div>
          </div>

          {children}
        </main>

        {!hideNav && (
          <nav className="shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur">
            <div className="grid grid-cols-5 px-1 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2">
              {tabs.map((tab) => {
                const active = isActive(tab.to);
                const Icon = tab.icon;
                return (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <span
                      className={cn(
                        "rounded-xl px-3 py-1",
                        active ? "bg-hk-50 text-hk-600" : "text-slate-400"
                      )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        active ? "text-hk-600" : "text-slate-400"
                      )}
                    >
                      {tab.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
};

export default V4Layout;
