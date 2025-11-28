"use client";

import React from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ComposedChart,
  Bar,
  Line,
  Cell,
} from "recharts";
import { Copy, Eye, EyeOff, Zap, Settings, Euro, TrendingUp, Gauge, CalendarDays, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ElectricitySpark from "@/components/ElectricitySpark";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type ConsoType =
  | "daily_consumption"
  | "consumption_load_curve"
  | "consumption_max_power"
  | "daily_production"
  | "production_load_curve";

type FetchParams = {
  prm: string;
  token: string;
  type: ConsoType;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
};

type ReservationCostRow = {
  id: string;
  roomName?: string;
  arrival: string;
  departure: string;
  nights: number;
  energyKWh: number;
  costEUR: number;
};

// Crée une clé de cache stable pour une combinaison de paramètres (sans inclure le token)
function makeCacheKey(p: { prm: string; type: ConsoType; start: string; end: string }) {
  return `${p.prm}::${p.type}::${p.start}::${p.end}`;
}

// Helpers dates
function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(d: Date, delta: number) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + delta);
  return nd;
}
// Clamp la fin envoyée à l'API au maximum à aujourd'hui (fin exclusive)
// L'API exige end < date courante; avec end = aujourd'hui (exclue) on récupère jusqu'à hier.
function clampEndToToday(endISO: string) {
  // Prend la date du jour en UTC pour éviter tout décalage de fuseau (ex: 28 local mais 29 en localtime)
  const todayUtc = new Date().toISOString().slice(0, 10); // YYYY-MM-DD en UTC
  return endISO > todayUtc ? todayUtc : endISO;
}
// Helpers manquants pour navigation mensuelle et presets
function addMonths(d: Date, delta: number) {
  const nd = new Date(d);
  nd.setMonth(nd.getMonth() + delta, 1);
  return nd;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}
function eachDayStrings(startISO: string, endISO: string) {
  // [start, end) exclusif
  const days: string[] = [];
  if (!isValidDateStr(startISO) || !isValidDateStr(endISO)) return days;
  let cur = new Date(startISO);
  const end = new Date(endISO);
  while (cur < end) {
    days.push(toISODate(cur));
    cur = addDays(cur, 1);
  }
  return days;
}

