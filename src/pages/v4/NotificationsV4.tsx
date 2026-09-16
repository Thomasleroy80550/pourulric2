import React from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";
import V4Layout from "./V4Layout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  Notification,
} from "@/lib/notifications-api";
import { useV4Notifications } from "./v4-data";
import { cn } from "@/lib/utils";

const NotificationsV4: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: notifications, isLoading } = useV4Notifications();

  const unreadCount = (notifications ?? []).filter((n) => !n.is_read).length;

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["v4-notifications"] });

  const handleMarkAll = async () => {
    await markAllNotificationsAsRead();
    refresh();
  };

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      await markNotificationAsRead(n.id);
      refresh();
    }
    if (n.link) navigate(n.link);
  };

  return (
    <V4Layout hideNav>
      <div className="space-y-4 px-4 pt-5 pb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="rounded-full bg-white p-2 text-slate-600 shadow-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Tout lire
            </button>
          )}
        </div>

        {isLoading && (
          <>
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </>
        )}

        {!isLoading && (notifications ?? []).length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <Bell className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">
              Aucune notification pour le moment.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {(notifications ?? []).map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={cn(
                "flex w-full items-start gap-3 rounded-2xl p-3 text-left shadow-sm",
                n.is_read ? "bg-white" : "bg-blue-50"
              )}
            >
              <span
                className={cn(
                  "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                  n.is_read ? "bg-slate-200" : "bg-blue-600"
                )}
              />
              <div className="flex-1">
                <p
                  className={cn(
                    "text-sm text-slate-900",
                    !n.is_read && "font-semibold"
                  )}
                >
                  {n.message}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {relative(n.created_at)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </V4Layout>
  );
};

function relative(iso: string): string {
  const d = parseISO(iso);
  if (!isValid(d)) return "";
  return formatDistanceToNow(d, { addSuffix: true, locale: fr });
}

export default NotificationsV4;
