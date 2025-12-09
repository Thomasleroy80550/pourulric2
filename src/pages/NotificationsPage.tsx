"use client";

import React, { useCallback, useEffect, useState } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCheck, Mail, HelpCircle, FileText, CalendarDays } from "lucide-react";
import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead, Notification } from "@/lib/notifications-api";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SupportPolicyDialog from "@/components/SupportPolicyDialog";
import Bilan2025NoticeDialog from "@/components/Bilan2025NoticeDialog";
import { useSession } from "@/components/SessionContextProvider";

const isInBilanNoticeWindow = () => {
  const now = new Date();
  const start = new Date(2025, 0, 4); // 4 janvier 2025
  const end = new Date(2025, 2, 1, 23, 59, 59); // 1er mars 2025 23:59:59
  return now >= start && now <= end;
};

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { session } = useSession();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du chargement des notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("realtime-notifications-page")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          if (session?.user && payload.new.user_id === session.user.id) {
            fetchNotifications();
            toast.info("Vous avez une nouvelle notification !");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, session]);

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
    fetchNotifications();
    toast.success("Toutes les notifications ont été marquées comme lues.");
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
      } catch (error: any) {
        toast.error(error.message || "Impossible de marquer la notification comme lue.");
      }
    }
    if (notification.link && notification.link !== "#") {
      navigate(notification.link);
    }
  };

  const openBilanDialog = () => {
    window.dispatchEvent(new Event("open-bilan-2025-notice"));
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notifications
          </h1>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} className="flex items-center gap-2">
              <CheckCheck className="h-4 w-4" />
              Tout marquer comme lu
            </Button>
          )}
        </div>

        {/* Informations importantes */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Informations importantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Arrêt du support WhatsApp */}
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-4">
              <h3 className="text-base md:text-lg font-semibold text-amber-900 dark:text-amber-100">
                Arrêt du support via WhatsApp
              </h3>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                Plus aucun support ne sera géré via WhatsApp. Utilisez uniquement le canal de communication par email.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="border-amber-300 text-amber-700 hover:bg-amber-100"
                  onClick={() => {
                    window.location.href = "mailto:contact@hellokeys.fr?subject=Support%20par%20email";
                  }}
                  title="Contacter le support par email"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contacter le support par email
                </Button>
                <Button
                  variant="ghost"
                  className="text-amber-700 hover:bg-amber-100"
                  onClick={() => setSupportDialogOpen(true)}
                  title="Pourquoi ce changement ?"
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Pourquoi ce changement ?
                </Button>
              </div>
            </div>

            {/* Bilan 2025 */}
            {isInBilanNoticeWindow() && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-800/40">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold text-amber-900 dark:text-amber-100">
                      BILAN 2025
                    </h3>
                    <div className="mt-1 text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      Disponible du 4 janvier au 1er mars
                    </div>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                      Retrouvez vos relevés dans la section Finances.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button onClick={() => navigate("/finances")} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                        Voir mes relevés
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={openBilanDialog}
                        className="border-amber-300 text-amber-900 hover:bg-amber-50 dark:text-amber-100"
                      >
                        Plus d'infos
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Liste des notifications */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Mes notifications</CardTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="flex items-center gap-2">
                <CheckCheck className="h-4 w-4" />
                Tout marquer comme lu
              </Button>
            )}
          </CardHeader>
          <CardContent className="max-h-[50vh] overflow-y-auto">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : notifications.length > 0 ? (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${!notification.is_read ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                  >
                    <p className="text-sm">{notification.message}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: fr })}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-center text-gray-500 p-8">Vous n'avez aucune notification.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <SupportPolicyDialog isOpen={supportDialogOpen} onOpenChange={setSupportDialogOpen} />
      <Bilan2025NoticeDialog />
    </MainLayout>
  );
};

export default NotificationsPage;