function isValidDateStr(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

function inferKeys(sample: any): { dateKey?: string; valueKey?: string } {
  if (!sample || typeof sample !== "object") return {};
  const keys = Object.keys(sample);

  // Try to find a date-like key
  const dateCandidates = ["date", "datetime", "time", "start", "end", "begin", "timestamp"];
  let dateKey = keys.find((k) => dateCandidates.includes(k.toLowerCase()));
  if (!dateKey) {
    dateKey = keys.find((k) => {
      const v = sample[k];
      return typeof v === "string" && !Number.isNaN(new Date(v).getTime());
    });
  }

  // Try to find a numeric value key
  const valueCandidates = ["value", "consumption", "power", "energy", "conso", "max_power", "val"];
  let valueKey = keys.find((k) => valueCandidates.includes(k.toLowerCase()));
  if (!valueKey) {
    valueKey = keys.find((k) => typeof sample[k] === "number");
  }

  return { dateKey, valueKey };
}

function toChartData(data: any[]): { name: string; value: number }[] {
  if (!Array.isArray(data) || data.length === 0) return [];
  const { dateKey, valueKey } = inferKeys(data[0]);
  if (!dateKey || !valueKey) return [];
  return data
    .map((item) => {
      const d = item[dateKey];
      const v = item[valueKey];
      const name =
        typeof d === "string"
          ? d.slice(0, 16)
          : typeof d === "number"
          ? new Date(d).toISOString().slice(0, 16)
          : String(d);
      const num = typeof v === "number" ? v : Number(v);
      if (Number.isNaN(num)) return null;
      return { name, value: num };
    })
    .filter(Boolean) as { name: string; value: number }[];
}

const ElectricityConsumptionPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [prm, setPrm] = React.useState<string>("");
  const [token, setToken] = React.useState<string>("");
  const [type, setType] = React.useState<ConsoType>("daily_consumption");
  // Type d'énergie (données en Wh) vs puissance (données en W)
  const isEnergyType = React.useMemo(
    () => ["daily_consumption", "daily_production"].includes(type),
    [type]
  );
  const [start, setStart] = React.useState<string>(() => {
    const today = new Date();
    return toISODate(addDays(today, -4)); // défaut: 5 jours (fin exclue demain) affichés
  });
  const [end, setEnd] = React.useState<string>(() => toISODate(addDays(new Date(), 1)));
  const [showToken, setShowToken] = React.useState(false);
  const [pricePerKWh, setPricePerKWh] = React.useState<string>("");

  // Unité (pas sensible, mais on ne la stocke pas localement)
  const [unit, setUnit] = React.useState<string>(() => {
    return ["daily_consumption", "daily_production"].includes("daily_consumption") ? "kWh" : "kW";
  });

  // Définir avant usage
  const canComputeEnergyCost = type !== "consumption_max_power";

  // REMOVED: toute persistance locale

  const [params, setParams] = React.useState<FetchParams | null>(null);
  const paramKey = React.useMemo(() => (params ? makeCacheKey(params) : null), [params]);

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["conso", paramKey],
    queryFn: async () => {
      if (!params) return null;
      const safePrm = String(params.prm).replace(/^(\d{4})\d+(\d{4})$/, "$1********$2");
      const reqMeta = {
        ts: new Date().toISOString(),
        type: params.type,
        prm: safePrm,
        start: params.start,
        end: params.end,
      };
      setDebugInfo((prev: any) => ({ ...(prev || {}), request: reqMeta }));

      const { data, error } = await supabase.functions.invoke("conso-proxy", {
        body: {
          prm: params.prm,
          token: params.token,
          type: params.type,
          start: params.start,
          end: params.end,
        },
      });
      if (error) {
        setDebugInfo((prev: any) => ({ ...(prev || {}), response: { ok: false, message: error.message } }));
        throw new Error(error.message || "Erreur depuis la fonction Edge");
      }
      setDebugInfo((prev: any) => ({
        ...(prev || {}),
        response: {
          ok: true,
          kind: Array.isArray(data) ? "array" : typeof data,
          length: Array.isArray(data) ? data.length : undefined,
          sample: Array.isArray(data) ? data.slice(0, 2) : data,
        },
      }));
      return data;
    },
    enabled: !!params,
    // REMOVED: écriture cache local
  });

  // Refetch minuit conservé
  // ...

  // Auto-load: au montage, charger PRM/token/prix depuis le profil (DB), sans rien stocker localement
  const autoLoadedRef = React.useRef(false);

  React.useEffect(() => {
    if (autoLoadedRef.current) return;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      autoLoadedRef.current = true;
      if (!userId) return;
      const { data } = await supabase
        .from("profiles")
        .select("conso_prm, conso_token, conso_price_per_kwh")
        .eq("id", userId)
        .single();
      setPrm(data?.conso_prm || "");
      setToken(data?.conso_token || "");
      setPricePerKWh(data?.conso_price_per_kwh != null ? String(data?.conso_price_per_kwh) : "");
      // Charger par défaut sur 5 jours dès qu'on a des identifiants
      const s = start;
      const e = end;
      if (s && e) loadForRange(s, e);
    })().catch(() => {});
  }, []);

  // Normalise la réponse pour trouver un tableau exploitable, même si l'API renvoie un objet.
  const normalizedArray = React.useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === "object") {
      for (const key of Object.keys(data as any)) {
        const val = (data as any)[key];
        if (Array.isArray(val)) return val;
      }
    }
    return [];
  }, [data]);

  const rawJson = React.useMemo(() => {
    try {
      return typeof data === "string" ? data : JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);

  const chartData = React.useMemo(() => {
    if (!normalizedArray || normalizedArray.length === 0) return [];
    return toChartData(normalizedArray);
  }, [normalizedArray]);

  // Liste des jours de la période sélectionnée (utile pour afficher même sans données)
  const daysInRange = React.useMemo(() => eachDayStrings(start, end), [start, end]);

  // Calcul énergie totale (kWh) en fonction du type retourné
  const energyKWhTotal = React.useMemo(() => {
    if (!chartData || chartData.length === 0) return 0;
    if (type === "daily_consumption" || type === "daily_production") {
      const sumWh = chartData.reduce((s, d) => s + (Number(d.value) || 0), 0);
      return sumWh / 1000;
    }
    if (type === "consumption_load_curve" || type === "production_load_curve") {
      const sumW = chartData.reduce((s, d) => s + (Number(d.value) || 0), 0);
      return (sumW * 0.5) / 1000;
    }
    return 0;
  }, [chartData, type]);

  const totalCost = React.useMemo(() => {
    const p = Number((pricePerKWh || "").replace(",", "."));
    if (!canComputeEnergyCost || Number.isNaN(p) || p <= 0) return 0;
    return energyKWhTotal * p;
  }, [energyKWhTotal, pricePerKWh, canComputeEnergyCost]);

  // Indicateurs
  const periodDays = React.useMemo(() => {
    if (!isValidDateStr(start) || !isValidDateStr(end)) return 0;
    return eachDayStrings(start, end).length;
  }, [start, end]);

  const avgKWhPerDay = React.useMemo(() => {
    if (!canComputeEnergyCost || periodDays <= 0) return 0;
    return energyKWhTotal / periodDays;
  }, [energyKWhTotal, canComputeEnergyCost, periodDays]);

  const peakDisplay = React.useMemo(() => {
    if (!chartData || chartData.length === 0) return 0;
    const rawMax = Math.max(...chartData.map((d) => Number(d.value) || 0));
    const factor = (() => {
      if (isEnergyType) {
        if (unit === "Wh") return 1;
        if (unit === "kWh") return 1 / 1000;
        if (unit === "MWh") return 1 / 1_000_000;
        return 1;
      } else {
        if (unit === "W") return 1;
        if (unit === "kW") return 1 / 1000;
        return 1;
      }
    })();
    return rawMax * factor;
  }, [chartData, unit, isEnergyType]);

  const nbPoints = chartData.length;

  // Afficher la série coût seulement si un prix/kWh valide est présent et que le type s'y prête
  const showCost = React.useMemo(
    () => canComputeEnergyCost && Number((pricePerKWh || "").replace(",", ".")) > 0,
    [canComputeEnergyCost, pricePerKWh]
  );

  // Construire l'affichage en incluant chaque jour de la période (jours sans donnée marqués)
  const chartDisplayData = React.useMemo(() => {
    // facteur d'affichage pour la série "valeur" (unité choisie)
    const factor = (() => {
      if (isEnergyType) {
        if (unit === "Wh") return 1;
        if (unit === "kWh") return 1 / 1000;
        if (unit === "MWh") return 1 / 1_000_000;
        return 1;
      } else {
        if (unit === "W") return 1;
        if (unit === "kW") return 1 / 1000;
        return 1;
      }
    })();
    const p = Number((pricePerKWh || "").replace(",", "."));

    // Si on est en daily_*: afficher chaque jour, même sans donnée
    if (type === "daily_consumption" || type === "daily_production") {
      const byDay = new Map<string, number>();
      for (const d of chartData) {
        const day = String(d.name).slice(0, 10);
        const val = Number(d.value) || 0; // Wh
        byDay.set(day, (byDay.get(day) || 0) + val);
      }
      return daysInRange.map((day) => {
        const rawWh = byDay.get(day);
        const noData = rawWh == null;
        const value = (rawWh ?? 0) * factor; // affichage en Wh/kWh/MWh
        let cost: number | undefined = undefined;
        if (!noData && canComputeEnergyCost && p > 0) {
          cost = (rawWh! / 1000) * p; // kWh * €/kWh
        } else if (showCost) {
          cost = 0; // afficher une colonne 0 hachurée pour cohérence visuelle
        }
        return { name: day, value, cost, noData };
      });
    }

    // Autres types: on garde le comportement original (pas d'extension des jours)
    if (!chartData || chartData.length === 0) return [];
    return chartData.map((d) => {
      const raw = Number(d.value) || 0; // W (puissance) sur courbes
      let cost: number | undefined = undefined;
      if (canComputeEnergyCost && p > 0 && (type === "consumption_load_curve" || type === "production_load_curve")) {
        cost = ((raw * 0.5) / 1000) * p; // W * 0.5h -> kWh * €/kWh
      }
      return { name: d.name, value: raw * factor, cost, noData: false };
    });
  }, [chartData, unit, isEnergyType, pricePerKWh, canComputeEnergyCost, type, daysInRange]);

  // Label personnalisé: icône d'avertissement au-dessus des colonnes sans donnée
  const renderNoDataLabel = (props: any) => {
    const { x, y, width, payload } = props;
    if (!payload?.noData) return null;
    const cx = x + (width || 0) / 2;
    const labelY = (y || 0) - 8;
    return (
      <text x={cx} y={labelY} textAnchor="middle" fontSize={12} fill="#9ca3af">
        ⚠
      </text>
    );
  };

  const tooManyPointsForBars = chartDisplayData.length > barsPointLimit;

  React.useEffect(() => {
    if (chartView === "bars" && tooManyPointsForBars) {
      setChartView("area");
      toast.message("Période large: passage automatique en vue aire pour une meilleure lisibilité.");
    }
  }, [chartDisplayData.length, chartView, tooManyPointsForBars]);

  // Périodes rapides
  const setQuickRange = (preset: "7d" | "30d" | "90d" | "this-month" | "last-month" | "ytd" | "365d") => {
    const today = new Date();
    const tomorrow = addDays(today, 1); // end exclusif
    if (preset === "7d") {
      setStart(toISODate(addDays(today, -7)));
      setEnd(toISODate(tomorrow));
      return;
    }
    if (preset === "30d") {
      setStart(toISODate(addDays(today, -30)));
      setEnd(toISODate(tomorrow));
      return;
    }
    if (preset === "90d") {
      setStart(toISODate(addDays(today, -90)));
      setEnd(toISODate(tomorrow));
      return;
    }
    if (preset === "365d") {
      setStart(toISODate(addDays(today, -365)));
      setEnd(toISODate(tomorrow));
      return;
    }
    if (preset === "this-month") {
      const s = startOfMonth(today);
      const e = addMonths(s, 1);
      setStart(toISODate(s));
      setEnd(toISODate(e));
      return;
    }
    if (preset === "last-month") {
      const thisMonthStart = startOfMonth(today);
      const prevStart = addMonths(thisMonthStart, -1);
      setStart(toISODate(prevStart));
      setEnd(toISODate(thisMonthStart));
      return;
    }
    if (preset === "ytd") {
      const s = startOfYear(today);
      const e = addMonths(s, 12);
      setStart(toISODate(s));
      setEnd(toISODate(e));
      return;
    }
  };

  const handleSaveCredentials = () => {
    localStorage.setItem("conso_prm", prm);
    localStorage.setItem("conso_token", token);
    toast.success("Paramètres enregistrés localement");
  };

  const handleClearCredentials = () => {
    localStorage.removeItem("conso_prm");
    localStorage.removeItem("conso_token");
    setPrm("");
    setToken("");
    toast.success("Paramètres effacés de cet appareil");
  };

  const saveCredentialsToProfile = async () => {
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      toast.error(authError.message);
      return;
    }
    const userId = userData?.user?.id;
    if (!userId) {
      toast.error("Veuillez vous connecter.");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ conso_prm: prm || null, conso_token: token || null })
      .eq("id", userId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Paramètres enregistrés dans votre profil.");
  };

  const loadCredentialsFromProfile = async () => {
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      toast.error(authError.message);
      return;
    }
    const userId = userData?.user?.id;
    if (!userId) {
      toast.error("Veuillez vous connecter.");
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("conso_prm, conso_token")
      .eq("id", userId)
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setPrm(data?.conso_prm || "");
    setToken(data?.conso_token || "");
    toast.success("Paramètres chargés depuis votre profil.");
  };

  // Charger les données pour une plage donnée, avec validations et cache local
  const loadForRange = React.useCallback(
    (newStart: string, newEnd: string) => {
      if (!/^\d{14}$/.test(prm)) {
        toast.error("Le PRM doit contenir 14 chiffres.");
        return;
      }
      if (!token || token.length < 10) {
        toast.error("Veuillez renseigner votre token Conso API.");
        return;
      }
      if (!isValidDateStr(newStart) || !isValidDateStr(newEnd) || new Date(newEnd) <= new Date(newStart)) {
        toast.error("Plage de dates invalide.");
        return;
      }

      const effectiveEnd = clampEndToToday(newEnd);
      if (new Date(newStart) >= new Date(effectiveEnd)) {
        setParams(null);
        setDebugInfo({
          request: {
            ts: new Date().toISOString(),
            type,
            prm: String(prm).replace(/^(\d{4})\d+(\d{4})$/, "$1********$2"),
            start: newStart,
            end: newEnd,
            effectiveEnd,
            note: "Plage future, pas d'appel API",
          },
        });
        toast.message("Période future: affichage sans données disponibles.");
        return;
      }

      setDebugInfo((prev: any) => ({
        ...(prev || {}),
        request: { ts: new Date().toISOString(), type, prm: String(prm).replace(/^(\d{4})\d+(\d{4})$/, "$1********$2"), start: newStart, end: newEnd, effectiveEnd },
      }));
      setParams({ prm, token, type, start: newStart, end: effectiveEnd });
      toast.message("Chargement des données…");
    },
    [prm, token, type, queryClient]
  );

  // Navigation mois précédent / suivant
  const goToMonth = React.useCallback((delta: number) => {
    const base = isValidDateStr(start) ? new Date(start) : new Date();
    const s0 = startOfMonth(base);
    const s1 = addMonths(s0, delta);
    const e1 = addMonths(s1, 1);
    const newStart = toISODate(s1);
    const newEnd = toISODate(e1);
    setStart(newStart);
    setEnd(newEnd);
    loadForRange(newStart, newEnd);
  }, [start, loadForRange]);

  // Charger via le bouton (utiliser 5 jours par défaut)
  const onSubmit = React.useCallback(() => {
    const today = new Date();
    const s = toISODate(addDays(today, -4));
    const e = toISODate(addDays(today, 1));
    setStart(s);
    setEnd(e);
    loadForRange(s, e);
  }, [loadForRange]);

  // Forcer l'actualisation (bypass affichage seed, mais refetch côté réseau)
  const forceRefresh = async () => {
    if (!params) {
      toast.message("Aucune requête en cours à actualiser.");
      return;
    }
    toast.message("Actualisation en cours…");
    try {
      await refetch({ cancelRefetch: false });
      toast.success("Données actualisées");
    } catch {
      toast.error("Échec de l'actualisation");
    }
  };

  const endInclusiveLabel = React.useMemo(() => {
    if (!isValidDateStr(end)) return end || "";
    const endInc = toISODate(addDays(new Date(end), -1));
    return endInc;
  }, [end]);

  const monthLabel = React.useMemo(() => {
    const d = isValidDateStr(start) ? new Date(start) : new Date();
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }, [start]);

  // Après monthLabel et avant loadForRange, auto-load par défaut si rien en cache
  React.useEffect(() => {
    const lastParamsRaw = localStorage.getItem("conso_last_params");
    if (!lastParamsRaw && !params) {
      const today = new Date();
      const s = toISODate(addDays(today, -4));
      const e = toISODate(addDays(today, 1)); // fin exclue
      setStart(s);
      setEnd(e);
      loadForRange(s, e);
    }
  }, [params, loadForRange]);

  // ADD: analyzeReservations function (self-contained)
  const analyzeReservations = async () => {
    // Validations de base
    if (!/^\d{14}$/.test(prm)) {
      toast.error("Le PRM doit contenir 14 chiffres.");
      return;
    }
    if (!token || token.length < 10) {
      toast.error("Veuillez renseigner votre token Conso API.");
      return;
    }
    if (!isValidDateStr(start) || !isValidDateStr(end)) {
      toast.error("Dates invalides (YYYY-MM-DD).");
      return;
    }

    setIsAnalyzing(true);
    try {
      const effectiveEnd = clampEndToToday(end);
      if (new Date(start) >= new Date(effectiveEnd)) {
        setResRows([]);
        toast.message("Période future: aucune donnée de consommation disponible.");
        return;
      }
      const { data: consoData, error: consoError } = await supabase.functions.invoke("conso-proxy", {
        body: { prm, token, type: "daily_consumption", start, end: effectiveEnd },
      });
      if (consoError) throw new Error(consoError.message || "Erreur conso daily");

      // 1bis) Normaliser en tableau et construire la map { 'YYYY-MM-DD': Wh }
      let arr: any[] = Array.isArray(consoData) ? consoData : [];
      if (!arr.length && consoData && typeof consoData === "object") {
        for (const k of Object.keys(consoData)) {
          const v = (consoData as any)[k];
          if (Array.isArray(v)) {
            arr = v;
            break;
          }
        }
      }
      const dayMap: Record<string, number> = {};
      if (arr.length > 0) {
        const { dateKey, valueKey } = inferKeys(arr[0]);
        if (dateKey && valueKey) {
          for (const it of arr) {
            const d = it[dateKey];
            const v = it[valueKey];
            const iso = typeof d === "string" ? d.slice(0, 10) : toISODate(new Date(d));
            const num = typeof v === "number" ? v : Number(v);
            if (!Number.isNaN(num)) {
              dayMap[iso] = (dayMap[iso] || 0) + num; // Wh par jour
            }
          }
        }
      }

      // 2) Utilisateur courant
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(authError.message);
      const userId = userData?.user?.id;
      if (!userId) {
        toast.error("Veuillez vous connecter pour analyser vos logements.");
        setIsAnalyzing(false);
        return;
      }

      // 3) Uniquement les rooms de l'utilisateur
      const { data: rooms, error: roomsError } = await supabase
        .from("user_rooms")
        .select("room_id, room_name, user_id")
        .eq("user_id", userId);
      if (roomsError) throw new Error(roomsError.message);
      if (!rooms || rooms.length === 0) {
        setResRows([]);
        toast.message("Aucun logement trouvé pour votre compte.");
        return;
      }

      // 4) Récupérer les réservations Krossbooking par room
      const allResArrays = await Promise.all(
        rooms.map(async (r: any) => {
          const { data, error } = await supabase.functions.invoke("krossbooking-proxy", {
            body: { action: "get_reservations_for_room", id_room: r.room_id },
          });
          if (error) {
            console.warn("Erreur KB room", r.room_id, error);
            return [];
          }
          const list = (data && (data as any).data) || [];
          return list.map((x: any) => ({ ...x, __room_name: r.room_name, __room_id: r.room_id }));
        })
      );
      const rawReservations = allResArrays.flat();

      // 5) Filtrer par chevauchement de période [start, end)
      const startD = new Date(start);
      const endD = new Date(end);
      const filtered = rawReservations.filter((res: any) => {
        const arrivalStr = String(res.arrival || "");
        const departureStr = String(res.departure || "");
        if (!isValidDateStr(arrivalStr) || !isValidDateStr(departureStr)) return false;
        const a = new Date(arrivalStr);
        const b = new Date(departureStr);
        return a < endD && b > startD;
      });

      // 6) Calcul kWh et coût par résa
      const p = Number((pricePerKWh || "").replace(",", "."));
      const rows: ReservationCostRow[] = filtered.map((res: any) => {
        const id = String(res.id_reservation ?? res.id ?? "");
        const arrivalStr = String(res.arrival);
        const departureStr = String(res.departure);
        const nights = Math.max(
          0,
          Math.round((new Date(departureStr).getTime() - new Date(arrivalStr).getTime()) / (24 * 3600 * 1000))
        );
        // jours à sommer: [arrival, departure)
        const days = eachDayStrings(arrivalStr, departureStr);
        let sumWh = 0;
        for (const d of days) {
          if (dayMap[d] != null) sumWh += dayMap[d];
        }
        const energyKWh = sumWh / 1000;
        const costEUR = p > 0 ? energyKWh * p : 0;
        return {
          id,
          roomName: res.__room_name,
          arrival: arrivalStr,
          departure: departureStr,
          nights,
          energyKWh,
          costEUR,
        };
      });

      rows.sort((a, b) => (a.arrival < b.arrival ? -1 : a.arrival > b.arrival ? 1 : 0));
      setResRows(rows);
      toast.success("Analyse par réservation terminée");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erreur lors de l'analyse des réservations");
      setResRows([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const [showDebug, setShowDebug] = React.useState(false);
  const [debugInfo, setDebugInfo] = React.useState<any>(null);
  // Vue du graphique: 'area' ou 'bars'
  const [chartView, setChartView] = React.useState<"area" | "bars">("bars");
  // Limite au-delà de laquelle la vue colonnes devient illisible
  const barsPointLimit = 220;

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-400" />
            <h1 className="text-2xl md:text-3xl font-bold">Conso Électricité (Linky)</h1>
          </div>
          {/* Bouton Paramètres ouvrant le popup */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" title="Paramètres">
                <Settings className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Mes paramètres (stockés localement)</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground mb-2">
                Les informations sont chargées et enregistrées automatiquement dans votre profil (aucun stockage local).
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="prm">PRM (14 chiffres)</Label>
                  <div className="relative">
                    <Input
                      id="prm"
                      inputMode="numeric"
                      pattern="\d{14}"
                      placeholder="Ex: 12345678901234"
                      value={prm}
                      onChange={(e) => setPrm(e.target.value.replace(/\D/g, "").slice(0, 14))}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                      onClick={() => copyToClipboard(prm, "PRM")}
                      disabled={!prm}
                      title="Copier le PRM"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="token">Token Conso API</Label>
                  <div className="relative">
                    <Input
                      id="token"
                      type={showToken ? "text" : "password"}
                      placeholder="Bearer token"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowToken((v) => !v)}
                        title={showToken ? "Masquer le token" : "Afficher le token"}
                      >
                        {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(token, "Token")}
                        disabled={!token}
                        title="Copier le token"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ces valeurs sont sauvegardées sur cet appareil (localStorage).
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="price_popup">Prix par kWh (€)</Label>
                  <Input
                    id="price_popup"
                    inputMode="decimal"
                    placeholder="Ex: 0.25"
                    value={pricePerKWh}
                    onChange={(e) => setPricePerKWh(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    La valeur est sauvegardée dans votre profil.
                  </p>
                </div>

                <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
                  <Button className="w-full sm:w-auto" variant="default" onClick={async () => {
                    const { data: userData, error: authError } = await supabase.auth.getUser();
                    if (authError) { toast.error(authError.message); return; }
                    const userId = userData?.user?.id;
                    if (!userId) { toast.error("Veuillez vous connecter."); return; }
                    const payload: any = {
                      conso_prm: prm || null,
                      conso_token: token || null,
                      conso_price_per_kwh: pricePerKWh ? Number(String(pricePerKWh).replace(",", ".")) : null
                    };
                    const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
                    if (error) { toast.error(error.message); return; }
                    toast.success("Paramètres enregistrés dans votre profil.");
                  }}>
                    Enregistrer dans mon profil
                  </Button>
                  <Button className="w-full sm:w-auto" variant="outline" onClick={async () => {
                    const { data: userData, error: authError } = await supabase.auth.getUser();
                    if (authError) { toast.error(authError.message); return; }
                    const userId = userData?.user?.id;
                    if (!userId) { toast.error("Veuillez vous connecter."); return; }
                    const { data, error } = await supabase
                      .from("profiles")
                      .select("conso_prm, conso_token, conso_price_per_kwh")
                      .eq("id", userId)
                      .single();
                    if (error) { toast.error(error.message); return; }
                    setPrm(data?.conso_prm || "");
                    setToken(data?.conso_token || "");
                    setPricePerKWh(data?.conso_price_per_kwh != null ? String(data?.conso_price_per_kwh) : "");
                    toast.success("Paramètres chargés depuis votre profil.");
                  }}>
                    Recharger depuis mon profil
                  </Button>
                  <p className="text-xs text-muted-foreground ml-auto">
                    Stockage 100% côté Supabase (aucun stockage local).
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-muted-foreground">
          Renseignez votre PRM, votre token et la période pour récupérer vos données Linky via Conso API.
        </p>
        <ElectricitySpark className="mt-4 mb-6" />

        {/* REMOVED: la section Mes paramètres affichée en plein page.
            Elle est désormais accessible via le bouton Paramètres (popup). */}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Requête</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label>Type de donnée</Label>
                <Select value={type} onValueChange={(v) => setType(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily_consumption">Consommation quotidienne</SelectItem>
                    <SelectItem value="consumption_load_curve">Courbe de charge (30 min)</SelectItem>
                    <SelectItem value="consumption_max_power">Puissance max quotidienne</SelectItem>
                    <SelectItem value="daily_production">Production quotidienne</SelectItem>
                    <SelectItem value="production_load_curve">Courbe de production (30 min)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sélecteur d'unité d'affichage */}
              <div className="flex flex-col gap-2">
                <Label>Unité d'affichage</Label>
                <Select value={unit} onValueChange={(v) => setUnit(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une unité" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Source: {isEnergyType ? "Wh (énergie)" : "W (puissance)"} — conversion appliquée au graphique.
                </p>
              </div>

              {/* Période affichée (lecture seule): 5 derniers jours */}
              <div className="flex flex-col gap-2">
                <Label>Période</Label>
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  {start || "—"} → {endInclusiveLabel || "—"} (inclus)
                </div>
                <p className="text-xs text-muted-foreground">
                  Affichage par défaut: 5 derniers jours jusqu'à aujourd'hui.
                </p>
              </div>

              <div className="flex items-end">
                <Button className="w-full" onClick={onSubmit} disabled={isFetching}>
                  {isFetching ? "Chargement..." : "Charger 5 derniers jours"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Consommation par réservation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-end gap-3 mb-4">
              <div className="text-sm text-muted-foreground flex-1">
                Calcule l'énergie totale (kWh) et le coût estimé (€) pour chaque réservation confirmée sur la période, en utilisant la consommation quotidienne.
              </div>
              <Button onClick={analyzeReservations} disabled={isAnalyzing}>
                {isAnalyzing ? "Analyse en cours..." : "Analyser les réservations"}
              </Button>
            </div>
            {resRows.length > 0 ? (
              <div className="overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="text-left p-2">Réservation</th>
                      <th className="text-left p-2">Logement</th>
                      <th className="text-left p-2">Arrivée</th>
                      <th className="text-left p-2">Départ</th>
                      <th className="text-right p-2">Nuits</th>
                      <th className="text-right p-2">Énergie (kWh)</th>
                      <th className="text-right p-2">Coût (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resRows.map((r) => (
                      <tr key={`${r.id}-${r.arrival}`} className="border-t">
                        <td className="p-2">{r.id || "-"}</td>
                        <td className="p-2">{r.roomName || "-"}</td>
                        <td className="p-2">{r.arrival}</td>
                        <td className="p-2">{r.departure}</td>
                        <td className="p-2 text-right">{r.nights}</td>
                        <td className="p-2 text-right">
                          {r.energyKWh.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-right">
                          {r.costEUR.toLocaleString(undefined, { style: "currency", currency: "EUR" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Aucune donnée à afficher. Cliquez sur "Analyser les réservations".
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Résultats</CardTitle>
          </CardHeader>
          <CardContent>
            {!params ? (
              <p className="text-muted-foreground">Renseignez les paramètres puis cliquez sur "Charger".</p>
            ) : isFetching ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : (
              <>
                {isError && (
                  <Alert variant="destructive" className="mb-3">
                    <AlertTitle>Erreur de récupération</AlertTitle>
                    <AlertDescription>
                      {(error as any)?.message || "Une erreur s'est produite."}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Barre d'actions: Refresh + Logs */}
                <div className="flex items-center justify-end gap-2 mb-3">
                  <Button variant="ghost" size="sm" onClick={forceRefresh} title="Forcer l'actualisation">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Forcer l'actualisation
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowDebug((v) => !v)} title="Afficher les logs">
                    {showDebug ? "Masquer les logs" : "Afficher les logs"}
                  </Button>
                </div>

                {showDebug && (
                  <div className="mb-4 rounded-md border bg-muted/30 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">Logs du dernier appel</div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2)).then(() =>
                            toast.success("Logs copiés")
                          )
                        }
                      >
                        Copier
                      </Button>
                    </div>
                    <pre className="text-xs whitespace-pre-wrap break-words">
                      {debugInfo ? JSON.stringify(debugInfo, null, 2) : "Aucun log disponible"}
                    </pre>
                  </div>
                )}

                {chartDisplayData.length > 0 ? (
                  <>
                    {/* Badges info rapide */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge variant="secondary" className="text-xs">
                        <CalendarDays className="h-3.5 w-3.5 mr-1" />
                        {start || "—"} → {endInclusiveLabel || "—"} (inclus)
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Points: {nbPoints}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Unité: {unit}
                      </Badge>
                      {canComputeEnergyCost && pricePerKWh && Number((pricePerKWh || "").replace(",", ".")) > 0 && (
                        <Badge variant="outline" className="text-xs">
                          Prix: {Number((pricePerKWh || "").replace(",", ".").replace(/,/g, "."))?.toLocaleString(undefined, { maximumFractionDigits: 4 })} €/kWh
                        </Badge>
                      )}
                    </div>

                    <div className="mb-2">
                      <Tabs value={chartView} onValueChange={(v) => setChartView(v as any)} className="w-full">
                        <TabsList className="mb-3">
                          <TabsTrigger value="area">Vue aire</TabsTrigger>
                          <TabsTrigger value="bars" disabled={tooManyPointsForBars}>Vue colonnes</TabsTrigger>
                        </TabsList>
                        {tooManyPointsForBars && (
                          <p className="text-xs text-muted-foreground mb-2">
                            Période large: la vue "colonnes" est désactivée. Réduisez la période ou utilisez la vue aire.
                          </p>
                        )}
                        <TabsContent value="area" className="m-0">
                          <div className="h-[380px] md:h-[420px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartDisplayData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.28} />
                                    <stop offset="70%" stopColor="#6366f1" stopOpacity={0.06} />
                                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" opacity={0.6} />
                                <XAxis
                                  dataKey="name"
                                  minTickGap={18}
                                  tickLine={false}
                                  axisLine={false}
                                  tick={{ fontSize: 12, fill: "#6b7280" }}
                                  tickFormatter={(v: any) => String(v).replace("T", " ").slice(0, 16)}
                                />
                                <YAxis
                                  tick={{ fontSize: 12, fill: "#6b7280" }}
                                  tickLine={false}
                                  axisLine={false}
                                  width={64}
                                  tickFormatter={(v: number) =>
                                    `${v.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`
                                  }
                                  domain={[0, "auto"]}
                                />
                                {showCost && (
                                  <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    tick={{ fontSize: 12, fill: "#6b7280" }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={64}
                                    tickFormatter={(v: number) =>
                                      Number(v).toLocaleString(undefined, { style: "currency", currency: "EUR" })
                                    }
                                    domain={[0, "auto"]}
                                  />
                                )}
                                <Tooltip
                                  wrapperStyle={{ outline: "none" }}
                                  contentStyle={{
                                    background: "rgba(17, 24, 39, 0.92)",
                                    border: "1px solid #374151",
                                    borderRadius: 8,
                                    boxShadow:
                                      "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
                                  }}
                                  labelStyle={{ color: "#e5e7eb", fontWeight: 600 }}
                                  itemStyle={{ color: "#e5e7eb" }}
                                  formatter={(val: any, name: any) => {
                                    const n = String(name);
                                    if (n === "Coût (€)") {
                                      return [
                                        Number(val).toLocaleString(undefined, { style: "currency", currency: "EUR" }),
                                        "Coût (€)",
                                      ];
                                    }
                                    return [
                                      `${Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`,
                                      "Valeur",
                                    ];
                                  }}
                                />
                                <Legend verticalAlign="top" height={28} wrapperStyle={{ paddingBottom: 6 }} />
                                <Area
                                  name="Valeur"
                                  type="monotoneX"
                                  dataKey="value"
                                  stroke="#6366f1"
                                  strokeWidth={2.5}
                                  fill="url(#colorValue)"
                                  dot={false}
                                  activeDot={{ r: 3, stroke: "#6366f1", fill: "#fff" }}
                                  connectNulls
                                  animationDuration={500}
                                />
                                {showCost && (
                                  <Area
                                    name="Coût (€)"
                                    yAxisId="right"
                                    type="monotoneX"
                                    dataKey="cost"
                                    stroke="#10b981"
                                    strokeWidth={2.5}
                                    strokeDasharray="6 4"
                                    fill="transparent"
                                    fillOpacity={0}
                                    dot={false}
                                    activeDot={{ r: 3, stroke: "#10b981", fill: "#fff" }}
                                    connectNulls
                                    animationDuration={500}
                                    legendType="line"
                                  />
                                )}
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </TabsContent>
                        <TabsContent value="bars" className="m-0">
                          <div className="h-[380px] md:h-[420px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart 
                                data={chartDisplayData} 
                                margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
                                barCategoryGap="22%"
                                barGap={4}
                              >
                                <defs>
                                  <linearGradient id="colValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.95} />
                                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.85} />
                                  </linearGradient>
                                  <pattern id="costPattern" patternUnits="userSpaceOnUse" width="6" height="6">
                                    <rect width="6" height="6" fill="#10b981" opacity="0.25" />
                                    <path d="M0,6 l6,-6 M-1,1 l2,-2 M5,7 l2,-2" stroke="#10b981" strokeWidth="1" />
                                  </pattern>
                                  <pattern id="noDataPattern" patternUnits="userSpaceOnUse" width="6" height="6">
                                    <rect width="6" height="6" fill="#9ca3af" opacity="0.25" />
                                    <path d="M0,0 l6,6" stroke="#9ca3af" strokeWidth="1" />
                                  </pattern>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" opacity={0.6} />
                                <XAxis
                                  dataKey="name"
                                  minTickGap={18}
                                  tickLine={false}
                                  axisLine={false}
                                  tick={{ fontSize: 12, fill: "#6b7280" }}
                                  tickFormatter={(v: any) => String(v).replace("T", " ").slice(0, 16)}
                                />
                                <YAxis
                                  tick={{ fontSize: 12, fill: "#6b7280" }}
                                  tickLine={false}
                                  axisLine={false}
                                  width={64}
                                  tickFormatter={(v: number) =>
                                    `${v.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`
                                  }
                                  domain={[0, "auto"]}
                                />
                                {showCost && (
                                  <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    tick={{ fontSize: 12, fill: "#6b7280" }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={64}
                                    tickFormatter={(v: number) =>
                                      Number(v).toLocaleString(undefined, { style: "currency", currency: "EUR" })
                                    }
                                    domain={[0, "auto"]}
                                  />
                                )}
                                <Tooltip
                                  wrapperStyle={{ outline: "none" }}
                                  contentStyle={{
                                    background: "rgba(17, 24, 39, 0.92)",
                                    border: "1px solid #374151",
                                    borderRadius: 8,
                                    boxShadow:
                                      "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
                                  }}
                                  labelStyle={{ color: "#e5e7eb", fontWeight: 600 }}
                                  itemStyle={{ color: "#e5e7eb" }}
                                  formatter={(val: any, name: any, item: any) => {
                                    const n = String(name);
                                    const nd = item?.payload?.noData;
                                    if (nd) {
                                      return ["Pas de donnée", n];
                                    }
                                    if (n === "Coût (€)") {
                                      return [
                                        Number(val).toLocaleString(undefined, { style: "currency", currency: "EUR" }),
                                        "Coût (€)",
                                      ];
                                    }
                                    return [
                                      `${Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`,
                                      "Valeur",
                                    ];
                                  }}
                                />
                                <Legend verticalAlign="top" height={28} wrapperStyle={{ paddingBottom: 6 }} />
                                <Bar
                                  name="Valeur"
                                  dataKey="value"
                                  fill="url(#colValue)"
                                  opacity={1}
                                  radius={[6, 6, 0, 0]}
                                  barSize={16}
                                  isAnimationActive
                                  animationDuration={500}
                                  label={renderNoDataLabel}
                                >
                                  {chartDisplayData.map((d: any, i: number) => (
                                    <Cell key={`v-${i}`} fill={d.noData ? "url(#noDataPattern)" : "url(#colValue)"} />
                                  ))}
                                </Bar>
                                {showCost && (
                                  <Bar
                                    name="Coût (€)"
                                    yAxisId="right"
                                    dataKey="cost"
                                    fill="url(#costPattern)"
                                    stroke="#10b981"
                                    strokeWidth={1}
                                    radius={[6, 6, 0, 0]}
                                    barSize={12}
                                    isAnimationActive
                                    animationDuration={500}
                                  >
                                    {chartDisplayData.map((d: any, i: number) => (
                                      <Cell key={`c-${i}`} fill={d.noData ? "url(#noDataPattern)" : "url(#costPattern)"} />
                                    ))}
                                  </Bar>
                                )}
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground mb-2">
                      Aucune donnée exploitable en tableau trouvée pour les paramètres donnés.
                    </p>
                    {rawJson && (
                      <div className="rounded-md border bg-muted/30 p-3 max-h-80 overflow-auto">
                        <pre className="text-xs whitespace-pre-wrap break-words">{rawJson}</pre>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ElectricityConsumptionPage;