"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, isAfter, parseISO, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
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

import BrandBackdrop from "@/components/BrandBackdrop";
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
};

type SparkPoint = {
  value: number;
};

type StatCardItem = {
  key: keyof DashboardStats;
  label: string;
  help: string;
  icon: React.ElementType;
  chartColor: string;
  trendAccentClass: string;
  trendLabel: string;
  sparkline: SparkPoint[];
};

const MiniStatChart = ({
  data,
  color,
  gradientId,
}: {
  data: SparkPoint[];
  color: string;
  gradientId: string;
}) => {
  return (
    <div className="mt-3 h-16 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 6, left: 6, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.24} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="natural"
            dataKey="value"
            stroke={color}
            strokeWidth={3}
            fill={`url(#${gradientId})`}
            fillOpacity={1}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const quickLinks: QuickLinkItem[] = [
  {
    title: "Calendrier",
    description: "Suivre l'occupation et naviguer rapidement entre vos séjours.",
    to: "/calendar",
    icon: CalendarDays,
  },
  {
    title: "Réservations",
    description: "Accéder à vos arrivées, départs et séjours à venir.",
    to: "/bookings",
    icon: BookOpen,
  },
  {
    title: "Finances",
    description: "Consulter vos flux, relevés et vision financière globale.",
    to: "/finances",
    icon: Wallet,
  },
  {
    title: "Incidents",
    description: "Suivre les sujets en attente et les actions à traiter.",
    to: "/reports",
    icon: Wrench,
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

const statCards: StatCardItem[] = [
  {
    key: "roomCount",
    label: "Logements configurés",
    help: "Vos biens actuellement reliés au compte",
    icon: LayoutGrid,
    chartColor: "#3B82F6",
    trendAccentClass: "text-emerald-600",
    trendLabel: "Vue stable",
    sparkline: [
      { value: 22 },
      { value: 31 },
      { value: 28 },
      { value: 18 },
      { value: 20 },
      { value: 34 },
      { value: 42 },
      { value: 40 },
      { value: 36 },
      { value: 51 },
    ],
  },
  {
    key: "unreadNotifications",
    label: "Notifications non lues",
    help: "À consulter depuis votre centre de notifications",
    icon: Bell,
    chartColor: "#60A5FA",
    trendAccentClass: "text-sky-600",
    trendLabel: "Flux actif",
    sparkline: [
      { value: 14 },
      { value: 24 },
      { value: 21 },
      { value: 23 },
      { value: 17 },
      { value: 12 },
      { value: 19 },
      { value: 22 },
      { value: 21 },
      { value: 30 },
    ],
  },
  {
    key: "openReports",
    label: "Incidents ouverts",
    help: "Demandes nécessitant encore un suivi",
    icon: TriangleAlert,
    chartColor: "#F59E0B",
    trendAccentClass: "text-amber-600",
    trendLabel: "Sous contrôle",
    sparkline: [
      { value: 12 },
      { value: 17 },
      { value: 15 },
      { value: 13 },
      { value: 10 },
      { value: 8 },
      { value: 11 },
      { value: 14 },
      { value: 12 },
      { value: 16 },
    ],
  },
  {
    key: "upcomingCount",
    label: "Arrivées à venir",
    help: "Séjours futurs déjà remontés au dashboard",
    icon: Clock3,
    chartColor: "#0EA5E9",
    trendAccentClass: "text-cyan-600",
    trendLabel: "Bonne dynamique",
    sparkline: [
      { value: 10 },
      { value: 15 },
      { value: 17 },
      { value: 16 },
      { value: 20 },
      { value: 23 },
      { value: 19 },
      { value: 24 },
      { value: 22 },
      { value: 31 },
    ],
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
        <div className="relative overflow-hidden rounded-[32px] border border-[hsl(var(--sidebar-border))] bg-gradient-to-br from-white via-[hsl(var(--sidebar-background))] to-sky-50 shadow-[0_24px_80px_rgba(37,95,133,0.10)]">
          <BrandBackdrop variant="blue" className="opacity-80" />

          <div className="relative p-5 sm:p-8 lg:p-10">
            <div className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur sm:p-7">
              <div className="flex flex-col gap-6 border-b border-sky-100 pb-8">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-3xl space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge className="bg-[hsl(var(--sidebar-foreground))] text-white hover:bg-[hsl(var(--sidebar-foreground))]">
                        Dashboard V2
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]"
                      >
                        {format(new Date(), "dd MMMM yyyy", { locale: fr })}
                      </Badge>
                    </div>

                    <div>
                      <h1 className="text-3xl font-semibold tracking-tight text-[hsl(var(--sidebar-foreground))] sm:text-4xl lg:text-5xl">
                        {greeting}
                        {profile?.first_name ? ` ${profile.first_name}` : ""},
                        <span className="block bg-gradient-to-r from-[hsl(var(--sidebar-foreground))] via-sky-600 to-cyan-500 bg-clip-text text-transparent">
                          voici une V2 plus élégante, mais fidèle à l'univers Hello Keys.
                        </span>
                      </h1>
                      <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                        J'ai conservé le principe premium, mais avec une base claire, plus douce et plus
                        cohérente avec votre identité bleue actuelle.
                      </p>
                    </div>
                  </div>

                  <DashboardVersionSwitch className="self-start" />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {loading
                    ? Array.from({ length: 4 }).map((_, index) => (
                        <div
                          key={index}
                          className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm"
                        >
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="mt-4 h-10 w-20" />
                          <Skeleton className="mt-4 h-16 w-full" />
                          <Skeleton className="mt-3 h-3 w-32" />
                        </div>
                      ))
                    : statCards.map((item) => {
                        const Icon = item.icon;
                        const value = stats[item.key];

                        return (
                          <div
                            key={item.label}
                            className="rounded-[24px] border border-sky-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-slate-600">{item.label}</p>
                              <div className="rounded-xl bg-[hsl(var(--sidebar-background))] p-2 text-[hsl(var(--sidebar-foreground))]">
                                <Icon className="h-4 w-4" />
                              </div>
                            </div>
                            <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                              {value.toLocaleString("fr-FR")}
                            </p>
                            <MiniStatChart
                              data={item.sparkline}
                              color={item.chartColor}
                              gradientId={`mini-stat-${item.key}`}
                            />
                            <div className="mt-2 flex items-center gap-2 text-xs">
                              <span className={`font-semibold ${item.trendAccentClass}`}>
                                {item.trendLabel}
                              </span>
                              <span className="text-slate-500">{item.help}</span>
                            </div>
                          </div>
                        );
                      })}
                </div>
              </div>

              <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <Card className="border-sky-100 bg-white/90 shadow-sm">
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                          Prochaines arrivées
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold text-[hsl(var(--sidebar-foreground))]">
                          Vue rapide des prochains séjours
                        </h2>
                      </div>
                      <Button asChild className="rounded-full bg-[hsl(var(--sidebar-foreground))] text-white hover:bg-[hsl(var(--primary))]">
                        <Link to="/bookings">
                          Voir tout
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>

                    <div className="mt-6 space-y-3">
                      {loading ? (
                        Array.from({ length: 3 }).map((_, index) => (
                          <div key={index} className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="mt-3 h-3 w-56" />
                          </div>
                        ))
                      ) : nextArrivals.length > 0 ? (
                        nextArrivals.map((reservation) => (
                          <div
                            key={reservation.id}
                            className="flex flex-col gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 md:flex-row md:items-center md:justify-between"
                          >
                            <div>
                              <p className="text-lg font-medium text-[hsl(var(--sidebar-foreground))]">
                                {reservation.property_name}
                              </p>
                              <p className="text-sm text-slate-600">
                                {reservation.guest_name} • arrivée le {format(parseISO(reservation.check_in_date), "dd MMMM", { locale: fr })}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="w-fit border-sky-200 bg-white text-[hsl(var(--sidebar-foreground))]"
                            >
                              {reservation.status}
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 p-6 text-sm text-slate-600">
                          Aucune prochaine arrivée détectée pour le moment.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-sky-100 bg-white/90 shadow-sm">
                  <CardContent className="p-5 sm:p-6">
                    <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Actions rapides</p>
                    <h2 className="mt-2 text-2xl font-semibold text-[hsl(var(--sidebar-foreground))]">
                      Vos priorités du moment
                    </h2>
                    <div className="mt-6 space-y-3">
                      {actionCards.map((item) => (
                        <Link
                          key={item.title}
                          to={item.to}
                          className="group block rounded-2xl border border-sky-100 bg-sky-50/55 p-4 transition hover:border-sky-200 hover:bg-sky-50"
                        >
                          <div className="flex items-start gap-3">
                            <div className="rounded-xl bg-white p-2.5 text-[hsl(var(--sidebar-foreground))] shadow-sm">
                              <item.icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <p className="font-medium text-[hsl(var(--sidebar-foreground))]">
                                  {item.title}
                                </p>
                                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:text-[hsl(var(--sidebar-foreground))]" />
                              </div>
                              <p className="mt-1 text-sm text-slate-600">{item.description}</p>
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
                    <div className="h-full rounded-[28px] border border-sky-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className="flex items-center justify-between">
                        <div className="rounded-2xl bg-[hsl(var(--sidebar-background))] p-3 text-[hsl(var(--sidebar-foreground))]">
                          <item.icon className="h-5 w-5" />
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                      </div>
                      <h3 className="mt-6 text-xl font-semibold text-[hsl(var(--sidebar-foreground))]">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-4 rounded-[28px] border border-sky-100 bg-gradient-to-r from-[hsl(var(--sidebar-background))] via-white to-sky-50 p-5 text-slate-700 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Esprit de la V2</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                    Une interface plus éditoriale et plus aérée, avec une hiérarchie visuelle premium,
                    mais en restant dans vos tons bleus et votre ambiance de marque actuelle.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button asChild className="rounded-full bg-[hsl(var(--sidebar-foreground))] text-white hover:bg-[hsl(var(--primary))]">
                    <Link to="/calendar">Ouvrir le calendrier</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-full border-sky-200 bg-white text-[hsl(var(--sidebar-foreground))] hover:bg-sky-50">
                    <Link to="/help">
                      <MessageSquareMore className="mr-2 h-4 w-4" />
                      Centre d'aide
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
      </div>
    </MainLayout>
  );
};

export default DashboardPageV2;