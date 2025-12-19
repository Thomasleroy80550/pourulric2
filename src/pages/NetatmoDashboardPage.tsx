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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
// NEW: import accordion for collapsible logs
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchKrossbookingReservations } from "@/lib/krossbooking";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { ResponsiveContainer as RC2 } from "recharts";
import { AreaChart, Area } from "recharts";
// NEW: icons
import { Thermometer, Gauge, Flame, Home as HomeIcon, Clock, Wifi } from "lucide-react";
import { Switch } from "@/components/ui/switch";

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

  // États pour la programmation
  const [userRooms, setUserRooms] = React.useState<{ id: string; room_name: string }[]>([]);
  const [selectedUserRoomId, setSelectedUserRoomId] = React.useState<string | null>(null);
  const [arrivalAt, setArrivalAt] = React.useState<string>("");
  const [departureAt, setDepartureAt] = React.useState<string>("");
  const [preheatMinutes, setPreheatMinutes] = React.useState<number>(90);
  const [arrivalTemp, setArrivalTemp] = React.useState<number>(20);
  // NEW: choisir le mode de lancement (relatif vs heure précise) + datetime de démarrage
  const [preheatMode, setPreheatMode] = React.useState<"relative" | "absolute">("relative");
  const [heatStartAt, setHeatStartAt] = React.useState<string>("");

  // NEW: réservations (arrivées à venir)
  const [upcomingReservations, setUpcomingReservations] = React.useState<Array<{
    id: string;
    guest_name: string;
    property_name: string;
    krossbooking_room_id?: string;
    check_in_date: string;
    check_out_date: string;
    cod_channel?: string;
  }>>([]);

  // Charger les logements de l'utilisateur
  const loadUserRooms = React.useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return;
    const { data } = await supabase
      .from("user_rooms")
      .select("id, room_name, room_id")
      .eq("user_id", userId)
      .order("room_name", { ascending: true });
    setUserRooms((data || []).map(r => ({ id: r.id, room_name: r.room_name })));
    if ((data || []).length > 0 && !selectedUserRoomId) {
      setSelectedUserRoomId(data![0].id);
    }
    // Charger les réservations pour ces logements
    try {
      const reservations = await fetchKrossbookingReservations(data || []);
      // Filtrer prochaines arrivées: aujourd'hui -> +60 jours
      const now = new Date();
      const end = new Date(now.getTime() + 60 * 24 * 3600 * 1000);
      const upcoming = (reservations || [])
        .filter(r => {
          const ci = new Date(r.check_in_date);
          return ci >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && ci <= end;
        })
        .sort((a, b) => new Date(a.check_in_date).getTime() - new Date(b.check_in_date).getTime())
        .slice(0, 20);
      setUpcomingReservations(upcoming.map(r => ({
        id: r.id,
        guest_name: r.guest_name,
        property_name: r.property_name,
        krossbooking_room_id: r.krossbooking_room_id,
        check_in_date: r.check_in_date,
        check_out_date: r.check_out_date,
        cod_channel: r.cod_channel
      })));
    } catch {
      setUpcomingReservations([]);
    }
  }, [selectedUserRoomId]);

  React.useEffect(() => {
    loadUserRooms();
  }, [loadUserRooms]);

  // Synchroniser la valeur par défaut du slider avec la consigne actuelle (si disponible)
  React.useEffect(() => {
    if (!homeStatus || !selectedRoomId || quickMode !== "manual") return;
    const rooms = homeStatus?.body?.home?.rooms || homeStatus?.body?.rooms || [];
    const activeRoom = rooms.find((r: any) => r.id === selectedRoomId) || rooms[0];
    const setpoint = typeof activeRoom?.therm_setpoint_temperature === "number"
      ? activeRoom.therm_setpoint_temperature
      : null;
    if (typeof setpoint === "number") {
      setQuickTemp(setpoint);
    }
  }, [homeStatus, selectedRoomId, quickMode]);

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

  // Enregistrer la programmation: 2 entrées (heat + stop)
  const saveSchedule = async () => {
    if (!homeId || !selectedRoomId) {
      toast.error("Maison/pièce Netatmo introuvable.");
      return;
    }
    if (!selectedUserRoomId) {
      toast.error("Choisissez un logement.");
      return;
    }
    if (!arrivalAt || !departureAt) {
      toast.error("Renseignez l'arrivée et le départ.");
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) {
      toast.error("Non authentifié.");
      return;
    }

    const arrivalSec = Math.floor(new Date(arrivalAt).getTime() / 1000);
    const departureSec = Math.floor(new Date(departureAt).getTime() / 1000);
    if (departureSec <= arrivalSec) {
      toast.error("Le départ doit être après l'arrivée.");
      return;
    }
    // NEW: calcul du démarrage de chauffe selon le mode sélectionné
    let startHeatSec: number;
    if (preheatMode === "absolute") {
      if (!heatStartAt) {
        toast.error("Choisissez l'heure de lancement de la chauffe.");
        return;
      }
      startHeatSec = Math.floor(new Date(heatStartAt).getTime() / 1000);
      if (startHeatSec >= departureSec) {
        toast.error("L'heure de lancement doit être avant l'heure de départ.");
        return;
      }
    } else {
      startHeatSec = arrivalSec - Math.max(5, preheatMinutes) * 60;
    }

    // Construire les 2 lignes
    const rows = [
      {
        user_id: userId,
        user_room_id: selectedUserRoomId,
        home_id: homeId!,
        netatmo_room_id: selectedRoomId!,
        module_id: selectedModuleId, // optionnel
        type: "heat" as const,
        mode: "manual",
        temp: arrivalTemp,
        start_time: new Date(startHeatSec * 1000).toISOString(),
        end_time: new Date(departureSec * 1000).toISOString(),
        status: "pending",
      },
      {
        user_id: userId,
        user_room_id: selectedUserRoomId,
        home_id: homeId!,
        netatmo_room_id: selectedRoomId!,
        module_id: selectedModuleId,
        type: "stop" as const,
        mode: "home",
        temp: null,
        start_time: new Date(departureSec * 1000).toISOString(),
        end_time: null,
        status: "pending",
      },
    ];

    const { error } = await supabase.from("thermostat_schedules").insert(rows);
    if (error) {
      toast.error(error.message || "Erreur d'enregistrement de la programmation.");
      return;
    }
    toast.success("Programmation enregistrée: préchauffage et arrêt au départ.");
  };

  // Lancer le scheduler maintenant
  const runSchedulerNow = async () => {
    const { error, data } = await supabase.functions.invoke("thermobnb-scheduler", { body: {} });
    if (error) {
      toast.error(error.message || "Erreur lors de l'exécution du scheduler.");
      return;
    }
    toast.success(`Scheduler exécuté (${data?.processed ?? 0} programmation(s) traitée(s)).`);
  };

  // Charger listes quand pièce changée
  const [schedules, setSchedules] = React.useState<any[]>([]);
  const loadSchedules = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) {
      setSchedules([]);
      return;
    }
    // CHANGED: récupérer toutes les programmations à venir de l'utilisateur (pas uniquement la pièce sélectionnée)
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

  React.useEffect(() => {
    if (selectedRoomId) {
      loadSchedules();
    }
  }, [selectedRoomId]);

  // Helper compte à rebours
  function timeUntil(tsIso: string) {
    const now = Date.now();
    const target = new Date(tsIso).getTime();
    const diff = target - now;
    if (diff <= 0) return "dû maintenant";
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs > 0) return `${hrs}h ${remMins}m`;
    return `${mins}m`;
  }

  // Helper: début de semaine (lundi 00:00) et m_offset en minutes
  function getWeekStart(date: Date) {
    const d = new Date(date);
    const day = d.getDay(); // 0=Dimanche, 1=Lundi...
    const diffToMonday = (day + 6) % 7; // distance vers lundi
    const monday = new Date(d);
    monday.setDate(d.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }
  function minutesOffsetFromWeekStart(target: Date) {
    const monday = getWeekStart(target);
    return Math.floor((target.getTime() - monday.getTime()) / 60000);
  }

  // NEW: scénario: degré Eco après départ
  const [scenarioAfterDepartureTemp, setScenarioAfterDepartureTemp] = React.useState<number>(16);

  // NEW: scenario state (used by saveScenario and reservations planning)
  const [scenarioMode, setScenarioMode] = React.useState<"relative" | "absolute">("relative");
  const [scenarioMinutes, setScenarioMinutes] = React.useState<number>(240);
  const [scenarioHeatStart, setScenarioHeatStart] = React.useState<string>("");
  const [scenarioArrivalTemp, setScenarioArrivalTemp] = React.useState<number>(20);
  const [scenarioStopTime, setScenarioStopTime] = React.useState<string>("11:00");

  // Helper: trouver la pièce Netatmo pour une réservation
  function findRoomIdForReservation(resa: { property_name: string }) {
    const netatmoRooms = home?.rooms ?? homesData?.body?.homes?.[0]?.rooms ?? [];
    const match = netatmoRooms.find((r: any) => r?.name === resa.property_name);
    return match ? String(match.id) : selectedRoomId || null;
  }

  // Helper: heure de préchauffage et heure ECO pour une réservation (selon scénario global)
  function getPlanTimesForReservation(resa: { check_in_date: string; check_out_date: string }) {
    const ARRIVAL_HOUR = 15;
    const ARRIVAL_MINUTE = 0;

    const arrivalDay = new Date(resa.check_in_date);
    arrivalDay.setHours(ARRIVAL_HOUR, ARRIVAL_MINUTE, 0, 0);

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
    const [sh, sm] = (scenarioStopTime || "11:00").split(":").map((n) => Number(n));
    const ecoAt = new Date(departureDay);
    ecoAt.setHours(sh || 11, sm || 0, 0, 0);

    return { startHeatDate, ecoAt };
  }

  // Load scenario from DB for current user
  async function loadScenario() {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return;

    const { data, error } = await supabase
      .from("thermostat_scenarios")
      .select("arrival_preheat_mode, arrival_preheat_minutes, heat_start_time, arrival_temp, stop_time")
      .eq("user_id", uid)
      .limit(1);

    if (error) {
      // keep defaults silently
      return;
    }

    const s = data?.[0];
    if (s) {
      setScenarioMode(s.arrival_preheat_mode === "absolute" ? "absolute" : "relative");
      setScenarioMinutes(typeof s.arrival_preheat_minutes === "number" ? s.arrival_preheat_minutes : 240);
      setScenarioHeatStart(s.heat_start_time || "");
      setScenarioArrivalTemp(typeof s.arrival_temp === "number" ? s.arrival_temp : 20);
      setScenarioStopTime(s.stop_time || "11:00");
    }
  }

  // Sauvegarde du scénario (on ne stocke pas scenarioAfterDepartureTemp en BDD pour éviter une erreur si colonne absente)
  const saveScenario = async () => {
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
      apply_to_all: true,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("thermostat_scenarios")
      .upsert(payload, { onConflict: "user_id" });
    if (error) { toast.error(error.message || "Erreur sauvegarde scénario"); return; }
    toast.success("Scénario global sauvegardé — il s'appliquera à toutes vos réservations.");
  };

  // Créer un planning hebdo Netatmo: Confort selon scénario, Eco à l'heure d'arrêt
  const createArrivalDepartureSchedule = async () => {
    if (!homeId || !selectedRoomId) {
      toast.error("Maison/pièce Netatmo introuvable.");
      return;
    }
    if (!arrivalAt || !departureAt) {
      toast.error("Renseignez l'arrivée et le départ.");
      return;
    }

    // Charger home si nécessaire
    let home = homesData?.body?.homes?.[0];
    if (!home) {
      const { error, data } = await supabase.functions.invoke("netatmo-proxy", { body: { endpoint: "homesdata", home_id: homeId } });
      if (error) {
        toast.error(error.message || "Impossible de charger les données de la maison.");
        return;
      }
      home = data?.body?.homes?.[0];
      if (!home) {
        toast.error("Maison introuvable dans homesdata.");
        return;
      }
    }

    const modules = Array.isArray(home.modules) ? home.modules : [];
    const rooms = Array.isArray(home.rooms) ? home.rooms : [];

    // Pièces thermostatées
    const thermRoomIds: string[] = modules
      .filter((m: any) => m.type === "NATherm1" && m.room_id)
      .map((m: any) => String(m.room_id));

    if (thermRoomIds.length === 0) {
      toast.error("Aucun thermostat détecté pour créer un planning.");
      return;
    }

    // Températures
    const ecoTemp = scenarioAfterDepartureTemp; // temp Eco configurable
    const nightTemp = 17;
    const confortTempSelected = arrivalTemp;
    const confortTempOthers = 19;

    // Zones requises
    const zoneEco = { id: 4, type: 5, rooms: thermRoomIds.map((rid) => ({ id: rid, therm_setpoint_temperature: ecoTemp })) };
    const zoneNight = { id: 1, type: 1, rooms: thermRoomIds.map((rid) => ({ id: rid, therm_setpoint_temperature: nightTemp })) };
    const zoneConfort = { id: 0, type: 0, rooms: thermRoomIds.map((rid) => ({ id: rid, therm_setpoint_temperature: rid === selectedRoomId ? confortTempSelected : confortTempOthers })) };

    const arrivalDate = new Date(arrivalAt);
    const departureDate = new Date(departureAt);

    // Calcul heure de lancement (scénario: relative ou absolute)
    let startHeatDate: Date;
    if (preheatMode === "absolute" && heatStartAt) {
      const [hh, mm] = heatStartAt.split(":").map((n) => Number(n));
      startHeatDate = new Date(arrivalDate);
      startHeatDate.setHours(hh || 0, mm || 0, 0, 0);
    } else {
      startHeatDate = new Date(arrivalDate.getTime() - Math.max(5, preheatMinutes) * 60 * 1000);
    }

    // Calcul heure d'arrêt Eco à scenarioStopTime
    const [sh, sm] = (scenarioStopTime || "11:00").split(":").map((n) => Number(n));
    const stopEcoDate = new Date(departureDate);
    stopEcoDate.setHours(sh || 11, sm || 0, 0, 0);

    const startOffset = minutesOffsetFromWeekStart(startHeatDate);
    const stopOffset = minutesOffsetFromWeekStart(stopEcoDate);

    // Timetable: Eco au début de semaine, Confort au startOffset, Eco à stopOffset (sauf si égal à startOffset)
    const timetable: Array<{ zone_id: number; m_offset: number }> = [
      { zone_id: 4, m_offset: 0 },
      { zone_id: 0, m_offset: startOffset },
    ];
    if (stopOffset !== startOffset) {
      timetable.push({ zone_id: 4, m_offset: stopOffset });
    }

    // 1) Créer le planning
    const createRes = await supabase.functions.invoke("netatmo-proxy", {
      body: {
        endpoint: "createnewhomeschedule",
        home_id: homeId,
        name: "ThermoBnB — Arrivée & Départ",
        hg_temp: 7,
        away_temp: ecoTemp, // temp Eco (après départ)
        zones: [zoneConfort, zoneNight, zoneEco],
        timetable,
      },
    });

    if (createRes.error) {
      toast.error(createRes.error.message || "Échec de création du planning Netatmo.");
      return;
    }

    const createdPayload = createRes.data;
    const scheduleId =
      createdPayload?.body?.schedule_id ??
      createdPayload?.schedule_id ??
      createdPayload?.body?.id ??
      createdPayload?.id ??
      null;

    // 2) Activer le planning
    if (scheduleId) {
      const switchRes = await supabase.functions.invoke("netatmo-proxy", {
        body: { endpoint: "switchhomeschedule", home_id: homeId, schedule_id: String(scheduleId) },
      });
      if (switchRes.error) {
        toast.error(switchRes.error.message || "Planning créé mais non activé.");
      } else {
        toast.success("Planning activé.");
      }
    } else {
      toast.message("Planning créé — impossible de récupérer l'ID pour l'activer automatiquement.");
    }

    // 3) Mettre en mode schedule + remettre la pièce sélectionnée en 'home'
    const modeRes = await supabase.functions.invoke("netatmo-proxy", { body: { endpoint: "setthermmode", home_id: homeId, mode: "schedule" } });
    if (modeRes.error) {
      toast.error(modeRes.error.message || "Impossible de mettre la maison en mode schedule.");
      return;
    }
    const backHomeRes = await supabase.functions.invoke("netatmo-proxy", { body: { endpoint: "setroomthermpoint", home_id: homeId, room_id: selectedRoomId!, mode: "home" } });
    if (backHomeRes.error) {
      toast.error(backHomeRes.error.message || "Planning activé, mais la pièce reste en override.");
    } else {
      toast.success("Pièce en mode 'home' — le planning s'applique.");
    }

    // Rafraîchir le statut
    await loadHomestatus();
  };

  // Créer des plannings Netatmo pour chaque réservation à venir (nom = client + séjour), avec règles de degrés & heures
  const createNetatmoSchedulesForReservations = async () => {
    if (!homeId || !homesData) {
      toast.error("Maison Netatmo introuvable.");
      return;
    }
    const homeObj = homesData?.body?.homes?.[0];
    if (!homeObj) {
      toast.error("Données Netatmo non chargées.");
      return;
    }
    const modules = Array.isArray(homeObj.modules) ? homeObj.modules : [];
    const rooms = Array.isArray(homeObj.rooms) ? homeObj.rooms : [];
    const thermRoomIds: string[] = modules.filter((m: any) => m.type === "NATherm1" && m.room_id).map((m: any) => String(m.room_id));
    if (thermRoomIds.length === 0) {
      toast.error("Aucun thermostat détecté pour créer les plannings.");
      return;
    }

    const ecoTemp = scenarioAfterDepartureTemp;
    const nightTemp = 17;
    const confortTempSelected = scenarioArrivalTemp;
    const confortTempOthers = 19;

    let created = 0;

    if (!upcomingReservations || upcomingReservations.length === 0) {
      toast.message("Aucune réservation à venir à programmer.");
      return;
    }

    for (const resa of upcomingReservations) {
      try {
        const arrivalDate = new Date(resa.check_in_date);
        const departureDate = new Date(resa.check_out_date);

        // Heure de lancement: scénario
        let startHeatDate: Date;
        if (scenarioMode === "absolute" && scenarioHeatStart) {
          const [hh, mm] = scenarioHeatStart.split(":").map((n) => Number(n));
          startHeatDate = new Date(arrivalDate);
          startHeatDate.setHours(hh || 0, mm || 0, 0, 0);
        } else {
          startHeatDate = new Date(arrivalDate.getTime() - Math.max(5, scenarioMinutes) * 60 * 1000);
        }

        // Heure d'arrêt Eco: scénarioStopTime
        const [sh, sm] = (scenarioStopTime || "11:00").split(":").map((n) => Number(n));
        const stopEcoDate = new Date(departureDate);
        stopEcoDate.setHours(sh || 11, sm || 0, 0, 0);

        const startOffset = minutesOffsetFromWeekStart(startHeatDate);
        const stopOffset = minutesOffsetFromWeekStart(stopEcoDate);

        // Choix de la pièce réservée (si trouvée), sinon confort par défaut
        const resaRoom = rooms.find((r: any) => r.name === resa.property_name);

        const zoneConfortRooms = thermRoomIds.map((rid) => ({
          id: rid,
          therm_setpoint_temperature: (resaRoom && String(resaRoom.id) === rid) ? confortTempSelected : confortTempOthers,
        }));

        const zoneConfort = { id: 0, type: 0, rooms: zoneConfortRooms };
        const zoneNight = { id: 1, type: 1, rooms: thermRoomIds.map((rid) => ({ id: rid, therm_setpoint_temperature: nightTemp })) };
        const zoneEco = { id: 4, type: 5, rooms: thermRoomIds.map((rid) => ({ id: rid, therm_setpoint_temperature: ecoTemp })) };

        // Timetable avec règle: si arrivée et départ même heure -> ne pas couper
        const timetable: Array<{ zone_id: number; m_offset: number }> = [
          { zone_id: 4, m_offset: 0 },
          { zone_id: 0, m_offset: startOffset },
        ];
        if (stopOffset !== startOffset) {
          timetable.push({ zone_id: 4, m_offset: stopOffset });
        }

        const name = `${resa.guest_name || "Client"} — ${arrivalDate.toLocaleDateString('fr-FR')} au ${departureDate.toLocaleDateString('fr-FR')}`;

        // 1) Création
        const createRes = await supabase.functions.invoke("netatmo-proxy", {
          body: {
            endpoint: "createnewhomeschedule",
            home_id: homeId,
            name,
            hg_temp: 7,
            away_temp: ecoTemp,
            zones: [zoneConfort, zoneNight, zoneEco],
            timetable,
          },
        });

        if (createRes.error) {
          toast.error(createRes.error.message || `Échec création planning pour ${resa.guest_name}`);
          continue;
        }

        const createdPayload = createRes.data;
        const scheduleId =
          createdPayload?.body?.schedule_id ??
          createdPayload?.schedule_id ??
          createdPayload?.body?.id ??
          createdPayload?.id ??
          null;

        // 2) Activation + mode schedule
        if (scheduleId) {
          const switchRes = await supabase.functions.invoke("netatmo-proxy", {
            body: { endpoint: "switchhomeschedule", home_id: homeId, schedule_id: String(scheduleId) },
          });
          if (switchRes.error) {
            toast.error(switchRes.error.message || `Planning non activé pour ${resa.guest_name}`);
            continue;
          }
        } else {
          toast.message(`Planning créé pour ${resa.guest_name} — ID introuvable pour activation.`);
        }

        const modeRes = await supabase.functions.invoke("netatmo-proxy", {
          body: { endpoint: "setthermmode", home_id: homeId, mode: "schedule" },
        });
        if (modeRes.error) {
          toast.error(modeRes.error.message || "Impossible de mettre la maison en mode schedule.");
        }

        // 3) Sortir de l'override manuel si nécessaire (pièce de la résa)
        if (resaRoom) {
          const backHomeRes = await supabase.functions.invoke("netatmo-proxy", {
            body: { endpoint: "setroomthermpoint", home_id: homeId, room_id: String(resaRoom.id), mode: "home" },
          });
          if (backHomeRes.error) {
            // non bloquant
          }
        }

        created++;
      } catch (e: any) {
        toast.error(e?.message || "Erreur pendant la création du planning.");
      }
    }

    if (created > 0) {
      toast.success(`${created} planning(s) Netatmo créés et activés.`);
      await loadHomestatus();
    } else {
      toast.message("Aucun planning créé (vérifiez les réservations et le mapping thermostat↔chambre).");
    }
  };

  // Charger les liens quand la maison est connue
  async function loadAssignments() {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid || !homeId) return;

    // Try existing assignments from netatmo_thermostats
    const { data: therms, error } = await supabase
      .from("netatmo_thermostats")
      .select("id, user_room_id, user_id, home_id, netatmo_room_id, netatmo_room_name")
      .eq("user_id", uid)
      .eq("home_id", homeId)
      .limit(50);

    if (error) {
      toast.error(error.message || "Erreur de chargement des liens thermostats.");
      return;
    }

    if (Array.isArray(therms) && therms.length > 0) {
      const first = therms.find((t: any) => t.netatmo_room_id) || therms[0];

      if (!selectedRoomId && first?.netatmo_room_id) {
        setSelectedRoomId(String(first.netatmo_room_id));
      }
      if (!selectedUserRoomId && first?.user_room_id) {
        setSelectedUserRoomId(String(first.user_room_id));
      }
      return;
    }

    // Fallback: match Netatmo room names with user_rooms.room_name
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

  // Lancer une programmation immédiatement (sans attendre le cron)
  const applyScheduleNow = async (s: any) => {
    // Traiter toutes les lignes comme des consignes manuelles quand type === 'heat'
    const isHeat = s.type === 'heat';

    const payload: any = {
      endpoint: 'setroomthermpoint',
      home_id: s.home_id,
      room_id: s.netatmo_room_id,
      mode: isHeat ? 'manual' : 'home',
    };

    if (isHeat) {
      payload.temp = Number(s.temp);
      // Si end_time existe, l'utiliser; sinon durée par défaut:
      // - si c'est la ligne ECO (temp basse), 24h par défaut
      // - sinon 1h si rien n'est précisé
      if (s.end_time) {
        payload.endtime = Math.floor(new Date(s.end_time).getTime() / 1000);
      } else {
        const defaultDurationSec = 24 * 3600; // ECO par défaut
        payload.endtime = Math.floor(Date.now() / 1000) + defaultDurationSec;
      }
    }

    const { error } = await supabase.functions.invoke('netatmo-proxy', { body: payload });
    if (error) {
      toast.error(error.message || "Échec de l'application de la programmation.");
      await supabase.from('thermostat_schedules')
        .update({ status: 'failed', error: error.message || 'unknown error' })
        .eq('id', s.id);
    } else {
      toast.success('Programmation appliquée.');
      await supabase.from('thermostat_schedules')
        .update({ status: 'applied', updated_at: new Date().toISOString() })
        .eq('id', s.id);
      // Rafraîchir statut live
      await loadHomestatus();
    }
    // Recharger la liste des programmations
    await loadSchedules();
  };

  // Derive the current home object from homesData (used throughout the JSX)
  const home = homesData?.body?.homes?.[0] ?? null;

  // Liste des plannings Netatmo de la maison
  const [homeSchedules, setHomeSchedules] = React.useState<Array<{ id: string; name: string; selected?: boolean }>>([]);

  // Charger les plannings Netatmo
  async function loadHomeSchedules() {
    if (!homeId) return;
    const { error, data } = await supabase.functions.invoke("netatmo-proxy", {
      body: { endpoint: "gethomeschedule", home_id: homeId },
    });
    if (error) {
      toast.error(error.message || "Erreur de récupération des plannings Netatmo.");
      return;
    }
    // Normaliser
    const schedules = Array.isArray(data?.body?.schedules)
      ? data.body.schedules
      : Array.isArray(data?.schedules)
      ? data.schedules
      : [];
    const activeId =
      data?.body?.active_schedule_id ??
      data?.active_schedule_id ??
      null;

    setHomeSchedules(
      schedules.map((s: any) => ({
        id: String(s.id ?? s.schedule_id ?? s.name ?? Math.random()),
        name: String(s.name ?? `Planning ${s.id ?? ""}`),
        selected: activeId ? String(s.id ?? s.schedule_id) === String(activeId) : false,
      }))
    );
  }

  // Activer un planning Netatmo
  async function activateHomeSchedule(scheduleId: string) {
    if (!homeId) return;
    const { error } = await supabase.functions.invoke("netatmo-proxy", {
      body: { endpoint: "switchhomeschedule", home_id: homeId, schedule_id: String(scheduleId) },
    });
    if (error) {
      toast.error(error.message || "Impossible d'activer le planning.");
      return;
    }
    toast.success("Planning activé.");
    await loadHomeSchedules();
    // Remettre la pièce en mode 'home' pour laisser le planning s'appliquer
    if (selectedRoomId) {
      const backHomeRes = await supabase.functions.invoke("netatmo-proxy", {
        body: { endpoint: "setroomthermpoint", home_id: homeId, room_id: selectedRoomId, mode: "home" },
      });
      if (!backHomeRes.error) {
        toast.message("Pièce remise en mode 'home'.");
      }
    }
    // Rafraîchir le statut pour refléter l'activation
    await loadHomestatus();
  }

  // Charger les plannings quand la maison est connue
  React.useEffect(() => {
    if (homeId) loadHomeSchedules();
  }, [homeId]);

  // Créer les programmations pour une réservation donnée selon le scénario global
  async function createSchedulesForReservation(resa: {
    id: string;
    guest_name: string;
    property_name: string;
    check_in_date: string;
    check_out_date: string;
  }) {
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

    // Jour d'arrivée fixé à 15:00 en local (si pas d'heure fournie)
    const ARRIVAL_HOUR = 15;
    const ARRIVAL_MINUTE = 0;

    const arrivalDay = new Date(resa.check_in_date);
    arrivalDay.setHours(ARRIVAL_HOUR, ARRIVAL_MINUTE, 0, 0);

    // Lancement: relatif X minutes avant 15:00, ou absolu si défini
    let startHeatDate: Date;
    if (scenarioMode === "absolute" && scenarioHeatStart) {
      const [hh, mm] = scenarioHeatStart.split(":").map((n) => Number(n));
      startHeatDate = new Date(arrivalDay);
      startHeatDate.setHours(hh || 0, mm || 0, 0, 0);
    } else {
      const minutes = Math.max(5, scenarioMinutes);
      startHeatDate = new Date(arrivalDay.getTime() - minutes * 60 * 1000);
    }

    // Jour de départ: ECO à 11:00 (ou scenarioStopTime)
    const departureDay = new Date(resa.check_out_date);
    const [sh, sm] = (scenarioStopTime || "11:00").split(":").map((n) => Number(n));
    const ecoAt = new Date(departureDay);
    ecoAt.setHours(sh || 11, sm || 0, 0, 0);

    // Choisir la pièce Netatmo cible (selectedRoomId, sinon mapping par nom)
    let targetRoomId = selectedRoomId || null;
    if (!targetRoomId) {
      const netatmoRooms = home?.rooms ?? homesData?.body?.homes?.[0]?.rooms ?? [];
      const match = netatmoRooms.find((r: any) => r?.name === resa.property_name);
      if (match) targetRoomId = String(match.id);
    }
    if (!targetRoomId) {
      toast.error("Aucune pièce Netatmo mappée à cette réservation.");
      return;
    }

    const tempAtArrival = scenarioArrivalTemp;
    const tempEco = scenarioAfterDepartureTemp;

    const rows = [
      {
        user_id: uid,
        user_room_id: selectedUserRoomId,
        home_id: homeId,
        netatmo_room_id: targetRoomId,
        module_id: selectedModuleId,
        type: "heat",
        mode: "manual",
        temp: tempAtArrival,
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
        // CHANGED: utiliser 'heat' au lieu de 'eco' pour respecter la contrainte
        type: "heat",
        mode: "manual",
        temp: tempEco,
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

  // Générer des programmations (rows thermostat_schedules) pour les réservations à venir selon le scénario
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

    // Référence: heure d'arrivée par défaut fixée à 15:00, en local
    const ARRIVAL_HOUR = 15;
    const ARRIVAL_MINUTE = 0;

    const now = new Date();
    const rows: any[] = [];

    for (const resa of upcomingReservations) {
      // Jour d'arrivée: fixer à 15:00 (si pas d'heure précise fournie par la source)
      const arrivalDay = new Date(resa.check_in_date);
      arrivalDay.setHours(ARRIVAL_HOUR, ARRIVAL_MINUTE, 0, 0);

      // Calcul du lancement: relatif X minutes avant 15:00, ou absolu si scenarioHeatStart défini
      let startHeatDate: Date;
      if (scenarioMode === "absolute" && scenarioHeatStart) {
        const [hh, mm] = scenarioHeatStart.split(":").map((n) => Number(n));
        startHeatDate = new Date(arrivalDay);
        startHeatDate.setHours(hh || 0, mm || 0, 0, 0);
      } else {
        const minutes = Math.max(5, scenarioMinutes);
        startHeatDate = new Date(arrivalDay.getTime() - minutes * 60 * 1000);
      }

      // Ignorer si le lancement serait dans le passé (évite les "programmes hier")
      if (startHeatDate.getTime() < now.getTime()) {
        continue;
      }

      // Jour de départ: appliquer ECO à 11:00
      const departureDay = new Date(resa.check_out_date);
      const [sh, sm] = (scenarioStopTime || "11:00").split(":").map((n) => Number(n));
      const ecoAt = new Date(departureDay);
      ecoAt.setHours(sh || 11, sm || 0, 0, 0);

      // Déterminer la pièce Netatmo cible (selectedRoomId, sinon mapping par nom de propriété)
      let targetRoomId = selectedRoomId || null;
      if (!targetRoomId) {
        const netatmoRooms = home?.rooms ?? homesData?.body?.homes?.[0]?.rooms ?? [];
        const match = netatmoRooms.find((r: any) => r?.name === resa.property_name);
        if (match) targetRoomId = String(match.id);
      }
      if (!targetRoomId) {
        // Pas de mapping → ignorer cette réservation
        continue;
      }

      // Températures: consigne à l'arrivée et éco au départ
      const tempAtArrival = scenarioArrivalTemp;
      const tempEco = scenarioAfterDepartureTemp;

      // 1) Chauffe: du lancement jusqu'à l'heure d'eco le jour du départ
      rows.push({
        user_id: uid,
        user_room_id: selectedUserRoomId,
        home_id: homeId,
        netatmo_room_id: targetRoomId,
        module_id: selectedModuleId,
        type: "heat",
        mode: "manual",
        temp: tempAtArrival,
        start_time: startHeatDate.toISOString(),
        end_time: ecoAt.toISOString(),
        status: "pending",
      });

      // 2) ECO: à 11:00 le jour du départ (mode manual avec temp éco)
      rows.push({
        user_id: uid,
        user_room_id: selectedUserRoomId,
        home_id: homeId,
        netatmo_room_id: targetRoomId,
        module_id: selectedModuleId,
        // CHANGED: utiliser un type autorisé (heat) pour respecter la contrainte
        type: "heat",
        mode: "manual",
        temp: tempEco,
        start_time: ecoAt.toISOString(),
        end_time: null,
        status: "pending",
      });
    }

    if (rows.length === 0) {
      toast.message("Aucune programmation à créer (rien d'à venir ou mapping des pièces manquant).");
      return;
    }

    const { error } = await supabase.from("thermostat_schedules").insert(rows);
    if (error) {
      toast.error(error.message || "Erreur lors de la création des programmations.");
      return;
    }
    toast.success(`${rows.length} programmation(s) ajoutée(s) au cron (chauffe + éco par résa).`);
    await loadSchedules();
  }

  // Statuts du scheduler
  const [schedulerStats, setSchedulerStats] = React.useState<{ pendingNow: number; nextStart: string | null }>({
    pendingNow: 0,
    nextStart: null,
  });
  const [autoRunEnabled, setAutoRunEnabled] = React.useState(false);

  async function refreshSchedulerStats() {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return;

    const nowIso = new Date().toISOString();

    const pendingNowRes = await supabase
      .from("thermostat_schedules")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .lte("start_time", nowIso);

    const upcoming = await supabase
      .from("thermostat_schedules")
      .select("start_time")
      .eq("user_id", userId)
      .eq("status", "pending")
      .gte("start_time", nowIso)
      .order("start_time", { ascending: true })
      .limit(1);

    setSchedulerStats({
      pendingNow: pendingNowRes.error ? 0 : (pendingNowRes.data?.length || 0),
      nextStart: upcoming.error ? null : (upcoming.data?.[0]?.start_time || null),
    });
  }

  // Exécution auto: lance le scheduler toutes les 60s si activé
  React.useEffect(() => {
    let id: any;
    if (autoRunEnabled) {
      id = setInterval(() => {
        runSchedulerNow();
        refreshSchedulerStats();
      }, 60_000);
    }
    return () => {
      if (id) clearInterval(id);
    };
  }, [autoRunEnabled]);

  // Mode test: ajouter une réservation de test pour générer des programmations
  const [testGuestName, setTestGuestName] = React.useState<string>("Client test");
  const [testPropertyName, setTestPropertyName] = React.useState<string>("");
  const [testArrivalAt, setTestArrivalAt] = React.useState<string>("");
  const [testDepartureAt, setTestDepartureAt] = React.useState<string>("");

  function addTestReservation() {
    if (!testPropertyName || !testArrivalAt || !testDepartureAt) {
      toast.error("Renseignez le logement, l'arrivée et le départ pour le test.");
      return;
    }
    const id = `test_${Date.now()}`;
    const resa = {
      id,
      guest_name: testGuestName || "Client test",
      property_name: testPropertyName,
      check_in_date: new Date(testArrivalAt).toISOString(),
      check_out_date: new Date(testDepartureAt).toISOString(),
      cod_channel: "test",
    };
    setUpcomingReservations((prev) => {
      const next = [...prev.filter((r) => r.id !== id), resa];
      return next;
    });
    toast.success("Réservation de test ajoutée. Créez les programmations depuis la liste des réservations.");
  }

  if (hasTokens === null) {
    return (
      <MainLayout>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Netatmo Dashboard</h1>
          <p className="text-gray-600 mb-6">Veuillez vous connecter pour accéder à votre dashboard.</p>
          <Button onClick={() => navigate("/login")}>Se connecter</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Netatmo Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Statut de la maison</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Maison: {home?.name || "Non chargée"}</p>
              <p className="text-gray-600">Pièce: {selectedRoomId ? home?.rooms?.find(r => r.id === selectedRoomId)?.name : "Sélectionnez une pièce"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thermostat</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Module: {selectedModuleId || "Sélectionnez un thermostat"}</p>
              <p className="text-gray-600">Pont: {selectedBridgeId || "Sélectionnez un pont"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Mode: {quickMode === "manual" ? "Manuel" : quickMode === "max" ? "Max" : "Home"}</p>
              <p className="text-gray-600">Température: {quickTemp}°C</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Programmation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Arrivée</label>
                    <Input
                      type="datetime-local"
                      value={arrivalAt}
                      onChange={(e) => setArrivalAt(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Départ</label>
                    <Input
                      type="datetime-local"
                      value={departureAt}
                      onChange={(e) => setDepartureAt(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Mode de préchauffage</label>
                  <RadioGroup
                    value={preheatMode}
                    onValueChange={(val) => setPreheatMode(val as "relative" | "absolute")}
                    className="mt-1 flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="relative" id="preheat-relative" />
                      <label htmlFor="preheat-relative">Relatif</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="absolute" id="preheat-absolute" />
                      <label htmlFor="preheat-absolute">Heure précise</label>
                    </div>
                  </RadioGroup>
                </div>

                {preheatMode === "relative" ? (
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Préchauffer (minutes avant)</label>
                      <span className="text-sm text-gray-600">{preheatMinutes} min</span>
                    </div>
                    <Slider
                      value={[preheatMinutes]}
                      onValueChange={(vals) => setPreheatMinutes(vals[0])}
                      min={5}
                      max={600}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-sm font-medium">Heure de lancement de la chauffe</label>
                    <Input
                      type="time"
                      value={heatStartAt}
                      onChange={(e) => setHeatStartAt(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Température à l'arrivée</label>
                    <span className="text-sm text-gray-600">{arrivalTemp} °C</span>
                  </div>
                  <Slider
                    value={[arrivalTemp]}
                    onValueChange={(vals) => setArrivalTemp(vals[0])}
                    min={10}
                    max={25}
                    step={0.5}
                    className="mt-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scénario</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Degré Eco (après départ)</label>
                    <span className="text-sm text-gray-600">{scenarioAfterDepartureTemp} °C</span>
                  </div>
                  <Slider
                    value={[scenarioAfterDepartureTemp]}
                    onValueChange={(vals) => setScenarioAfterDepartureTemp(vals[0])}
                    min={10}
                    max={22}
                    step={0.5}
                    className="mt-2"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Mode de préchauffage global</label>
                  <RadioGroup
                    value={scenarioMode}
                    onValueChange={(val) => setScenarioMode(val as "relative" | "absolute")}
                    className="mt-1 flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="relative" id="scenario-relative" />
                      <label htmlFor="scenario-relative">Relatif</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="absolute" id="scenario-absolute" />
                      <label htmlFor="scenario-absolute">Heure précise</label>
                    </div>
                  </RadioGroup>
                </div>

                {scenarioMode === "relative" ? (
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Préchauffer (minutes avant)</label>
                      <span className="text-sm text-gray-600">{scenarioMinutes} min</span>
                    </div>
                    <Slider
                      value={[scenarioMinutes]}
                      onValueChange={(vals) => setScenarioMinutes(vals[0])}
                      min={5}
                      max={600}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-sm font-medium">Heure de lancement (global)</label>
                    <Input
                      type="time"
                      value={scenarioHeatStart}
                      onChange={(e) => setScenarioHeatStart(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Température d'arrivée (global)</label>
                    <span className="text-sm text-gray-600">{scenarioArrivalTemp} °C</span>
                  </div>
                  <Slider
                    value={[scenarioArrivalTemp]}
                    onValueChange={(vals) => setScenarioArrivalTemp(vals[0])}
                    min={10}
                    max={25}
                    step={0.5}
                    className="mt-2"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Heure d'arrêt (appliquer Eco)</label>
                  <Input
                    type="time"
                    value={scenarioStopTime}
                    onChange={(e) => setScenarioStopTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Derniers logs: {logs.length} entrées</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Historique de la pièce</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Température — Aujourd'hui</p>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Chaudière</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Température — 7 derniers jours</p>
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

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={saveSchedule} className="w-full">Enregistrer la programmation</Button>
              <Button onClick={runSchedulerNow} className="w-full mt-2">Lancer le scheduler</Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Plannings Netatmo</CardTitle>
            </CardHeader>
            <CardContent>
              {homeSchedules.length === 0 ? (
                <p className="text-gray-600">Aucun planning Netatmo trouvé.</p>
              ) : (
                <div className="space-y-3">
                  {homeSchedules.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded border p-3"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{s.name}</p>
                        {s.selected ? (
                          <Badge className="mt-1" variant="default">Actif</Badge>
                        ) : (
                          <Badge className="mt-1" variant="secondary">Inactif</Badge>
                        )}
                      </div>
                      {!s.selected && (
                        <Button
                          variant="outline"
                          onClick={() => activateHomeSchedule(s.id)}
                        >
                          Activer
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plannings pour réservations</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={createNetatmoSchedulesForReservations} className="w-full">
                Créer des plannings pour réservations
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scénario global</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={saveScenario} className="w-full">Sauvegarder le scénario</Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Chargement des logements</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Logements: {userRooms.length}</p>
              <p className="text-gray-600">Pièce sélectionnée: {selectedUserRoomId ? userRooms.find(r => r.id === selectedUserRoomId)?.room_name : "Sélectionnez un logement"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Bloc: Statuts du scheduler et exécution automatique */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Statuts du scheduler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-700">Programmations dues maintenant</p>
                  <Badge variant={schedulerStats.pendingNow > 0 ? "default" : "secondary"}>
                    {schedulerStats.pendingNow}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-700">Prochaine programmation</p>
                  <span className="text-sm text-gray-600">
                    {schedulerStats.nextStart ? new Date(schedulerStats.nextStart).toLocaleString() : "Aucune"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={refreshSchedulerStats}>Actualiser</Button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Exécuter automatiquement</span>
                    <Switch checked={autoRunEnabled} onCheckedChange={setAutoRunEnabled} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mode test: ajouter une réservation rapidement */}
          <Card>
            <CardHeader>
              <CardTitle>Mode test (réservation rapide)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Nom du client</label>
                    <Input value={testGuestName} onChange={(e) => setTestGuestName(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Logement (nom de la pièce Netatmo)</label>
                    <Input value={testPropertyName} onChange={(e) => setTestPropertyName(e.target.value)} className="mt-1" placeholder="Ex: Chambre 1" />
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
                <Button className="w-full" onClick={addTestReservation}>Ajouter la réservation de test</Button>
                <p className="text-xs text-gray-600">
                  Astuce: mettez l'arrivée dans les 30 prochaines minutes pour tester le préchauffage en mode horaire.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bloc: Réservations à venir (liste simplifiée) */}
        <div className="grid grid-cols-1 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Réservations à venir</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full" onClick={() => loadUserRooms()}>
                  Recharger les réservations
                </Button>
                {upcomingReservations.length === 0 ? (
                  <p className="text-gray-600 mt-2">Aucune réservation à venir.</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingReservations.map((resa) => {
                      const roomId = findRoomIdForReservation(resa);
                      const { startHeatDate, ecoAt } = getPlanTimesForReservation(resa);

                      // Vérifier si les programmations existent déjà
                      const hasHeat = schedules.some(
                        (s) =>
                          String(s.netatmo_room_id) === String(roomId) &&
                          s.type === "heat" &&
                          new Date(s.start_time).getTime() === startHeatDate.getTime() &&
                          typeof s.temp === "number" &&
                          Number(s.temp) === Number(scenarioArrivalTemp)
                      );
                      const hasEco = schedules.some(
                        (s) =>
                          String(s.netatmo_room_id) === String(roomId) &&
                          s.type === "heat" && // éco stocké comme 'heat' manuel à temp éco
                          new Date(s.start_time).getTime() === ecoAt.getTime() &&
                          typeof s.temp === "number" &&
                          Number(s.temp) === Number(scenarioAfterDepartureTemp)
                      );

                      return (
                        <div key={resa.id} className="rounded border p-3">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <div>
                              <p className="font-medium">
                                {resa.guest_name || "Client"} — {resa.property_name}
                              </p>
                              <p className="text-sm text-gray-600">
                                Arrivée: {new Date(resa.check_in_date).toLocaleDateString()} • Départ: {new Date(resa.check_out_date).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {hasHeat && <Badge variant="default">Préchauffage créé</Badge>}
                              {!hasHeat && <Badge variant="secondary">Préchauffage manquant</Badge>}
                              {hasEco && <Badge variant="default">Éco créé</Badge>}
                              {!hasEco && <Badge variant="secondary">Éco manquant</Badge>}
                            </div>
                          </div>

                          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div className="rounded bg-gray-50 p-2">
                              <p className="font-medium">Préchauffage</p>
                              <p>{scenarioMode === "absolute" && scenarioHeatStart ? `à ${scenarioHeatStart}` : `${scenarioMinutes} min avant 15:00`}</p>
                              <p>{startHeatDate.toLocaleString()}</p>
                              <p>Consigne: {scenarioArrivalTemp}°C</p>
                            </div>
                            <div className="rounded bg-gray-50 p-2">
                              <p className="font-medium">Maintien pendant le séjour</p>
                              <p>Consigne maintenue jusqu'au passage en éco</p>
                            </div>
                            <div className="rounded bg-gray-50 p-2">
                              <p className="font-medium">Éco au départ</p>
                              <p>{(scenarioStopTime || "11:00")}</p>
                              <p>{ecoAt.toLocaleString()}</p>
                              <p>Consigne: {scenarioAfterDepartureTemp}°C</p>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-col md:flex-row gap-2">
                            <Button size="sm" onClick={() => createSchedulesForReservation(resa)}>
                              Créer programmations
                            </Button>
                            <Button size="sm" variant="outline" onClick={runSchedulerNow}>
                              Lancer le scheduler
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Programmations (Cron)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button onClick={generateCronSchedulesFromReservations} className="w-full">
                  Générer programmations depuis toutes les réservations
                </Button>
                <Button onClick={runSchedulerNow} variant="outline" className="w-full">
                  Lancer le scheduler (appliquer les programmations dues)
                </Button>
              </div>
              <div className="mt-4">
                {schedules.length === 0 ? (
                  <p className="text-gray-600">Aucune programmation enregistrée.</p>
                ) : (
                  <div className="space-y-2">
                    {schedules.map((s) => (
                      <div key={s.id} className="flex items-center justify-between border rounded p-2">
                        <div>
                          <p className="font-medium">
                            {/* Affichage: distinguer chauffe d'arrivée vs ECO par la temp et l'heure */}
                            {s.end_time ? "Chauffer (arrivée)" : "Éco (manuel)"} — {new Date(s.start_time).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            Pièce: {home?.rooms?.find((r: any) => String(r.id) === String(s.netatmo_room_id))?.name || s.netatmo_room_id}
                            {typeof s.temp === "number" ? ` • ${Number(s.temp)}°C` : ""}
                            {s.status ? ` • statut: ${s.status}` : ""}
                          </p>
                        </div>
                        <Button size="sm" variant="secondary" onClick={() => applyScheduleNow(s)}>
                          Appliquer maintenant
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scénario global</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-700">
                <p>Préchauffage: {scenarioMode === "absolute" && scenarioHeatStart ? `à ${scenarioHeatStart}` : `${scenarioMinutes} min avant 15:00`}</p>
                <p>Consigne arrivée: {scenarioArrivalTemp}°C</p>
                <p>Éco au départ à {scenarioStopTime || "11:00"}: {scenarioAfterDepartureTemp}°C</p>
              </div>
              <Button onClick={saveScenario} className="w-full mt-3">Sauvegarder le scénario</Button>
            </CardContent>
          </Card>
        </div>

      </div>
    </MainLayout>
  );
};

export default NetatmoDashboardPage;