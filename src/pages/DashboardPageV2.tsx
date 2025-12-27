"use client";

import React from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/components/SessionContextProvider";
import { Link, Navigate } from "react-router-dom";
import {
  Home,
  CalendarDays,
  Book,
  Banknote,
  Wrench,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";

const revenueData = [
  { name: "Jan", benef: 8000, ca: 12000 },
  { name: "Fév", benef: 7000, ca: 11000 },
  { name: "Mar", benef: 9500, ca: 14000 },
  { name: "Avr", benef: 10000, ca: 15000 },
  { name: "Mai", benef: 12000, ca: 17000 },
  { name: "Juin", benef: 13000, ca: 18000 },
];

const occupancyData = [
  { name: "Jan", occupation: 42 },
  { name: "Fév", occupation: 48 },
  { name: "Mar", occupation: 55 },
  { name: "Avr", occupation: 61 },
  { name: "Mai", occupation: 68 },
  { name: "Juin", occupation: 72 },
];

const chartConfig = {
  benef: {
    label: "Bénéfice",
    color: "#22c55e",
  },
  ca: {
    label: "CA",
    color: "hsl(var(--primary))",
  },
  occupation: {
    label: "Occupation",
    color: "#14b8a6",
  },
};

const DashboardPageV2: React.FC = () => {
  const { profile } = useSession();

  // Accès restreint aux admins (page non publique)
  if (profile && profile.role !== "admin") {
    return (
      <MainLayout>
        <div className="container mx-auto py-10">
          <Card className="max-w-xl mx-auto">
            <CardHeader>
              <CardTitle>Accès restreint</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Cette variante de la page d’accueil est réservée aux administrateurs.
              </p>
              <div className="mt-4">
                <Link to="/">
                  <Button variant="outline">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Retourner à l’accueil
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Si pas de profil (chargement ou non connecté), sécurité simple: rediriger vers l'accueil
  if (!profile) {
    return <Navigate to="/" replace />;
  }

  return (
    <MainLayout>
      <div className="relative mx-auto w-full max-w-[1200px] px-4 sm:px-6 py-6">
        {/* Hero */}
        <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Bonjour {profile.first_name || ""} {profile.last_name || ""} 👋
              </h1>
              <p className="mt-1 text-sm sm:text-base opacity-90">
                Voici votre aperçu stratégique — design v2
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                Expérimental
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                V2
              </Badge>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link to="/calendar">
              <Button variant="secondary" className="w-full bg-white/20 hover:bg-white/30">
                <CalendarDays className="h-4 w-4 mr-2" />
                Calendrier
              </Button>
            </Link>
            <Link to="/bookings">
              <Button variant="secondary" className="w-full bg-white/20 hover:bg-white/30">
                <Book className="h-4 w-4 mr-2" />
                Réservations
              </Button>
            </Link>
            <Link to="/finances">
              <Button variant="secondary" className="w-full bg-white/20 hover:bg-white/30">
                <Banknote className="h-4 w-4 mr-2" />
                Finances
              </Button>
            </Link>
            <Link to="/reports">
              <Button variant="secondary" className="w-full bg-white/20 hover:bg-white/30">
                <Wrench className="h-4 w-4 mr-2" />
                Incidents
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Bénéfice estimé (YTD)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">13 500€</p>
              <p className="text-xs text-muted-foreground mt-1">Basé sur les tendances</p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">CA estimé (YTD)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">18 000€</p>
              <p className="text-xs text-muted-foreground mt-1">Simulation v2</p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Occupation moyenne</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-teal-600">58%</p>
              <p className="text-xs text-muted-foreground mt-1">6 derniers mois</p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Actions en attente</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">3</p>
              <p className="text-xs text-muted-foreground mt-1">Voir ci-dessous</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card className="shadow-md">
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Tendance des revenus</CardTitle>
              <Button variant="outline" size="sm">
                <Sparkles className="h-4 w-4 mr-2" />
                Explorer
              </Button>
            </CardHeader>
            <CardContent className="h-72">
              <ChartContainer config={chartConfig} className="h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorBenef" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" className="text-xs" tickLine={false} axisLine={false} />
                    <YAxis className="text-xs" tickLine={false} axisLine={false} tickFormatter={(v) => `€${v}`} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => `€${Number(value).toLocaleString()}`} />} />
                    <ChartLegend />
                    <Line type="monotone" dataKey="ca" stroke="hsl(var(--primary))" name="CA" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="benef" stroke="#22c55e" fillOpacity={1} fill="url(#colorBenef)" name="Bénéfice" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Occupation estimée</CardTitle>
              <Button variant="outline" size="sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                Détails
              </Button>
            </CardHeader>
            <CardContent className="h-72">
              <ChartContainer config={chartConfig} className="h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={occupancyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" className="text-xs" tickLine={false} axisLine={false} />
                    <YAxis unit="%" className="text-xs" tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${Number(value).toFixed(0)}%`} />} />
                    <ChartLegend />
                    <Line type="monotone" dataKey="occupation" stroke="#14b8a6" name="Occupation" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Actions requises */}
        <div className="mt-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Mes actions requises</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">Configurer mes prix Saison 2026</p>
                  <p className="text-xs text-muted-foreground">Saisir vos prix et envoyer votre demande</p>
                </div>
                <Link to="/season-2026">
                  <Button variant="outline" size="sm">
                    Ouvrir
                  </Button>
                </Link>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">Envoyer mes consignes d’hivernage</p>
                  <p className="text-xs text-muted-foreground">Chauffage, eau, linge, volets…</p>
                </div>
                <Link to="/hivernage-2026">
                  <Button variant="outline" size="sm">
                    Ouvrir
                  </Button>
                </Link>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">Compléter les infos de mes logements</p>
                  <p className="text-xs text-muted-foreground">Codes Wi‑Fi, instructions, règles…</p>
                </div>
                <Link to="/my-rooms">
                  <Button variant="outline" size="sm">
                    Ouvrir
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            <span>Home v2 — aperçu interne</span>
          </div>
          <span>Conçu pour l’évaluation du design</span>
        </div>
      </div>
    </MainLayout>
  );
};

export default DashboardPageV2;