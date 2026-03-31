"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, isAfter, parseISO, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Clock3,
  Home,
  LayoutGrid,
  MessageSquareMore,
  Sparkles,
  TriangleAlert,
  Wallet,
  Wrench,
} from "lucide-react";

import MainLayout from "@/components/MainLayout";
import DashboardVersionSwitch from "@/components/DashboardVersionSwitch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/components/SessionContextProvider";
import { fetchKrossbookingReservations, KrossbookingReservation } from "@/lib/krossbooking";
import { getNotifications } from "@/lib/notifications-api";
import { getTechnicalReportsByUserId } from "@/lib/technical-reports-api";
import { getUserRooms } from "@/lib/user-room-api";

type DashboardStats = {
  roomCount: number;
  unreadNotifications: number;
  openReports: number;
  upcomingCount: number;
};

type QuickLinkItem = {
  title: string;
  description: string;
  to: string;
  icon: React.ElementType;
  accent: string;
};

const quickLinks: QuickLinkItem[] = [
  {
    title: "Calendrier",
    description: "Suivre l’occupation et naviguer rapidement entre vos séjours.",
    to: "/calendar",
    icon: CalendarDays,
    accent: "from-cyan-400/30 to-blue-500/10",
  },
  {
    title: "Réservations",
    description: "Accéder à vos arrivées, départs et séjours à venir.",
    to: "/bookings",
    icon: BookOpen,
    accent: "from-violet-400/30 to-fuchsia-500/10",
  },
  {
    title: "Finances",
    description: "Consulter vos flux, relevés et vision financière globale.",
    to: "/finances",
    icon: Wallet,
    accent: "from-emerald-400/30 to-green-500/10",
  },
  {
    title: "Incidents",
    description: "Suivre les sujets en attente et les actions à traiter.",
    to: "/reports",
    icon: Wrench,
    accent: "from-amber-400/30 to-orange-500/10",
  },
];

const actionCards = [
  {
    title: "Préparer la saison",
    description: "Mettez à jour vos prix et vos préférences pour la saison 2026.",
    to: "/season-2026",
    icon: Sparkles,
  },
  {
    title: "Mettre à jour mes logements",
    description: "Complétez les infos utiles pour vos voyageurs et les équipes terrain.",
    to: "/my-rooms",
    icon: Home,
  },
  {
    title: "Voir mes notifications",
    description: "Retrouvez les dernières informations importantes liées à votre compte.",
    to: "/notifications",
    icon: Bell,
  },
];

