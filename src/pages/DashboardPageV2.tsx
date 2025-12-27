"use client";

import React from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/SessionContextProvider";
import { Link, Navigate } from "react-router-dom";
import {
  CalendarDays,
  Book,
  Banknote,
  Wrench,
  ArrowRight,
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
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 py-6">
        {/* En-tête épuré */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Aperçu — Design V2</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Version interne, minimaliste et épurée.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/calendar">
              <Button variant="ghost" size="sm" className="hover:bg-muted">
                <CalendarDays className="h-4 w-4 mr-2" />
                Calendrier
              </Button>
            </Link>
            <Link to="/bookings">
              <Button variant="ghost" size="sm" className="hover:bg-muted">
                <Book className="h-4 w-4 mr-2" />
                Réservations
              </Button>
            </Link>
            <Link to="/finances">
              <Button variant="ghost" size="sm" className="hover:bg-muted">
                <Banknote className="h-4 w-4 mr-2" />
                Finances
              </Button>
            </Link>
            <Link to="/reports">
              <Button variant="ghost" size="sm" className="hover:bg-muted">
                <Wrench className="h-4 w-4 mr-2" />
                Incidents
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI sobres */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                Bénéfice estimé (YTD)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">13 500€</p>
              <p className="text-xs text-muted-foreground mt-1">Tendance</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                CA estimé (YTD)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">18 000€</p>
              <p className="text-xs text-muted-foreground mt-1">Simulation</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                Occupation moyenne
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">58%</p>
              <p className="text-xs text-muted-foreground mt-1">6 derniers mois</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                Actions en attente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">3</p>
              <p className="text-xs text-muted-foreground mt-1">Voir ci-dessous</p>
            </CardContent>
          </Card>
        </div>

        {/* Graphiques épurés */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card className="shadow-sm">
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Tendance des revenus</CardTitle>
              <Button variant="outline" size="sm">Détails</Button>
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

          <Card className="shadow-sm">
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Occupation estimée</CardTitle>
              <Button variant="outline" size="sm">Détails</Button>
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

        {/* Actions requises minimalistes */}
        <div className="mt-6">
          <Card className="shadow-sm">
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
                  <Button variant="outline" size="sm">Ouvrir</Button>
                </Link>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">Envoyer mes consignes d’hivernage</p>
                  <p className="text-xs text-muted-foreground">Chauffage, eau, linge, volets…</p>
                </div>
                <Link to="/hivernage-2026">
                  <Button variant="outline" size="sm">Ouvrir</Button>
                </Link>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">Compléter les infos de mes logements</p>
                  <p className="text-xs text-muted-foreground">Codes Wi‑Fi, instructions, règles…</p>
                </div>
                <Link to="/my-rooms">
                  <Button variant="outline" size="sm">Ouvrir</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer discret */}
        <div className="mt-8 flex items-center justify-between text-xs text-muted-foreground">
          <span>Home v2 — version interne minimaliste</span>
          <span>Votre avis nous aide à améliorer le design</span>
        </div>
      </div>
    </MainLayout>
  );
};

export default DashboardPageV2;