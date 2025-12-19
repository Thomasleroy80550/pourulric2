"use client";

import React from "react";
import MainLayout from "@/components/MainLayout";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// UI components (shadcn)
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// Charts
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";

// API
import { fetchKrossbookingReservations } from "@/lib/krossbooking";

// Icons
import { Thermometer, Flame, Home as HomeIcon, Calendar as CalendarIcon, Clock, Settings as SettingsIcon, ListChecks, Save } from "lucide-react";

function computeEndtime(minutes: number): number {
  const nowMs = Date.now();
  const endMs = nowMs + Math.max(1, minutes) * 60_000;
  return Math.floor(endMs / 1000);
}

// Robust chart builder
function buildChartPoints(data: any, scaleForFallback?: string, range?: { startSec?: number; endSec?: number }) {
  const mapStep: Record<string, number> = {
    "30min": 1800,
    "1hour": 3600,
    "3hours": 10800,
    "1day": 86400,
    "1week": 604800,
    "1month": 2592000,
  };
  const homeBlock = data?.body?.home ?? data?.body;

  const collectRawPoints = (): { ts: number; value: number }[] => {
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
    if (homeBlock && typeof homeBlock === "object") {
      const entries = Object.entries(homeBlock).filter(([k]) => /^\d+$/.test(String(k)));
      if (entries.length === 0) return [];
      const sorted = entries.map(([k, v]) => ({ ts: Number(k), raw: v })).sort((a, b) => a.ts - b.ts);
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

  if (scaleForFallback === "1hour") {
    const startSec =
      range?.startSec ??
      Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 0, 0, 0).getTime() / 1000);
    const endSec = range?.endSec ?? startSec + 24 * 3600;
    const hoursCount = Math.max(1, Math.floor((endSec - startSec) / 3600));
    const points: { ts: number; label: string; value: number | null }[] = [];
    for (let h = 0; h < hoursCount; h++) {
      const ts = startSec + h * 3600;
      const p = raw.find((r) => Math.abs(r.ts - ts) < 1800);
      points.push({
        ts,
        label: new Date(ts * 1000).toLocaleString(undefined, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
        value: p ? p.value : null,
      });
    }
    const countVals = points.filter((p) => typeof p.value === "number").length;
    if (countVals === 1 && points.length > 1) {
      const idx = points.findIndex((p) => typeof p.value === "number");
      if (idx >= 0 && idx + 1 < points.length) points[idx + 1].value = points[idx].value as number;
    }
    return points;
  }

  return raw.map(({ ts, value }) => ({ ts, label: new Date(ts * 1000).toLocaleString(), value }));
}

const LS_KEY = "netatmo_selection_v1";

const NetatmoDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // Connexion & maison
  const [hasTokens, setHasTokens] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(false);

  const [homesData, setHomesData] = React.useState<any | null>(null);
  const [homeId, setHomeId] = React.useState<string | null>(null);
  const [homeStatus, setHomeStatus] = React.useState<any | null>(null);
  const home = homesData?.body?.homes?.[0] ?? null;

  // Thermostat & pièce
  const [selectedModuleId, setSelectedModuleId] = React.useState<string | null>(null);
  const [selectedBridgeId, setSelectedBridgeId] = React.useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = React.useState<string | null>(null);

  // Quick setpoint
  const [quickMode, setQuickMode] = React.useState<"manual" | "max" | "home">("manual");
  const [quickTemp, setQuickTemp] = React.useState<number>(19);
  const [quickMinutes, setQuickMinutes] = React.useState<number>(60);

  // Scénario global (auto-sauvegarde)
  const [scenarioMode, setScenarioMode] = React.useState<"relative" | "absolute">("relative");
  const [scenarioMinutes, setScenarioMinutes] = React.useState<number>(240);
  const [scenarioHeatStart, setScenarioHeatStart] = React.useState<string>("");
  const [scenarioArrivalTemp, setScenarioArrivalTemp] = React.useState<number>(20);
  // CHANGED: départ par défaut à 10:00 au lieu de 11:00
  const [scenarioStopTime, setScenarioStopTime] = React.useState<string>("10:00");
  const [scenarioAfterDepartureTemp, setScenarioAfterDepartureTemp] = React.useState<number>(16);
  const scenarioSaveTimer = React.useRef<number | null>(null);
  // NEW: heure d'arrivée de base (ex: 15:00)
  const [scenarioArrivalTime, setScenarioArrivalTime] = React.useState<string>("15:00");

  // NEW: aperçu de l'heure de démarrage du préchauffage
  const preheatStartPreview = React.useMemo(() => {
    const today = new Date();
    const [ah, am] = (scenarioArrivalTime || "15:00").split(":").map((n) => Number(n));
    const arrivalToday = new Date(today);
    arrivalToday.setHours(ah || 15, am || 0, 0, 0);

    if (scenarioMode === "absolute" && scenarioHeatStart) {
      const [hh, mm] = scenarioHeatStart.split(":").map((n) => Number(n));
      const absStart = new Date(arrivalToday);
      absStart.setHours(hh || 0, mm || 0, 0, 0);
      return absStart.toLocaleString();
    }

    const relStart = new Date(arrivalToday.getTime() - Math.max(5, scenarioMinutes) * 60 * 1000);
    return relStart.toLocaleString();
  }, [scenarioMode, scenarioMinutes, scenarioHeatStart, scenarioArrivalTime]);

  // Logs
  const [logs, setLogs] = React.useState<any[]>([]);

  // Charts
  const [dayChartData, setDayChartData] = React.useState<{ ts: number; label: string; value: number | null }[]>([]);
  const [weekChartData, setWeekChartData] = React.useState<{ ts: number; label: string; value: number | null }[]>([]);

  // Logements & réservations
  const [userRooms, setUserRooms] = React.useState<{ id: string; room_name: string }[]>([]);
  const [selectedUserRoomId, setSelectedUserRoomId] = React.useState<string | null>(null);
  const [upcomingReservations, setUpcomingReservations] = React.useState<Array<{
    id: string;
    guest_name: string;
    property_name: string;
    krossbooking_room_id?: string;
    check_in_date: string;
    check_out_date: string;
    cod_channel?: string;
  }>>([]);

  // Schedules (cron)
  const [schedules, setSchedules] = React.useState<any[]>([]);

  // Scheduler stats & auto-run
  const [schedulerStats, setSchedulerStats] = React.useState<{ pendingNow: number; nextStart: string | null }>({ pendingNow: 0, nextStart: null });
  const [autoRunEnabled, setAutoRunEnabled] = React.useState(false);

  // Edition (modifier/supprimer)
  const [editingSchedule, setEditingSchedule] = React.useState<any | null>(null);
  const [editType, setEditType] = React.useState<"heat" | "stop">("heat");
  const [editTemp, setEditTemp] = React.useState<number>(20);
  const [editStartTime, setEditStartTime] = React.useState<string>("");
  const [editEndTime, setEditEndTime] = React.useState<string>("");

  // Mode test avancé
  const [testPropertyName, setTestPropertyName] = React.useState<string>("");
  const [testPreheatMinutes, setTestPreheatMinutes] = React.useState<number>(60);
  const [testArrivalAt, setTestArrivalAt] = React.useState<string>("");
  const [testDepartureAt, setTestDepartureAt] = React.useState<string>("");
  const [testArrivalTempOverride, setTestArrivalTempOverride] = React.useState<number>(20);
  const [testEcoTempOverride, setTestEcoTempOverride] = React.useState<number>(16);

  // Persist/restore selection
  const persistSelection = () => {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          homeId,
          moduleId: selectedModuleId,
          bridgeId: selectedBridgeId,
          roomId: selectedRoomId,
          userRoomId: selectedUserRoomId,
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
        setSelectedRoomId(parsed.roomId ?? null);
        setSelectedUserRoomId(parsed.userRoomId ?? null);
      }
    } catch {}
  };

  // NEW: persistance locale du scénario (inclut heure d'arrivée de base)
  const SCENARIO_LS_KEY = "netatmo_scenario_v1";
  function persistScenarioLocal() {
    try {
      localStorage.setItem(
        SCENARIO_LS_KEY,
        JSON.stringify({
          scenarioMode,
          scenarioMinutes,
          scenarioHeatStart,
          scenarioArrivalTemp,
          scenarioStopTime,
          scenarioAfterDepartureTemp,
          scenarioArrivalTime,
        })
      );
    } catch {}
  }
  function restoreScenarioLocal() {
    try {
      const raw = localStorage.getItem(SCENARIO_LS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.scenarioMode) setScenarioMode(s.scenarioMode);
      if (typeof s.scenarioMinutes === "number") setScenarioMinutes(s.scenarioMinutes);
      if (typeof s.scenarioArrivalTemp === "number") setScenarioArrivalTemp(s.scenarioArrivalTemp);
      if (typeof s.scenarioAfterDepartureTemp === "number") setScenarioAfterDepartureTemp(s.scenarioAfterDepartureTemp);
      if (typeof s.scenarioHeatStart === "string") setScenarioHeatStart(s.scenarioHeatStart);
      if (typeof s.scenarioStopTime === "string") setScenarioStopTime(s.scenarioStopTime);
      if (typeof s.scenarioArrivalTime === "string") setScenarioArrivalTime(s.scenarioArrivalTime);
    } catch {}
  }

  // Auto-save scenario (debounced)
  function queueSaveScenario() {
    if (scenarioSaveTimer.current) clearTimeout(scenarioSaveTimer.current);
    scenarioSaveTimer.current = window.setTimeout(async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return;
      const payload: any = {
        user_id: uid,
        arrival_preheat_mode: scenarioMode,
        arrival_preheat_minutes: scenarioMinutes,
        heat_start_time: scenarioHeatStart,
        arrival_temp: scenarioArrivalTemp,
        stop_time: scenarioStopTime,
        updated_at: new Date().toISOString(),
      };
      await supabase.from("thermostat_scenarios").upsert(payload, { onConflict: "user_id" });
      // NEW: aussi persister en local
      persistScenarioLocal();
    }, 600);
  }

  // NEW: bouton de sauvegarde explicite
  async function saveScenarioImmediate() {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) { toast.error("Non authentifié."); return; }
    const payload: any = {
      user_id: uid,
      arrival_preheat_mode: scenarioMode,
      arrival_preheat_minutes: scenarioMinutes,
      heat_start_time: scenarioHeatStart,
      arrival_temp: scenarioArrivalTemp,
      stop_time: scenarioStopTime,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("thermostat_scenarios").upsert(payload, { onConflict: "user_id" });
    if (error) { toast.error(error.message || "Erreur sauvegarde scénario"); return; }
    persistScenarioLocal();
    toast.success("Scénario enregistré.");
  }

  // Initial scenario load
  async function loadScenario() {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return;
    const { data } = await supabase
      .from("thermostat_scenarios")
      .select("arrival_preheat_mode, arrival_preheat_minutes, heat_start_time, arrival_temp, stop_time")
      .eq("user_id", uid)
      .limit(1);
    const s = data?.[0];
    if (s) {
      setScenarioMode(s.arrival_preheat_mode === "absolute" ? "absolute" : "relative");
      setScenarioMinutes(typeof s.arrival_preheat_minutes === "number" ? s.arrival_preheat_minutes : 240);
      setScenarioHeatStart(s.heat_start_time || "");
      setScenarioArrivalTemp(typeof s.arrival_temp === "number" ? s.arrival_temp : 20);
      setScenarioStopTime(s.stop_time || "10:00");
    }
  }

  // Tokens & homes
  const checkTokens = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user?.id) {
      toast.error("Veuillez vous connecter.");
      setHasTokens(false);
      return;
    }
    const { data } = await supabase.from("netatmo_tokens").select("user_id").limit(1);
    setHasTokens(!!(data && data.length > 0));
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
    const homeObj = data?.body?.homes?.[0] ?? null;
    const id = homeObj?.id ?? null;
    setHomeId(id);
    if (homeObj) {
      const firstTherm = (homeObj.modules || []).find((m: any) => m.type === "NATherm1");
      if (firstTherm) {
        setSelectedModuleId(firstTherm.id);
        setSelectedBridgeId(firstTherm.bridge);
      }
      const firstRoom = (homeObj.rooms || [])[0];
      if (firstRoom) setSelectedRoomId(firstRoom.id);
    }
    persistSelection();
  };
  const loadHomestatus = async () => {
    if (!homeId) {
      toast.error("home_id ThermoBnB introuvable.");
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

  // Rooms & reservations
  const loadUserRooms = React.useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return;
    const { data } = await supabase
      .from("user_rooms")
      .select("id, room_name, room_id")
      .eq("user_id", userId)
      .order("room_name", { ascending: true });
    setUserRooms((data || []).map((r) => ({ id: r.id, room_name: r.room_name })));
    if ((data || []).length > 0 && !selectedUserRoomId) {
      setSelectedUserRoomId(data![0].id);
    }
    try {
      const reservations = await fetchKrossbookingReservations(data || []);
      const now = new Date();
      const end = new Date(now.getTime() + 60 * 24 * 3600 * 1000);
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const upcoming = (reservations || [])
        .filter((r) => new Date(r.check_in_date) >= todayStart && new Date(r.check_in_date) <= end)
        .sort((a, b) => new Date(a.check_in_date).getTime() - new Date(b.check_in_date).getTime())
        .slice(0, 20);
      setUpcomingReservations(
        upcoming.map((r) => ({
          id: r.id,
          guest_name: r.guest_name,
          property_name: r.property_name,
          krossbooking_room_id: r.krossbooking_room_id,
          check_in_date: r.check_in_date,
          check_out_date: r.check_out_date,
          cod_channel: r.cod_channel,
        }))
      );
    } catch {
      setUpcomingReservations([]);
    }
  }, [selectedUserRoomId]);

  // Map Netatmo ↔ user room (simple defaults)
  async function loadAssignments() {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid || !homeId) return;
    const { data: therms, error } = await supabase
      .from("netatmo_thermostats")
      .select("id, user_room_id, user_id, home_id, netatmo_room_id, netatmo_room_name")
      .eq("user_id", uid)
      .eq("home_id", homeId)
      .limit(50);
    if (error) {
      toast.error(error.message || "Erreur de chargement des liens thermostats ThermoBnB.");
      return;
    }
    if (Array.isArray(therms) && therms.length > 0) {
      const first = therms.find((t: any) => t.netatmo_room_id) || therms[0];
      if (!selectedRoomId && first?.netatmo_room_id) setSelectedRoomId(String(first.netatmo_room_id));
      if (!selectedUserRoomId && first?.user_room_id) setSelectedUserRoomId(String(first.user_room_id));
      return;
    }
    const netatmoRooms = home?.rooms ?? homesData?.body?.homes?.[0]?.rooms ?? [];
    if (Array.isArray(netatmoRooms) && netatmoRooms.length && userRooms.length) {
      const match = netatmoRooms.find((r: any) => userRooms.some((ur) => ur.room_name === r.name));
      if (match) {
        setSelectedRoomId(String(match.id));
        const ur = userRooms.find((ur) => ur.room_name === match.name);
        if (ur) setSelectedUserRoomId(ur.id);
      }
    }
  }

  // Charts auto-loads
  async function loadRoomCharts() {
    if (!homeId || !selectedRoomId) return;
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
        body: { endpoint: "getroommeasure", home_id: homeId, room_id: selectedRoomId, scale: "1hour", type: "temperature", date_begin: dayBegin, date_end: dayEndSec, real_time: true, optimize: false },
      }),
      supabase.functions.invoke("netatmo-proxy", {
        body: { endpoint: "getroommeasure", home_id: homeId, room_id: selectedRoomId, scale: "1hour", type: "temperature", date_begin: weekBegin, date_end: weekEndSec, real_time: true, optimize: false },
      }),
    ]);
    setLoading(false);

    if (dayRes.error) {
      setDayChartData([]);
    } else {
      setDayChartData(buildChartPoints(dayRes.data, "1hour", { startSec: dayBegin, endSec: dayEndSec }));
    }
    if (weekRes.error) {
      setWeekChartData([]);
    } else {
      setWeekChartData(buildChartPoints(weekRes.data, "1hour", { startSec: weekBegin, endSec: weekEndSec }));
    }
  }

  // Logs
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

  // Scheduler operations
  const runSchedulerNow = async () => {
    const { error, data } = await supabase.functions.invoke("thermobnb-scheduler", { body: {} });
    if (error) {
      toast.error(error.message || "Erreur lors de l'exécution du scheduler.");
      return;
    }
    toast.success(`Scheduler exécuté (${data?.processed ?? 0}).`);
    await loadSchedules();
    await refreshSchedulerStats();
    await loadHomestatus();
  };
  async function refreshSchedulerStats() {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return;
    const nowIso = new Date().toISOString();
    const pendingNowRes = await supabase.from("thermostat_schedules").select("id").eq("user_id", userId).eq("status", "pending").lte("start_time", nowIso);
    const upcoming = await supabase.from("thermostat_schedules").select("start_time").eq("user_id", userId).eq("status", "pending").gte("start_time", nowIso).order("start_time", { ascending: true }).limit(1);
    setSchedulerStats({
      pendingNow: pendingNowRes.error ? 0 : (pendingNowRes.data?.length || 0),
      nextStart: upcoming.error ? null : (upcoming.data?.[0]?.start_time || null),
    });
  }
  React.useEffect(() => {
    let id: any;
    if (autoRunEnabled) {
      id = setInterval(() => {
        runSchedulerNow();
      }, 60_000);
    }
    return () => {
      if (id) clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRunEnabled]);

  // Schedules list & actions
  const loadSchedules = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) {
      setSchedules([]);
      return;
    }
    const nowIso = new Date().toISOString();
    const { data } = await supabase
      .from("thermostat_schedules")
      .select("*")
      .eq("user_id", userId)
      .gte("start_time", nowIso)
      .order("start_time", { ascending: true })
      .limit(100);
    setSchedules(data || []);
  };
  const applyScheduleNow = async (s: any) => {
    const isHeat = s.type === "heat";
    const payload: any = {
      endpoint: "setroomthermpoint",
      home_id: s.home_id,
      room_id: s.netatmo_room_id,
      mode: isHeat ? "manual" : "home",
    };
    if (isHeat) {
      payload.temp = Number(s.temp);
      payload.endtime = s.end_time ? Math.floor(new Date(s.end_time).getTime() / 1000) : Math.floor(Date.now() / 1000) + 3600;
    }
    const { error } = await supabase.functions.invoke("netatmo-proxy", { body: payload });
    if (error) {
      toast.error(error.message || "Échec de l'application de la programmation.");
      await supabase.from("thermostat_schedules").update({ status: "failed", error: error.message || "unknown error" }).eq("id", s.id);
    } else {
      toast.success("Programmation appliquée.");
      await supabase.from("thermostat_schedules").update({ status: "applied", updated_at: new Date().toISOString() }).eq("id", s.id);
      await loadHomestatus();
    }
    await loadSchedules();
    await refreshSchedulerStats();
  };
  function openEditSchedule(s: any) {
    setEditingSchedule(s);
    setEditType(s.type === "stop" ? "stop" : "heat");
    setEditTemp(typeof s.temp === "number" ? Number(s.temp) : scenarioArrivalTemp);
    setEditStartTime(new Date(s.start_time).toISOString().slice(0, 16));
    setEditEndTime(s.end_time ? new Date(s.end_time).toISOString().slice(0, 16) : "");
  }
  async function saveEditedSchedule() {
    if (!editingSchedule) return;
    const id = editingSchedule.id;
    const payload: any = {
      type: editType,
      mode: editType === "heat" ? "manual" : "home",
      temp: editType === "heat" ? Number(editTemp) : null,
      start_time: new Date(editStartTime).toISOString(),
      end_time: editType === "heat" ? (editEndTime ? new Date(editEndTime).toISOString() : null) : null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("thermostat_schedules").update(payload).eq("id", id);
    if (error) {
      toast.error(error.message || "Erreur lors de la modification.");
      return;
    }
    toast.success("Programmation mise à jour.");
    setEditingSchedule(null);
    await loadSchedules();
    await refreshSchedulerStats();
  }
  async function deleteScheduleById(s: any) {
    const ok = window.confirm("Supprimer cette programmation ?");
    if (!ok) return;
    const { error } = await supabase.from("thermostat_schedules").delete().eq("id", s.id);
    if (error) {
      toast.error(error.message || "Suppression impossible.");
      return;
    }
    toast.success("Programmation supprimée.");
    await loadSchedules();
    await refreshSchedulerStats();
  }

  // Planner bulk (depuis réservations selon scénario)
  async function generateCronSchedulesFromReservations() {
    if (!homeId) {
      toast.error("Maison Netatmo introuvable.");
      return;
    }
    if (!upcomingReservations || upcomingReservations.length === 0) {
      toast.message("Aucune réservation à venir.");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) {
      toast.error("Non authentifié.");
      return;
    }
    // CHANGED: utiliser l'heure d'arrivée de base au lieu de 15:00
    const [ARRIVAL_HOUR, ARRIVAL_MINUTE] = (scenarioArrivalTime || "15:00").split(":").map((n) => Number(n));
    const now = new Date();
    const rows: any[] = [];
    for (const resa of upcomingReservations) {
      const arrivalDay = new Date(resa.check_in_date);
      arrivalDay.setHours(ARRIVAL_HOUR || 15, ARRIVAL_MINUTE || 0, 0, 0);
      let startHeatDate: Date;
      if (scenarioMode === "absolute" && scenarioHeatStart) {
        const [hh, mm] = scenarioHeatStart.split(":").map((n) => Number(n));
        startHeatDate = new Date(arrivalDay);
        startHeatDate.setHours(hh || 0, mm || 0, 0, 0);
      } else {
        const minutes = Math.max(5, scenarioMinutes);
        startHeatDate = new Date(arrivalDay.getTime() - minutes * 60 * 1000);
      }
      if (startHeatDate.getTime() < now.getTime()) continue;
      const departureDay = new Date(resa.check_out_date);
      const [sh, sm] = (scenarioStopTime || "10:00").split(":").map((n) => Number(n));
      const ecoAt = new Date(departureDay);
      ecoAt.setHours(sh || 10, sm || 0, 0, 0);
      let targetRoomId = selectedRoomId || null;
      if (!targetRoomId) {
        const netatmoRooms = home?.rooms ?? homesData?.body?.homes?.[0]?.rooms ?? [];
        const match = netatmoRooms.find((r: any) => r?.name === resa.property_name);
        if (match) targetRoomId = String(match.id);
      }
      if (!targetRoomId) continue;
      rows.push({
        user_id: uid,
        user_room_id: selectedUserRoomId,
        home_id: homeId,
        netatmo_room_id: targetRoomId,
        module_id: selectedModuleId,
        type: "heat",
        mode: "manual",
        temp: scenarioArrivalTemp,
        start_time: startHeatDate.toISOString(),
        end_time: ecoAt.toISOString(),
        status: "pending",
      });
      rows.push({
        user_id: uid,
        user_room_id: selectedUserRoomId,
        home_id: homeId,
        netatmo_room_id: targetRoomId,
        module_id: selectedModuleId,
        type: "stop",
        mode: "home",
        temp: null,
        start_time: ecoAt.toISOString(),
        end_time: null,
        status: "pending",
      });
    }
    if (rows.length === 0) {
      toast.message("Aucune programmation à créer.");
      return;
    }
    const { error } = await supabase.from("thermostat_schedules").insert(rows);
    if (error) {
      toast.error(error.message || "Erreur lors de la création des programmations.");
      return;
    }
    toast.success(`${rows.length} programmations ajoutées.`);
    await loadSchedules();
  }

  // Par réservation (création ciblée)
  async function createSchedulesForReservation(resa: { id: string; guest_name: string; property_name: string; check_in_date: string; check_out_date: string }) {
    if (!homeId) {
      toast.error("Maison Netatmo introuvable.");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) {
      toast.error("Non authentifié.");
      return;
    }
    // CHANGED: utiliser l'heure d'arrivée de base au lieu de 15:00
    const [ARRIVAL_HOUR, ARRIVAL_MINUTE] = (scenarioArrivalTime || "15:00").split(":").map((n) => Number(n));
    const arrivalDay = new Date(resa.check_in_date);
    arrivalDay.setHours(ARRIVAL_HOUR || 15, ARRIVAL_MINUTE || 0, 0, 0);
    let startHeatDate: Date;
    if (scenarioMode === "absolute" && scenarioHeatStart) {
      const [hh, mm] = scenarioHeatStart.split(":").map((n) => Number(n));
      startHeatDate = new Date(arrivalDay);
      startHeatDate.setHours(hh || 0, mm || 0, 0, 0);
    } else {
      const minutes = Math.max(5, scenarioMinutes);
      startHeatDate = new Date(arrivalDay.getTime() - minutes * 60 * 1000);
    }
    const departureDay = new Date(resa.check_out_date);
    const [sh, sm] = (scenarioStopTime || "10:00").split(":").map((n) => Number(n));
    const ecoAt = new Date(departureDay);
    ecoAt.setHours(sh || 10, sm || 0, 0, 0);
    let targetRoomId = selectedRoomId || null;
    if (!targetRoomId) {
      const netatmoRooms = home?.rooms ?? homesData?.body?.homes?.[0]?.rooms ?? [];
      const match = netatmoRooms.find((r: any) => r?.name === resa.property_name);
      if (match) targetRoomId = String(match.id);
    }
    if (!targetRoomId) {
      toast.error("Aucune pièce Netatmo mappée pour cette réservation.");
      return;
    }
    const rows = [
      {
        user_id: uid,
        user_room_id: selectedUserRoomId,
        home_id: homeId,
        netatmo_room_id: targetRoomId,
        module_id: selectedModuleId,
        type: "heat",
        mode: "manual",
        temp: scenarioArrivalTemp,
        start_time: startHeatDate.toISOString(),
        end_time: ecoAt.toISOString(),
        status: "pending",
      },
      {
        user_id: uid,
        user_room_id: selectedUserRoomId,
        home_id: homeId,
        netatmo_room_id: targetRoomId,
        module_id: selectedModuleId,
        type: "stop",
        mode: "home",
        temp: null,
        start_time: ecoAt.toISOString(),
        end_time: null,
        status: "pending",
      },
    ];
    const { error } = await supabase.from("thermostat_schedules").insert(rows);
    if (error) {
      toast.error(error.message || "Erreur lors de la création des programmations.");
      return;
    }
    toast.success("Programmations créées pour la réservation.");
    await loadSchedules();
  }

  // Forcer consigne arrivée maintenant
  async function forceArrivalSetpoint(resa: { property_name: string; check_in_date: string; check_out_date: string }) {
    if (!homeId) {
      toast.error("Maison ThermoBnB introuvable.");
      return;
    }
    const netatmoRooms = home?.rooms ?? homesData?.body?.homes?.[0]?.rooms ?? [];
    const match = netatmoRooms.find((r: any) => r?.name === resa.property_name);
    const roomId = match ? String(match.id) : selectedRoomId || null;
    if (!roomId) {
      toast.error("Aucune pièce ThermoBnB mappée.");
      return;
    }
    const departureDay = new Date(resa.check_out_date);
    const [sh, sm] = (scenarioStopTime || "10:00").split(":").map((n) => Number(n));
    const ecoAt = new Date(departureDay);
    ecoAt.setHours(sh || 10, sm || 0, 0, 0);
    const nowSec = Math.floor(Date.now() / 1000);
    const endtimeSec = ecoAt.getTime() > Date.now() ? Math.floor(ecoAt.getTime() / 1000) : nowSec + 3 * 3600;
    const payload: any = { endpoint: "setroomthermpoint", home_id: homeId, room_id: roomId, mode: "manual", temp: scenarioArrivalTemp, endtime: endtimeSec };
    const { error } = await supabase.functions.invoke("netatmo-proxy", { body: payload });
    if (error) {
      toast.error(error.message || "Échec du forçage de la consigne ThermoBnB.");
      return;
    }
    toast.success("Consigne d'arrivée forcée (ThermoBnB).");
    await loadHomestatus();
  }

  // Mode test avancé: inputs -> 2 programmations
  async function createManualTestSchedules() {
    if (!homeId) {
      toast.error("Maison ThermoBnB introuvable.");
      return;
    }
    if (!testPropertyName || !testArrivalAt || !testDepartureAt) {
      toast.error("Renseignez la pièce, l'heure d'arrivée et l'heure de départ.");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) {
      toast.error("Non authentifié.");
      return;
    }
    const netatmoRooms = home?.rooms ?? homesData?.body?.homes?.[0]?.rooms ?? [];
    const match = netatmoRooms.find((r: any) => r?.name === testPropertyName);
    const targetRoomId = match ? String(match.id) : selectedRoomId || null;
    if (!targetRoomId) {
      toast.error("Aucune pièce ThermoBnB correspondante.");
      return;
    }
    const arrivalDT = new Date(testArrivalAt);
    const departureDT = new Date(testDepartureAt);
    if (Number.isNaN(arrivalDT.getTime()) || Number.isNaN(departureDT.getTime())) {
      toast.error("Format de date invalide.");
      return;
    }
    if (departureDT <= arrivalDT) {
      toast.error("Le départ doit être après l'arrivée.");
      return;
    }
    const startHeatDate = new Date(arrivalDT.getTime() - Math.max(5, testPreheatMinutes) * 60 * 1000);
    const rows = [
      {
        user_id: uid,
        user_room_id: selectedUserRoomId,
        home_id: homeId,
        netatmo_room_id: targetRoomId,
        module_id: selectedModuleId,
        type: "heat",
        mode: "manual",
        temp: testArrivalTempOverride,
        start_time: startHeatDate.toISOString(),
        end_time: departureDT.toISOString(),
        status: "pending",
      },
      {
        user_id: uid,
        user_room_id: selectedUserRoomId,
        home_id: homeId,
        netatmo_room_id: targetRoomId,
        module_id: selectedModuleId,
        type: "stop",
        mode: "home",
        temp: null,
        start_time: departureDT.toISOString(),
        end_time: null,
        status: "pending",
      },
    ];
    const { error } = await supabase.from("thermostat_schedules").insert(rows);
    if (error) {
      toast.error(error.message || "Erreur lors de la création des programmations (test ThermoBnB).");
      return;
    }
    toast.success("Programmations test créées (ThermoBnB).");
    await loadSchedules();
  }

  // Effects
  React.useEffect(() => { restoreSelection(); checkTokens(); restoreScenarioLocal(); loadScenario(); }, []);
  React.useEffect(() => { if (hasTokens) loadHomesData(); }, [hasTokens]);
  React.useEffect(() => { if (homeId) loadHomestatus(); }, [homeId]);
  React.useEffect(() => {
    if (homeId && selectedRoomId) {
      loadRoomCharts();
      loadLogs();
      loadSchedules();
      refreshSchedulerStats();
    }
  }, [homeId, selectedRoomId]);
  React.useEffect(() => { loadUserRooms(); }, [loadUserRooms]);
  React.useEffect(() => { if (homeId) loadAssignments(); }, [homeId]);
  React.useEffect(() => { queueSaveScenario(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [scenarioMode, scenarioMinutes, scenarioHeatStart, scenarioArrivalTemp, scenarioStopTime]);
  React.useEffect(() => {
    if (!homeStatus || !selectedRoomId || quickMode !== "manual") return;
    const rooms = homeStatus?.body?.home?.rooms || homeStatus?.body?.rooms || [];
    const activeRoom = rooms.find((r: any) => r.id === selectedRoomId) || rooms[0];
    const setpoint = typeof activeRoom?.therm_setpoint_temperature === "number" ? activeRoom.therm_setpoint_temperature : null;
    if (typeof setpoint === "number") setQuickTemp(setpoint);
  }, [homeStatus, selectedRoomId, quickMode]);

  // Garde d'accès ThermoBnB via mot de passe enregistré en local
  React.useEffect(() => {
    const allowed = localStorage.getItem("thermobnb_access_granted");
    if (!allowed) {
      navigate("/thermobnb");
    }
  }, [navigate]);

  if (hasTokens === null) {
    return (
      <MainLayout>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">ThermoBnB — Mode guidé pas-à-pas</h1>
          <p className="text-gray-600 mb-6">Veuillez vous connecter.</p>
          <Button onClick={() => navigate("/login")}>Se connecter</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">ThermoBnB — Mode guidé pas-à-pas</h1>
        <p className="text-gray-600">Suivez les étapes simples ci-dessous. Chaque étape a un bouton clair.</p>

        {/* Étape 1 — Connexion ThermoBnB */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><HomeIcon className="w-5 h-5" /> Étape 1 — Connexion ThermoBnB</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-700">Statut: {hasTokens ? <Badge>Connecté</Badge> : <Badge variant="secondary">Non connecté</Badge>}</p>
            {!hasTokens && (
              <Button onClick={() => navigate("/netatmo-connect")} className="w-full">Se connecter à ThermoBnB</Button>
            )}
            {hasTokens && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded bg-gray-50 p-3">
                  <p className="font-medium">Maison</p>
                  <p className="text-sm text-gray-700">{home?.name || "Non chargée"}</p>
                </div>
                <div className="rounded bg-gray-50 p-3">
                  <p className="font-medium">Thermostat</p>
                  <p className="text-sm text-gray-700">{selectedModuleId || "Sélectionner"}</p>
                </div>
                <div className="rounded bg-gray-50 p-3">
                  <p className="font-medium">Pièce</p>
                  <Select value={selectedRoomId ?? ""} onValueChange={(val) => setSelectedRoomId(val)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choisir une pièce" />
                    </SelectTrigger>
                    <SelectContent>
                      {(home?.rooms || []).map((r: any) => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Étape 2 — Scénario global (simple) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><SettingsIcon className="w-5 h-5" /> Étape 2 — Mon scénario (ThermoBnB)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Mode de préchauffage</label>
              <RadioGroup value={scenarioMode} onValueChange={(val) => setScenarioMode(val as "relative" | "absolute")} className="mt-1 flex gap-6">
                <div className="flex items-center space-x-2"><RadioGroupItem value="relative" id="sc-rel" /><label htmlFor="sc-rel">Relatif</label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="absolute" id="sc-abs" /><label htmlFor="sc-abs">Heure précise</label></div>
              </RadioGroup>
            </div>

            {/* NEW: Heure d'arrivée de base */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Heure d'arrivée de base</label>
                <Input type="time" value={scenarioArrivalTime} onChange={(e) => setScenarioArrivalTime(e.target.value)} className="mt-1" />
                <p className="mt-1 text-xs text-gray-500">Exemple: 15:00 (utilisée pour calculer le préchauffage si l'heure d'arrivée exacte n'est pas fournie).</p>
              </div>
              <div>
                <label className="text-sm font-medium">Heure éco (départ)</label>
                <Input type="time" value={scenarioStopTime} onChange={(e) => setScenarioStopTime(e.target.value)} className="mt-1" />
              </div>
              <div>
                <div className="flex items-center justify-between"><label className="text-sm font-medium">Température éco</label><span className="text-sm text-gray-600">{scenarioAfterDepartureTemp}°C</span></div>
                <Slider value={[scenarioAfterDepartureTemp]} onValueChange={(vals) => setScenarioAfterDepartureTemp(vals[0])} min={10} max={22} step={0.5} className="mt-2" />
              </div>
            </div>

            {scenarioMode === "relative" ? (
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Préchauffer (minutes avant arrivée)</label>
                  <span className="text-sm text-gray-600">{scenarioMinutes} min</span>
                </div>
                <Slider value={[scenarioMinutes]} onValueChange={(vals) => setScenarioMinutes(vals[0])} min={5} max={600} step={5} className="mt-2" />
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium">Heure de lancement (absolu)</label>
                <Input type="time" value={scenarioHeatStart} onChange={(e) => setScenarioHeatStart(e.target.value)} className="mt-1" />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between"><label className="text-sm font-medium">Température arrivée</label><span className="text-sm text-gray-600">{scenarioArrivalTemp}°C</span></div>
                <Slider value={[scenarioArrivalTemp]} onValueChange={(vals) => setScenarioArrivalTemp(vals[0])} min={10} max={25} step={0.5} className="mt-2" />
              </div>
              {/* NEW: aperçu du démarrage */}
              <div className="rounded bg-gray-50 p-3">
                <p className="text-sm font-medium">Préchauffage démarre à</p>
                <p className="text-sm text-gray-700">{preheatStartPreview}</p>
                <p className="text-xs text-gray-500">Calculé à partir de l'heure d'arrivée de base et du mode de préchauffage.</p>
              </div>
            </div>
            <p className="text-xs text-gray-600">Astuce: pas besoin d'enregistrer, le scénario se sauvegarde automatiquement.</p>
            {/* NEW: Bouton d'enregistrement explicite */}
            <div className="mt-2">
              <Button onClick={saveScenarioImmediate} variant="secondary" className="w-full md:w-auto">
                <Save className="w-4 h-4 mr-2" />
                Enregistrer le scénario
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Étape 3 — Réservations (créer programmations très simple) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarIcon className="w-5 h-5" /> Étape 3 — Réservations à venir (ThermoBnB)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full" onClick={() => loadUserRooms()}>Recharger les réservations</Button>
            {upcomingReservations.length === 0 ? (
              <p className="text-gray-600">Aucune réservation à venir.</p>
            ) : (
              <div className="space-y-3">
                {upcomingReservations.map((resa) => {
                  // CHANGED: Afficher les horaires de base (arrivée 15:00, départ 10:00) au lieu des timestamps bruts
                  const arrivalDisplay = new Date(resa.check_in_date);
                  const [ah, am] = (scenarioArrivalTime || "15:00").split(":").map((n) => Number(n));
                  arrivalDisplay.setHours(ah || 15, am || 0, 0, 0);

                  const departureDisplay = new Date(resa.check_out_date);
                  const [dh, dm] = (scenarioStopTime || "10:00").split(":").map((n) => Number(n));
                  departureDisplay.setHours(dh || 10, dm || 0, 0, 0);

                  return (
                    <div key={resa.id} className="rounded border p-3">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <p className="font-medium">{resa.guest_name || "Client"} — {resa.property_name}</p>
                          <p className="text-sm text-gray-600">
                            Arrivée: {arrivalDisplay.toLocaleString()} • Départ: {departureDisplay.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => createSchedulesForReservation(resa)}>Créer programmations</Button>
                          <Button size="sm" variant="outline" onClick={() => forceArrivalSetpoint(resa)}>Forcer consigne maintenant</Button>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Action simple: crée deux programmations (chauffe avant l'arrivée, éco au départ) sur ThermoBnB.</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Étape 4 — Programmations (voir / modifier / supprimer / appliquer) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListChecks className="w-5 h-5" /> Étape 4 — Mes programmations (cron) ThermoBnB</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button onClick={generateCronSchedulesFromReservations} className="w-full">Générer depuis toutes les réservations</Button>
              <Button onClick={runSchedulerNow} variant="outline" className="w-full">Lancer le scheduler</Button>
              <div className="flex items-center justify-between rounded border p-2">
                <span className="text-sm text-gray-700">Exécuter automatiquement</span>
                <Switch checked={autoRunEnabled} onCheckedChange={setAutoRunEnabled} />
              </div>
            </div>
            <div className="rounded bg-gray-50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">Programmations dues maintenant</p>
                <Badge variant={schedulerStats.pendingNow > 0 ? "default" : "secondary"}>{schedulerStats.pendingNow}</Badge>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm text-gray-700">Prochaine programmation</p>
                <span className="text-sm text-gray-600">{schedulerStats.nextStart ? new Date(schedulerStats.nextStart).toLocaleString() : "Aucune"}</span>
              </div>
            </div>
            {schedules.length === 0 ? (
              <p className="text-gray-600">Aucune programmation.</p>
            ) : (
              <div className="space-y-2">
                {schedules.map((s) => (
                  <div key={s.id} className="flex flex-col md:flex-row md:items-center md:justify-between border rounded p-2 gap-2">
                    <div>
                      <p className="font-medium">
                        {s.type === "heat" ? (s.end_time ? "Chauffer (arrivée)" : "Consigne manuelle") : "Arrêt (home)"} — {new Date(s.start_time).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        Pièce: {home?.rooms?.find((r: any) => String(r.id) === String(s.netatmo_room_id))?.name || s.netatmo_room_id}
                        {typeof s.temp === "number" ? ` • ${Number(s.temp)}°C` : ""}
                        {s.status ? ` • statut: ${s.status}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => applyScheduleNow(s)}>Appliquer maintenant</Button>
                      <Button size="sm" variant="outline" onClick={() => openEditSchedule(s)}>Modifier</Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteScheduleById(s)}>Supprimer</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Étape 5 — Test avancé (ignorer le scénario) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> Étape 5 — Test avancé (heures choisies) ThermoBnB</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Pièce Netatmo (nom)</label>
                <Input value={testPropertyName} onChange={(e) => setTestPropertyName(e.target.value)} className="mt-1" placeholder="Ex: Chambre 1" />
              </div>
              <div>
                <label className="text-sm font-medium">Préchauffage (minutes avant arrivée)</label>
                <div className="flex items-center justify-between"><span className="text-sm text-gray-600">{testPreheatMinutes} min</span></div>
                <Slider value={[testPreheatMinutes]} onValueChange={(vals) => setTestPreheatMinutes(vals[0])} min={5} max={600} step={5} className="mt-2" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Arrivée (date & heure)</label>
                <Input type="datetime-local" value={testArrivalAt} onChange={(e) => setTestArrivalAt(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Départ (date & heure)</label>
                <Input type="datetime-local" value={testDepartureAt} onChange={(e) => setTestDepartureAt(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between"><label className="text-sm font-medium">Température à l'arrivée</label><span className="text-sm text-gray-600">{testArrivalTempOverride}°C</span></div>
                <Slider value={[testArrivalTempOverride]} onValueChange={(vals) => setTestArrivalTempOverride(vals[0])} min={10} max={25} step={0.5} className="mt-2" />
              </div>
              <div>
                <div className="flex items-center justify-between"><label className="text-sm font-medium">Température éco au départ</label><span className="text-sm text-gray-600">{testEcoTempOverride}°C</span></div>
                <Slider value={[testEcoTempOverride]} onValueChange={(vals) => setTestEcoTempOverride(vals[0])} min={10} max={22} step={0.5} className="mt-2" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button className="w-full" onClick={createManualTestSchedules}>Créer programmations test</Button>
              <Button className="w-full" variant="outline" onClick={runSchedulerNow}>Lancer le scheduler</Button>
            </div>
          </CardContent>
        </Card>

        {/* Étape 6 — Mes graphiques */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Thermometer className="w-5 h-5" /> Étape 6 — Graphiques de température (ThermoBnB)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Aujourd'hui</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dayChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#2563eb" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">7 derniers jours</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weekChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#10b981" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Étape 7 — Logs utiles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Flame className="w-5 h-5" /> Étape 7 — Derniers logs (ThermoBnB)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">Entrées: {logs.length}</p>
          </CardContent>
        </Card>

        {/* Dialog edit schedule */}
        <Dialog open={!!editingSchedule} onOpenChange={(open) => !open && setEditingSchedule(null)}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Modifier la programmation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={editType} onValueChange={(val) => setEditType(val as "heat" | "stop")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choisir un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="heat">Chauffer (manuel)</SelectItem>
                    <SelectItem value="stop">Arrêt (home)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-gray-500">Heat = manuel (température) • Stop = home (pas de température)</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Début</label>
                  <Input type="datetime-local" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Fin</label>
                  <Input type="datetime-local" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} className="mt-1" disabled={editType === "stop"} />
                  {editType === "stop" && <p className="mt-1 text-xs text-gray-500">Pour stop, la fin est ignorée.</p>}
                </div>
              </div>
              {editType === "heat" && (
                <div>
                  <div className="flex items-center justify-between"><label className="text-sm font-medium">Température</label><span className="text-sm text-gray-600">{editTemp}°C</span></div>
                  <Slider value={[editTemp]} onValueChange={(vals) => setEditTemp(vals[0])} min={10} max={25} step={0.5} className="mt-2" />
                </div>
              )}
            </div>
            <DialogFooter className="mt-4 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingSchedule(null)}>Annuler</Button>
              <Button onClick={saveEditedSchedule}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default NetatmoDashboardPage;