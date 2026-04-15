"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, isAfter, parseISO, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Home,
  MessageSquare,
  TriangleAlert,
  Wrench,
} from "lucide-react";

import MainLayout from "@/components/MainLayout";
import DashboardVersionSwitch from "@/components/DashboardVersionSwitch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/components/SessionContextProvider";
import {
  fetchKrossbookingReservations,
  KrossbookingReservation,
} from "@/lib/krossbooking";
import { getNotifications, Notification } from "@/lib/notifications-api";
import {
  getTechnicalReportsByUserId,
  TechnicalReport,
} from "@/lib/technical-reports-api";
import { getUserRooms } from "@/lib/user-room-api";

type DashboardStats = {
  roomCount: number;
  unreadNotifications: number;
  openReports: number;
  upcomingCount: number;
};

type ActionItem = {
  title: string;
  description: string;
  to: string;
  icon: React.ElementType;
};

const quickActions: ActionItem[] = [
  {
    title: "Calendrier",
    description: "Visualiser vos prochaines occupations.",
    to: "/calendar",
    icon: CalendarDays,
  },
  {
    title: "Réservations",
    description: "Retrouver vos arrivées et départs.",
    to: "/bookings",
    icon: BookOpen,
  },
  {
    title: "Incidents",
    description: "Suivre les sujets techniques en cours.",
    to: "/reports",
    icon: Wrench,
  },
  {
    title: "Notifications",
    description: "Voir les dernières informations importantes.",
    to: "/notifications",
    icon: Bell,
  },
];

const DashboardPage: React.FC = () => {
  const { profile } = useSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    roomCount: 0,
    unreadNotifications: 0,
    openReports: 0,
    upcomingCount: 0,
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reports, setReports] = useState<TechnicalReport[]>([]);
  const [nextArrivals, setNextArrivals] = useState<KrossbookingReservation[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      if (!profile?.id) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const rooms = await getUserRooms();
        const [notificationsData, reportsData, reservations] = await Promise.all([
          getNotifications(),
          getTechnicalReportsByUserId(profile.id),
          rooms.length > 0 ? fetchKrossbookingReservations(rooms) : Promise.resolve([]),
        ]);

        if (!isMounted) return;

        const today = startOfDay(new Date());
        const upcomingReservations = reservations
          .filter((reservation) => isAfter(parseISO(reservation.check_in_date), today))
          .sort(
            (a, b) =>
              parseISO(a.check_in_date).getTime() - parseISO(b.check_in_date).getTime(),
          );

        setNotifications(notificationsData);
        setReports(reportsData);
        setNextArrivals(upcomingReservations.slice(0, 5));
        setStats({
          roomCount: rooms.length,
          unreadNotifications: notificationsData.filter((item) => !item.is_read).length,
          openReports: reportsData.filter(
            (item) => item.status !== "resolved" && item.status !== "archived",
          ).length,
          upcomingCount: upcomingReservations.length,
        });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  }, []);

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.is_read).slice(0, 4),
    [notifications],
  );

  const openReports = useMemo(
    () => reports.filter((item) => item.status !== "resolved" && item.status !== "archived").slice(0, 4),
    [reports],
  );

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Dashboard V1</Badge>
              <Badge variant="outline">{format(new Date(), "dd MMMM yyyy", { locale: fr })}</Badge>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {greeting}
                {profile?.first_name ? ` ${profile.first_name}` : ""}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Retrouvez une vue d'ensemble simple de votre activité, de vos alertes et de vos prochaines arrivées.
              </p>
            </div>
          </div>

          <DashboardVersionSwitch className="self-start" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="shadow-sm">
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-4 h-9 w-16" />
                  <Skeleton className="mt-3 h-3 w-28" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card className="shadow-sm">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Mes logements</p>
                  <p className="mt-3 text-3xl font-bold">{stats.roomCount}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Logements actuellement configurés</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Notifications non lues</p>
                  <p className="mt-3 text-3xl font-bold">{stats.unreadNotifications}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Informations nécessitant votre attention</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Incidents ouverts</p>
                  <p className="mt-3 text-3xl font-bold">{stats.openReports}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Sujets techniques encore en cours</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Arrivées à venir</p>
                  <p className="mt-3 text-3xl font-bold">{stats.upcomingCount}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Réservations futures détectées</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Prochaines arrivées</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Les prochains séjours prévus sur vos logements.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link to="/bookings">Voir les réservations</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="mt-3 h-3 w-56" />
                  </div>
                ))
              ) : nextArrivals.length > 0 ? (
                nextArrivals.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-semibold">{reservation.property_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {reservation.guest_name} · arrivée le {format(parseISO(reservation.check_in_date), "dd MMMM", { locale: fr })}
                      </p>
                    </div>
                    <Badge variant="outline" className="w-fit">
                      {reservation.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  Aucune arrivée à venir pour le moment.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Accès rapides</CardTitle>
              <p className="text-sm text-muted-foreground">
                Les sections les plus utiles au quotidien.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((item) => (
                <Link
                  key={item.title}
                  to={item.to}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Notifications récentes</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Les derniers éléments non lus en priorité.
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/notifications">Tout voir</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="mt-3 h-3 w-2/5" />
                  </div>
                ))
              ) : unreadNotifications.length > 0 ? (
                unreadNotifications.map((notification) => (
                  <Link
                    key={notification.id}
                    to={notification.link || "/notifications"}
                    className="block rounded-lg border p-4 transition-colors hover:bg-muted/40"
                  >
                    <p className="font-medium">{notification.message}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Notification non lue</p>
                  </Link>
                ))
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  Aucune notification non lue.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Incidents en cours</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Les demandes techniques encore ouvertes.
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/reports">Voir les incidents</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="mt-3 h-3 w-1/3" />
                  </div>
                ))
              ) : openReports.length > 0 ? (
                openReports.map((report) => (
                  <Link
                    key={report.id}
                    to={`/reports/${report.id}`}
                    className="block rounded-lg border p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-2">
                      <TriangleAlert className="h-4 w-4 text-amber-500" />
                      <p className="font-medium">{report.title}</p>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Statut : {report.status}
                    </p>
                  </Link>
                ))
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  Aucun incident ouvert actuellement.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-semibold">Besoin d’aller plus loin ?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Accédez rapidement à votre profil, à vos logements ou à l’aide Hello Keys.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link to="/my-rooms">
                  <Home className="mr-2 h-4 w-4" />
                  Mes logements
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/help">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Centre d'aide
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default DashboardPage;