const DashboardPageV2: React.FC = () => {
  const { profile, session } = useSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    roomCount: 0,
    unreadNotifications: 0,
    openReports: 0,
    upcomingCount: 0,
  });
  const [nextArrivals, setNextArrivals] = useState<KrossbookingReservation[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      if (!profile?.id) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const rooms = await getUserRooms();
        const [notifications, reports, reservations] = await Promise.all([
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

        setStats({
          roomCount: rooms.length,
          unreadNotifications: notifications.filter((notification) => !notification.is_read).length,
          openReports: reports.filter(
            (report) => report.status !== "resolved" && report.status !== "archived",
          ).length,
          upcomingCount: upcomingReservations.length,
        });
        setNextArrivals(upcomingReservations.slice(0, 3));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboardData();

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

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6">
        <div className="relative overflow-hidden rounded-[32px] border border-slate-800 bg-slate-950 text-slate-50 shadow-2xl">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
            <div className="absolute right-0 top-16 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
          </div>

          <div className="relative p-5 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-6 border-b border-white/10 pb-8">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className="border-white/10 bg-white/10 text-white hover:bg-white/10">
                      Dashboard V2
                    </Badge>
                    <Badge variant="outline" className="border-white/15 text-slate-300">
                      {format(new Date(), "dd MMMM yyyy", { locale: fr })}
                    </Badge>
                  </div>

                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                      {greeting}
                      {profile?.first_name ? ` ${profile.first_name}` : ""},
                      <span className="block bg-gradient-to-r from-white via-cyan-200 to-violet-200 bg-clip-text text-transparent">
                        voici une version plus premium de votre dashboard.
                      </span>
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                      J’ai gardé la V1 intacte et ajouté cette nouvelle interface dans un esprit plus
                      moderne, contrasté et orienté pilotage rapide.
                    </p>
                  </div>
                </div>

                <DashboardVersionSwitch theme="inverted" className="self-start" />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {loading
                  ? Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
                      >
                        <Skeleton className="h-4 w-24 bg-white/10" />
                        <Skeleton className="mt-4 h-10 w-20 bg-white/10" />
                        <Skeleton className="mt-3 h-3 w-32 bg-white/10" />
                      </div>
                    ))
                  : [
                      {
                        label: "Logements configurés",
                        value: stats.roomCount,
                        help: "Vos biens actuellement reliés au compte",
                        icon: LayoutGrid,
                      },
                      {
                        label: "Notifications non lues",
                        value: stats.unreadNotifications,
                        help: "À consulter depuis votre centre de notifications",
                        icon: Bell,
                      },
                      {
                        label: "Incidents ouverts",
                        value: stats.openReports,
                        help: "Demandes nécessitant encore un suivi",
                        icon: TriangleAlert,
                      },
                      {
                        label: "Arrivées à venir",
                        value: stats.upcomingCount,
                        help: "Séjours futurs déjà remontés au dashboard",
                        icon: Clock3,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-slate-300">{item.label}</p>
                          <item.icon className="h-4 w-4 text-slate-400" />
                        </div>
                        <p className="mt-4 text-4xl font-semibold tracking-tight">{item.value}</p>
                        <p className="mt-2 text-xs text-slate-400">{item.help}</p>
                      </div>
                    ))}
              </div>
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Card className="border-white/10 bg-white/5 text-white shadow-none backdrop-blur">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
                        Prochaines arrivées
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold">Vue rapide des prochains séjours</h2>
                    </div>
                    <Button asChild variant="secondary" className="rounded-full">
                      <Link to="/bookings">
                        Voir tout
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>

                  <div className="mt-6 space-y-3">
                    {loading ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <div
                          key={index}
                          className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"
                        >
                          <Skeleton className="h-4 w-40 bg-white/10" />
                          <Skeleton className="mt-3 h-3 w-56 bg-white/10" />
                        </div>
                      ))
                    ) : nextArrivals.length > 0 ? (
                      nextArrivals.map((reservation) => (
                        <div
                          key={reservation.id}
                          className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <p className="text-lg font-medium text-white">{reservation.property_name}</p>
                            <p className="text-sm text-slate-300">
                              {reservation.guest_name} • arrivée le {format(parseISO(reservation.check_in_date), "dd MMMM", { locale: fr })}
                            </p>
                          </div>
                          <Badge variant="outline" className="w-fit border-cyan-400/30 text-cyan-200">
                            {reservation.status}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/50 p-6 text-sm text-slate-300">
                        Aucune prochaine arrivée détectée pour le moment.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5 text-white shadow-none backdrop-blur">
                <CardContent className="p-5 sm:p-6">
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Actions rapides</p>
                  <h2 className="mt-2 text-2xl font-semibold">Vos priorités du moment</h2>
                  <div className="mt-6 space-y-3">
                    {actionCards.map((item) => (
                      <Link
                        key={item.title}
                        to={item.to}
                        className="group block rounded-2xl border border-white/10 bg-slate-900/70 p-4 transition hover:border-white/20 hover:bg-slate-900"
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                            <item.icon className="h-5 w-5 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium text-white">{item.title}</p>
                              <ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:text-white" />
                            </div>
                            <p className="mt-1 text-sm text-slate-300">{item.description}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
              {quickLinks.map((item) => (
                <Link key={item.title} to={item.to} className="block">
                  <div
                    className={`h-full rounded-[28px] border border-white/10 bg-gradient-to-br ${item.accent} p-[1px] transition hover:-translate-y-0.5 hover:border-white/20`}
                  >
                    <div className="flex h-full flex-col rounded-[27px] bg-slate-950/90 p-5">
                      <div className="flex items-center justify-between">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <item.icon className="h-5 w-5 text-white" />
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-500" />
                      </div>
                      <h3 className="mt-6 text-xl font-semibold text-white">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/5 p-5 text-slate-200 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Esprit de la V2</p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Une interface plus éditoriale et visuelle, avec davantage de contraste, des blocs plus
                  premium et une lecture plus directe des accès essentiels.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="rounded-full">
                  <Link to="/calendar">Ouvrir le calendrier</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white">
                  <Link to="/help">
                    <MessageSquareMore className="mr-2 h-4 w-4" />
                    Centre d’aide
                  </Link>
                </Button>
              </div>
            </div>

            <div className="mt-6 text-xs text-slate-500">
              {session ? "Connecté" : "Non connecté"}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default DashboardPageV2;
