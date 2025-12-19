"use client";

import React from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
// NEW: import accordion for collapsible logs
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { ResponsiveContainer as RC2 } from "recharts";
import { AreaChart, Area } from "recharts";
// NEW: icons
import { Thermometer, Gauge, Flame, Home as HomeIcon, Clock, Wifi } from "lucide-react";

function computeEndtime(minutes: number): number {
  const nowMs = Date.now();
  const endMs = nowMs + Math.max(1, minutes) * 60_000;
  return Math.floor(endMs / 1000);
}

const NetatmoDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [hasTokens, setHasTokens] = React.useState<boolean | null>(null);

  const [homesData, setHomesData] = React.useState<any | null>(null);
  const [homeId, setHomeId] = React.useState<string | null>(null);
  const [homeStatus, setHomeStatus] = React.useState<any | null>(null);

  const [selectedModuleId, setSelectedModuleId] = React.useState<string | null>(null);
  const [selectedBridgeId, setSelectedBridgeId] = React.useState<string | null>(null);

  const [selectedScale, setSelectedScale] = React.useState<string>("1day");
  const [selectedTypes, setSelectedTypes] = React.useState<string>("sum_boiler_on");
  const [boilerHistory, setBoilerHistory] = React.useState<any | null>(null);

  // NEW: room history states
  const [selectedRoomId, setSelectedRoomId] = React.useState<string | null>(null);
  const [dayChartData, setDayChartData] = React.useState<{ ts: number; label: string; value: number }[]>([]);
  const [weekChartData, setWeekChartData] = React.useState<{ ts: number; label: string; value: number }[]>([]);
  // NEW: raw responses for logs
  const [dayRaw, setDayRaw] = React.useState<any | null>(null);
  const [weekRaw, setWeekRaw] = React.useState<any | null>(null);

  // NEW: logs state & loader
  const [logs, setLogs] = React.useState<any[]>([]);

  // Quick setpoint controls (mode/temp/minutes)
  const [quickMode, setQuickMode] = React.useState<"manual" | "max" | "home">("manual");
  const [quickTemp, setQuickTemp] = React.useState<number>(19);
  const [quickMinutes, setQuickMinutes] = React.useState<number>(60);

  // Helper: build chart points (robuste) + resampling pour day/hour et week/hour
  function buildChartPoints(data: any, scaleForFallback?: string, range?: { startSec?: number; endSec?: number }) {
    const mapStep: Record<string, number> = {
      "30min": 1800,
      "1hour": 3600,
      "3hours": 10800,
      "1day": 86400,
      "1week": 604800,
      "1month": 2592000, // approx
    };

    const homeBlock = data?.body?.home ?? data?.body;

    const collectRawPoints = (): { ts: number; value: number }[] => {
      // Schéma standard
      if (homeBlock && typeof homeBlock === "object" && "beg_time" in homeBlock && "values" in homeBlock) {
        let beg = (homeBlock as any)?.beg_time;
        let step = (homeBlock as any)?.step_time;
        if (typeof step !== "number" && typeof scaleForFallback === "string") step = mapStep[scaleForFallback] ?? 3600;
        const values = (homeBlock as any)?.values;
        if (typeof beg !== "number" || typeof step !== "number" || !Array.isArray(values)) return [];
        return values
          .map((item: any, idx: number) => {
            let raw: any = item;
            if (Array.isArray(raw)) raw = raw[0];
            else if (raw && typeof raw === "object") raw = Array.isArray(raw.value) ? raw.value[0] : raw.value;
            const val = Number(raw);
            const ts = beg + idx * step;
            if (Number.isNaN(val)) return null;
            return { ts, value: val };
          })
          .filter(Boolean) as { ts: number; value: number }[];
      }

      // Format optimisé en tableau [{ beg_time, value: [[...]] }]
      if (Array.isArray(data?.body)) {
        const first = data.body[0];
        let beg = first?.beg_time;
        let step = mapStep[scaleForFallback ?? "1hour"] ?? 3600;
        const v = first?.value;
        if (typeof beg !== "number") return [];
        const arr = Array.isArray(v) ? (Array.isArray(v[0]) ? v[0] : v) : (typeof v === "number" ? [v] : []);
        return arr
          .map((n: any, idx: number) => {
            const val = Number(n);
            const ts = beg + idx * step;
            if (Number.isNaN(val)) return null;
            return { ts, value: val };
          })
          .filter(Boolean) as { ts: number; value: number }[];
      }

      // Objet mapping { "timestamp": [value] }
      if (homeBlock && typeof homeBlock === "object") {
        const entries = Object.entries(homeBlock).filter(([k]) => /^\d+$/.test(String(k)));
        if (entries.length === 0) return [];
        const sorted = entries
          .map(([k, v]) => ({ ts: Number(k), raw: v }))
          .sort((a, b) => a.ts - b.ts);
        return sorted
          .map(({ ts, raw }) => {
            let val: any = raw;
            if (Array.isArray(val)) val = val[0];
            val = Number(val);
            if (Number.isNaN(val)) return null;
            return { ts, value: val };
          })
          .filter(Boolean) as { ts: number; value: number }[];
      }

      return [];
    };

    const raw = collectRawPoints();

    // Resampling: jour → toutes les heures; semaine → toutes les heures sur 7 jours
    if (scaleForFallback === "1hour") {
      const startSec =
        range?.startSec ??
        Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 0, 0, 0).getTime() / 1000);
      const endSec = range?.endSec ?? (startSec + 24 * 3600);
      const hoursCount = Math.max(1, Math.floor((endSec - startSec) / 3600)); // 24 pour un jour, 168 pour une semaine
      const points: { ts: number; label: string; value: number | null }[] = [];
      for (let h = 0; h < hoursCount; h++) {
        const ts = startSec + h * 3600;
        // Tolérance 30 min autour de l'heure cible
        const p = raw.find((r) => Math.abs(r.ts - ts) < 1800);
        points.push({
          ts,
          label: new Date(ts * 1000).toLocaleString(undefined, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
          value: p ? p.value : null,
        });
      }
      // Si une seule mesure sur l'intervalle, dupliquer pour visibilité
      const countVals = points.filter((p) => typeof p.value === "number").length;
      if (countVals === 1 && points.length > 1) {
        const idx = points.findIndex((p) => typeof p.value === "number");
        if (idx >= 0 && idx + 1 < points.length) points[idx + 1].value = points[idx].value as number;
      }
      return points;
    }

    // Par défaut: labels complets
    return raw.map(({ ts, value }) => ({
      ts,
      label: new Date(ts * 1000).toLocaleString(),
      value,
    }));
  }

  const LS_KEY = "netatmo_selection_v1";

  const persistSelection = () => {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          homeId,
          moduleId: selectedModuleId,
          bridgeId: selectedBridgeId,
          scale: selectedScale,
          types: selectedTypes,
          roomId: selectedRoomId, // NEW: mémoriser la pièce
        })
      );
    } catch {}
  };

  const restoreSelection = () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setHomeId(parsed.homeId ?? null);
        setSelectedModuleId(parsed.moduleId ?? null);
        setSelectedBridgeId(parsed.bridgeId ?? null);
        setSelectedScale(parsed.scale ?? "1day");
        setSelectedTypes(parsed.types ?? "sum_boiler_on");
        setSelectedRoomId(parsed.roomId ?? null); // NEW: restaurer la pièce
      }
    } catch {}
  };

  const checkTokens = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user?.id) {
      toast.error("Veuillez vous connecter.");
      setHasTokens(false);
      return;
    }
    const { data } = await supabase.from("netatmo_tokens").select("user_id").limit(1);
    if (data && data.length > 0) {
      setHasTokens(true);
    } else {
      setHasTokens(false);
    }
  };

  const loadHomesData = async () => {
    setLoading(true);
    const { error, data } = await supabase.functions.invoke("netatmo-proxy", { body: { endpoint: "homesdata" } });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Erreur de récupération des thermostats (homesdata).");
      return;
    }
    setHomesData(data);
    const home = data?.body?.homes?.[0] ?? null;
    const id = home?.id ?? null;
    setHomeId(id);

    if (home) {
      const firstTherm = (home.modules || []).find((m: any) => m.type === "NATherm1");
      if (firstTherm) {
        setSelectedModuleId(firstTherm.id);
        setSelectedBridgeId(firstTherm.bridge);
      }
      const firstRoom = (home.rooms || [])[0];
      if (firstRoom) setSelectedRoomId(firstRoom.id);
    }
    persistSelection();
  };

  // Auto-load room charts (1 day + 1 week) when homeId and selectedRoomId are ready
  async function loadRoomCharts() {
    if (!homeId || !selectedRoomId) return;

    // Intervalle exact (locale)
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);

    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0);
    const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);

    const dayBegin = Math.floor(dayStart.getTime() / 1000);
    const dayEndSec = Math.floor(dayEnd.getTime() / 1000);
    const weekBegin = Math.floor(weekStart.getTime() / 1000);
    const weekEndSec = Math.floor(weekEnd.getTime() / 1000);

    setLoading(true);
    const [dayRes, weekRes] = await Promise.all([
      supabase.functions.invoke("netatmo-proxy", {
        body: {
          endpoint: "getroommeasure",
          home_id: homeId,
          room_id: selectedRoomId,
          scale: "1hour",
          type: "temperature",
          date_begin: dayBegin,
          date_end: dayEndSec,
          real_time: true,
          optimize: false,
        },
      }),
      supabase.functions.invoke("netatmo-proxy", {
        body: {
          endpoint: "getroommeasure",
          home_id: homeId,
          room_id: selectedRoomId,
          scale: "1hour", // CHANGED: horaire sur toute la semaine
          type: "temperature",
          date_begin: weekBegin,
          date_end: weekEndSec,
          real_time: true,
          optimize: false,
        },
      }),
    ]);
    setLoading(false);

    if (dayRes.error) {
      toast.error(dayRes.error.message || "Erreur historique (jour).");
      setDayChartData([]);
      setDayRaw(dayRes.error);
    } else {
      setDayRaw(dayRes.data);
      setDayChartData(buildChartPoints(dayRes.data, "1hour", { startSec: dayBegin, endSec: dayEndSec }));
    }

    if (weekRes.error) {
      toast.error(weekRes.error.message || "Erreur historique (semaine).");
      setWeekChartData([]);
      setWeekRaw(weekRes.error);
    } else {
      setWeekRaw(weekRes.data);
      setWeekChartData(buildChartPoints(weekRes.data, "1hour", { startSec: weekBegin, endSec: weekEndSec }));
    }
  }

  // Charger les logs quand les charts sont prêts
  React.useEffect(() => {
    if (homeId && selectedRoomId) {
      loadLogs();
    }
  }, [homeId, selectedRoomId]);

  const loadLogs = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return;
    const { data } = await supabase
      .from("netatmo_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    setLogs(data || []);
  };

  // Trigger initial: restore selection and check tokens ONCE
  React.useEffect(() => {
    restoreSelection();
    checkTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When tokens are known, load homes data
  React.useEffect(() => {
    if (hasTokens) {
      loadHomesData();
    }
  }, [hasTokens]);

  // Auto-load status + charts when homeId/room ready
  React.useEffect(() => {
    if (homeId) {
      // Charger le statut en direct automatiquement
      loadHomestatus();
    }
    if (homeId && selectedRoomId) {
      loadRoomCharts();
      loadLogs();
    }
  }, [homeId, selectedRoomId]);

  const loadHomestatus = async () => {
    if (!homeId) {
      toast.error("home_id introuvable.");
      return;
    }
    setLoading(true);
    const { error, data } = await supabase.functions.invoke("netatmo-proxy", {
      body: { endpoint: "homestatus", home_id: homeId },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Erreur de récupération du statut (homestatus).");
      return;
    }
    setHomeStatus(data);
    persistSelection();
  };

  const loadBoilerHistory = async () => {
    if (!selectedBridgeId || !selectedModuleId) {
      toast.error("Sélectionnez un thermostat.");
      return;
    }
    setLoading(true);
    const { error, data } = await supabase.functions.invoke("netatmo-proxy", {
      body: {
        endpoint: "getmeasure",
        device_id: selectedBridgeId,
        module_id: selectedModuleId,
        scale: selectedScale,
        type: selectedTypes,
        optimize: true,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Erreur de récupération de l'historique chaudière.");
      return;
    }
    setBoilerHistory(data);
    persistSelection();
  };

  // NEW: load room history via getroommeasure
  const loadRoomMeasure = async () => {
    if (!homeId || !selectedRoomId) {
      toast.error("Sélectionnez une maison et une pièce.");
      return;
    }
    setLoading(true);
    const { error, data } = await supabase.functions.invoke("netatmo-proxy", {
      body: {
        endpoint: "getroommeasure",
        home_id: homeId,
        room_id: selectedRoomId,
        scale: roomHistoryScale,
        type: roomHistoryType,
        optimize: true,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Erreur de récupération de l'historique de pièce.");
      return;
    }
    setRoomHistory(data);

    // Build chart data from response
    const beg = data?.body?.home?.beg_time;
    const step = data?.body?.home?.step_time;
    const values = data?.body?.home?.values;
    if (typeof beg === "number" && typeof step === "number" && Array.isArray(values)) {
      const points: { ts: number; label: string; value: number }[] = values.map((item: any, idx: number) => {
        let val: number;
        if (Array.isArray(item?.value)) {
          val = Number(item.value[0]);
        } else {
          val = Number(item?.value);
        }
        const ts = beg + idx * step;
        return { ts, label: new Date(ts * 1000).toLocaleString(), value: val };
      }).filter((p) => !Number.isNaN(p.value));
      setRoomChartData(points);
    } else {
      setRoomChartData([]);
    }
  };

  const setRoomThermPoint = async (opts: { roomId: string; mode: "manual" | "max" | "home"; temp?: number; minutes?: number }) => {
    if (!homeId) {
      toast.error("home_id introuvable.");
      return;
    }
    const payload: any = {
      endpoint: "setroomthermpoint",
      home_id: homeId,
      room_id: opts.roomId,
      mode: opts.mode,
    };
    if (opts.mode === "manual") payload.temp = opts.temp;
    if (opts.mode !== "home") payload.endtime = computeEndtime(opts.minutes ?? 60);

    const { error } = await supabase.functions.invoke("netatmo-proxy", { body: payload });
    if (error) {
      toast.error(error.message || "Échec de la mise à jour du thermostat.");
      return;
    }
    toast.success("Thermostat mis à jour.");
    loadHomestatus();
  };

  const applyQuickSetpoint = async () => {
    if (!homeId || !selectedRoomId) {
      toast.error("Sélectionnez une maison et une pièce.");
      return;
    }
    if (quickMode === "manual" && (typeof quickTemp !== "number" || Number.isNaN(quickTemp))) {
      toast.error("Température invalide.");
      return;
    }
    await setRoomThermPoint({
      roomId: selectedRoomId,
      mode: quickMode,
      temp: quickMode === "manual" ? quickTemp : undefined,
      minutes: quickMode !== "home" ? quickMinutes : undefined,
    });
  };

  React.useEffect(() => {
    restoreSelection();
    checkTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (hasTokens === null) {
    return (
      <MainLayout>
        <section className="container mx-auto py-10 md:py-16">
          <div className="max-w-2xl mx-auto">
            <Card><CardContent className="p-6">Chargement…</CardContent></Card>
          </div>
        </section>
      </MainLayout>
    );
  }

  if (!hasTokens) {
    return (
      <MainLayout>
        <section className="container mx-auto py-10 md:py-16">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary">Intégration</Badge>
              <Badge variant="outline">Netatmo</Badge>
            </div>
            <Card className="shadow-sm">
              <CardHeader><CardTitle>Connecter Netatmo</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTitle>Autorisation requise</AlertTitle>
                  <AlertDescription>Connectez une fois votre compte Netatmo pour activer l'accès aux thermostats.</AlertDescription>
                </Alert>
                <Button onClick={() => navigate("/integrations/netatmo")}>
                  Connecter Netatmo
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </MainLayout>
    );
  }

  const home = homesData?.body?.homes?.[0];
  const schedule = home ? (home.schedules || []).find((s: any) => s.selected) || home.schedules?.[0] : null;
  const relays = home ? (home.modules || []).filter((m: any) => m.type === "NAPlug") : [];
  const therms = home ? (home.modules || []).filter((m: any) => m.type === "NATherm1") : [];

  return (
    <MainLayout>
      <section className="container mx-auto py-10 md:py-16 relative">
        {/* HERO background */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-600/15 via-sky-500/10 to-transparent" />

        <div className="max-w-5xl mx-auto">
          {/* Header ThermoBnB */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="ThermoBnB" className="h-8 w-8 rounded-md shadow-sm" />
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">ThermoBnB</h1>
                <p className="text-sm text-muted-foreground">Suivi simple et en direct de vos thermostats Netatmo</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <span className="text-xs font-medium">En direct</span>
            </div>
          </div>

          {/* Barre d'actions rapides */}
          {home && (
            <Card className="mb-6 shadow-sm">
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <CardTitle>Actions rapides</CardTitle>
                <div className="w-full md:w-auto flex flex-col md:flex-row md:items-center gap-3">
                  {/* Pièce */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Pièce</span>
                    <Select value={selectedRoomId ?? ""} onValueChange={(v) => setSelectedRoomId(v)}>
                      <SelectTrigger className="w-40"><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent>
                        {(home.rooms || []).map((r: any) => (
                          <SelectItem key={r.id} value={r.id}>{r.name || r.id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Mode */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Mode</span>
                    <Select value={quickMode} onValueChange={(v) => setQuickMode(v as any)}>
                      <SelectTrigger className="w-32"><SelectValue placeholder="Mode" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="max">Max</SelectItem>
                        <SelectItem value="home">Home</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Température (manual) */}
                  {quickMode === "manual" && (
                    <div className="flex-1 min-w-[220px]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Température</span>
                        <span className="text-xs font-medium">{quickTemp.toFixed(1)}°C</span>
                      </div>
                      <Slider value={[quickTemp]} min={7} max={30} step={0.5} onValueChange={(vals) => setQuickTemp(vals[0] as number)} className="mt-1" />
                    </div>
                  )}
                  {/* Durée (manual/max) */}
                  {quickMode !== "home" && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Durée</span>
                      <Input type="number" min={5} max={360} step={5} value={quickMinutes} onChange={(e) => setQuickMinutes(Number(e.target.value))} className="w-24" />
                      <span className="text-xs text-muted-foreground">min</span>
                    </div>
                  )}
                  {/* Appliquer */}
                  <Button variant="secondary" size="sm" onClick={applyQuickSetpoint} disabled={!homeId || !selectedRoomId} className="md:ml-2">
                    Appliquer
                  </Button>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* KPI simplifiés */}
          {home && (
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              {(() => {
                const roomsLive = homeStatus?.body?.home?.rooms || homeStatus?.body?.rooms || [];
                const activeRoom = roomsLive.find((r: any) => r.id === selectedRoomId) || roomsLive[0];
                const currentTemp = typeof activeRoom?.therm_measured_temperature === "number" ? activeRoom.therm_measured_temperature : null;
                const currentSetpoint = typeof activeRoom?.therm_setpoint_temperature === "number" ? activeRoom.therm_setpoint_temperature : null;
                const lastRefreshLabel = new Date().toLocaleTimeString();
                return (
                  <>
                    <Card className="shadow-sm">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center"><Thermometer className="h-5 w-5" /></div>
                        <div>
                          <p className="text-xs text-muted-foreground">Température</p>
                          <p className="text-lg font-semibold">{currentTemp !== null ? `${currentTemp.toFixed(1)}°C` : "n/a"}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center"><Gauge className="h-5 w-5" /></div>
                        <div>
                          <p className="text-xs text-muted-foreground">Consigne</p>
                          <p className="text-lg font-semibold">{currentSetpoint !== null ? `${currentSetpoint.toFixed(1)}°C` : "n/a"}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Dernière mise à jour</p>
                        <p className="text-lg font-semibold">{lastRefreshLabel}</p>
                        <div className="mt-2"><Button variant="secondary" size="sm" onClick={loadHomestatus} disabled={loading}>{loading ? "…" : "Actualiser"}</Button></div>
                      </CardContent>
                    </Card>
                  </>
                );
              })()}
            </div>
          )}

          {/* Graphiques (jour/semaine) */}
          {home && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Quotidien */}
              <Card>
                <CardHeader><CardTitle>Quotidien (Heure par heure)</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dayChartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="dayGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.35} />
                            <stop offset="70%" stopColor="#1d4ed8" stopOpacity={0.1} />
                            <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" opacity={0.5} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} minTickGap={18} />
                        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v: number) => `${v.toFixed(1)}°C`} domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                        <Tooltip wrapperStyle={{ outline: "none" }} contentStyle={{ background: "rgba(17,24,39,0.92)", border: "1px solid #374151", borderRadius: 10 }} labelStyle={{ color: "#e5e7eb", fontWeight: 600 }} itemStyle={{ color: "#e5e7eb" }} formatter={(val: any) => [`${Number(val).toFixed(1)}°C`, "Température"]} />
                        <Area name="Température" type="monotone" dataKey="value" stroke="#1d4ed8" fill="url(#dayGrad)" strokeWidth={2.5} connectNulls animationDuration={450} />
                        <Line type="monotone" dataKey="value" stroke="#1d4ed8" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 3, stroke: "#1d4ed8", fill: "#fff" }} connectNulls strokeLinecap="round" strokeLinejoin="round" animationDuration={450} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  {dayChartData.length === 0 && <p className="text-xs text-muted-foreground mt-2">Aucune donnée disponible pour ce jour.</p>}
                </CardContent>
              </Card>

              {/* Hebdomadaire */}
              <Card>
                <CardHeader><CardTitle>Hebdomadaire (Heure par heure)</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weekChartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="weekGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                            <stop offset="70%" stopColor="#10b981" stopOpacity={0.1} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" opacity={0.5} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} minTickGap={18} />
                        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v: number) => `${v.toFixed(1)}°C`} domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                        <Tooltip wrapperStyle={{ outline: "none" }} contentStyle={{ background: "rgba(17,24,39,0.92)", border: "1px solid #374151", borderRadius: 10 }} labelStyle={{ color: "#e5e7eb", fontWeight: 600 }} itemStyle={{ color: "#e5e7eb" }} formatter={(val: any) => [`${Number(val).toFixed(1)}°C`, "Température"]} />
                        <Area name="Température" type="monotone" dataKey="value" stroke="#10b981" fill="url(#weekGrad)" strokeWidth={2.5} connectNulls animationDuration={450} />
                        <Line name="Température" type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 2, stroke: "#10b981", fill: "#fff" }} connectNulls strokeLinecap="round" strokeLinejoin="round" animationDuration={300} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  {weekChartData.length === 0 && <p className="text-xs text-muted-foreground mt-2">Aucune donnée disponible pour cette semaine.</p>}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Diagnostics (optionnel, replié) */}
          {/* Vous pouvez garder les logs dans un accordéon si nécessaire, sinon retirez complètement */}
        </div>
      </section>
    </MainLayout>
  );
};

export default NetatmoDashboardPage;