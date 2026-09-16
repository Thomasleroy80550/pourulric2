import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, CalendarDays, BookMarked, Wallet, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/v4", label: "Accueil", icon: Home },
  { to: "/v4/calendrier", label: "Calendrier", icon: CalendarDays },
  { to: "/v4/reservations", label: "Réservations", icon: BookMarked },
  { to: "/v4/finances", label: "Finances", icon: Wallet },
  { to: "/v4/plus", label: "Plus", icon: LayoutGrid },
];

const V4Layout: React.FC<{ children: React.ReactNode; hideNav?: boolean }> = ({
  children,
  hideNav,
}) => {
  const { pathname } = useLocation();

  const isActive = (to: string) =>
    to === "/v4" ? pathname === "/v4" : pathname.startsWith(to);

  return (
    <div className="min-h-screen bg-[#ecf3f7]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#ecf3f7]">
        <main className={cn("flex-1", !hideNav && "pb-24")}>{children}</main>

        {!hideNav && (
          <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white/95 backdrop-blur">
            <div className="grid grid-cols-5 px-1 pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
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
