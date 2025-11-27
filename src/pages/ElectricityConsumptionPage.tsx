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
} from "recharts";
import { Copy, Eye, EyeOff, Zap, Settings, Euro, TrendingUp, Gauge, CalendarDays } from "lucide-react";
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

  const [prm, setPrm] = React.useState<string>(() => localStorage.getItem("conso_prm") || "");
  const [token, setToken] = React.useState<string>(() => localStorage.getItem("conso_token") || "");
  const [type, setType] = React.useState<ConsoType>(
    () => (localStorage.getItem("conso_type") as ConsoType) || "daily_consumption"
  );
  const [start, setStart] = React.useState<string>(() => localStorage.getItem("conso_start") || "");
  const [end, setEnd] = React.useState<string>(() => localStorage.getItem("conso_end") || "");
  const [showToken, setShowToken] = React.useState(false);
  const [pricePerKWh, setPricePerKWh] = React.useState<string>(
    () => localStorage.getItem("conso_price_per_kwh") || ""
  );
  const [resRows, setResRows] = React.useState<ReservationCostRow[]>([]);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [chartView, setChartView] = React.useState<"area" | "bars">("area");

  React.useEffect(() => {
    localStorage.setItem("conso_price_per_kwh", pricePerKWh);
  }, [pricePerKWh]);

  // Détermine la catégorie d'unité selon le type choisi
  const isEnergyType = React.useMemo(
    () => ["daily_consumption", "daily_production"].includes(type),
    [type]
  );

  // Unité affichée (par défaut: kWh pour l'énergie, kW pour la puissance)
  const [unit, setUnit] = React.useState<string>(() => {
    const saved = localStorage.getItem("conso_unit");
    if (saved) return saved;
    return ["daily_consumption", "daily_production"].includes(
      (localStorage.getItem("conso_type") as any) || "daily_consumption"
    )
      ? "kWh"
      : "kW";
  });

  // Mémoriser l'unité choisie
  React.useEffect(() => {
    localStorage.setItem("conso_unit", unit);
  }, [unit]);

  // Ajuster automatiquement l'unité par défaut quand le type change (sans écraser le choix si cohérent)
  React.useEffect(() => {
    const desiredDefault = isEnergyType ? "kWh" : "kW";
    if (
      (isEnergyType && !["Wh", "kWh", "MWh"].includes(unit)) ||
      (!isEnergyType && !["W", "kW"].includes(unit))
    ) {
      setUnit(desiredDefault);
    }
  }, [isEnergyType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Définir avant usage dans chartDisplayData
  const canComputeEnergyCost = type !== "consumption_max_power";

  // Sauvegarde auto des champs pour éviter de perdre les valeurs en quittant la page
  React.useEffect(() => {
    localStorage.setItem("conso_prm", prm);
  }, [prm]);

  React.useEffect(() => {
    localStorage.setItem("conso_token", token);
  }, [token]);

  React.useEffect(() => {
    localStorage.setItem("conso_type", type);
  }, [type]);

  React.useEffect(() => {
    localStorage.setItem("conso_start", start);
  }, [start]);

  React.useEffect(() => {
    localStorage.setItem("conso_end", end);
  }, [end]);

  const [params, setParams] = React.useState<FetchParams | null>(null);
  const paramKey = React.useMemo(() => (params ? makeCacheKey(params) : null), [params]);

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["conso", paramKey],
    queryFn: async () => {
      if (!params) return null;
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
        throw new Error(error.message || "Erreur depuis la fonction Edge");
      }
      return data;
    },
    enabled: !!params,
    // Sur succès: enregistrer en cache local + mémoriser la dernière recherche
    onSuccess: (resp) => {
      if (!params) return;
      const key = makeCacheKey(params);
      localStorage.setItem(
        `conso_cache_${key}`,
        JSON.stringify({ data: resp, cachedAt: new Date().toISOString() })
      );
      localStorage.setItem("conso_last_key", key);
      localStorage.setItem("conso_last_params", JSON.stringify(params));
    },
  });

  // Au montage: restaurer la dernière recherche depuis le cache et l'afficher instantanément
  React.useEffect(() => {
    const lastKey = localStorage.getItem("conso_last_key");
    const lastParamsRaw = localStorage.getItem("conso_last_params");
    if (!lastKey || !lastParamsRaw) return;
    try {
      const lastParams = JSON.parse(lastParamsRaw) as FetchParams;
      const cachedRaw = localStorage.getItem(`conso_cache_${lastKey}`);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (cached?.data) {
          queryClient.setQueryData(["conso", lastKey], cached.data);
        }
      }
      // Déclenche l'affichage immédiat + un refetch en arrière-plan
      setParams(lastParams);
    } catch {
      // ignore parsing issues
    }
  }, [queryClient]);

  // Planifier un rechargement automatique chaque jour à 00:00
  React.useEffect(() => {
    let timeoutId: number | undefined;
    function scheduleMidnightRefetch() {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1, 0); // 00:00:01
      const ms = next.getTime() - now.getTime();
      timeoutId = window.setTimeout(() => {
        // Refetch la requête courante si des paramètres sont définis
        if (params) refetch();
        scheduleMidnightRefetch();
      }, ms);
    }
    scheduleMidnightRefetch();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [refetch, params]);

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

  // Indicateurs: jours de période, moyenne/jour, pic et points
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

  const unitOptions = isEnergyType ? ["Wh", "kWh", "MWh"] : ["W", "kW"];

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copié`);
    } catch {
      toast.error(`Impossible de copier ${label}`);
    }
  };

  // Gestion explicite des paramètres stockés
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

  // Enregistrer PRM/Token dans le profil Supabase
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

  // Charger PRM/Token depuis le profil Supabase
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
    const newPrm = data?.conso_prm || "";
    const newToken = data?.conso_token || "";
    setPrm(newPrm);
    setToken(newToken);
    // synchro localStorage via useEffect déjà en place
    toast.success("Paramètres chargés depuis votre profil.");
  };

  // Construit une map { 'YYYY-MM-DD': Wh } à partir d'une réponse daily_consumption
  const buildDailyConsoMap = (dataAny: any): Record<string, number> => {
    let arr: any[] = [];
    if (Array.isArray(dataAny)) arr = dataAny;
    else if (dataAny && typeof dataAny === "object") {
      for (const k of Object.keys(dataAny)) {
        const v = dataAny[k];
        if (Array.isArray(v)) {
          arr = v;
          break;
        }
      }
    }
    const map: Record<string, number> = {};
    if (arr.length === 0) return map;
    const { dateKey, valueKey } = inferKeys(arr[0]);
    if (!dateKey || !valueKey) return map;
    for (const it of arr) {
      const d = it[dateKey];
      const v = it[valueKey];
      const iso = typeof d === "string" ? d.slice(0, 10) : toISODate(new Date(d));
      const num = typeof v === "number" ? v : Number(v);
      if (!Number.isNaN(num)) map[iso] = (map[iso] || 0) + num; // Wh par jour
    }
    return map;
  };

  // Récupère la conso daily pour la période et renvoie une map date->Wh (utilise cache local si dispo)
  const getDailyConsoMapForRange = async (): Promise<Record<string, number>> => {
    const key = makeCacheKey({ prm, type: "daily_consumption", start, end });
    const cachedRaw = localStorage.getItem(`conso_cache_${key}`);
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw);
        if (cached?.data) return buildDailyConsoMap(cached.data);
      } catch {
        // ignore
      }
    }
    const { data, error } = await supabase.functions.invoke("conso-proxy", {
      body: { prm, token, type: "daily_consumption", start, end },
    });
    if (error) throw new Error(error.message || "Erreur conso daily");
    // cache pour usages ultérieurs
    localStorage.setItem(
      `conso_cache_${key}`,
      JSON.stringify({ data, cachedAt: new Date().toISOString() })
    );
    return buildDailyConsoMap(data);
  };

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
      // 1) Conso daily mappée par jour
      const dayMap = await getDailyConsoMapForRange();

      // 1bis) Récupérer l'utilisateur courant
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(authError.message);
      const userId = userData?.user?.id;
      if (!userId) {
        toast.error("Veuillez vous connecter pour analyser vos logements.");
        setIsAnalyzing(false);
        return;
      }

      // 2) Récupérer UNIQUEMENT les rooms de l'utilisateur connecté
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

      // 3) Récupérer les réservations par room
      const allResArrays = await Promise.all(
        rooms.map(async (r: any) => {
          const { data, error } = await supabase.functions.invoke("krossbooking-proxy", {
            body: { action: "get_reservations_for_room", id_room: r.room_id },
          });
          if (error) {
            console.warn("Erreur KB room", r.room_id, error);
            return [];
          }
          const arr = (data && data.data) || [];
          // Attache room info pour faciliter l'affichage
          return arr.map((x: any) => ({ ...x, __room_name: r.room_name, __room_id: r.room_id }));
        })
      );
      const rawReservations = allResArrays.flat();

      // 4) Filtrer uniquement par chevauchement [start, end)
      const startD = new Date(start);
      const endD = new Date(end);
      const filtered = rawReservations.filter((res: any) => {
        const arrivalStr = String(res.arrival || "");
        const departureStr = String(res.departure || "");
        if (!isValidDateStr(arrivalStr) || !isValidDateStr(departureStr)) return false;
        const a = new Date(arrivalStr);
        const b = new Date(departureStr);
        // chevauchement simple: a < end && b > start
        return a < endD && b > startD;
      });

      // 5) Calcul kWh et coût par résa
      const p = Number((pricePerKWh || "").replace(",", "."));
      const rows: ReservationCostRow[] = filtered.map((res: any) => {
        const id = String(res.id_reservation ?? res.id ?? "");
        const arrivalStr = String(res.arrival);
        const departureStr = String(res.departure);
        const nights = Math.max(
          0,
          Math.round(
            (new Date(departureStr).getTime() - new Date(arrivalStr).getTime()) /
              (24 * 3600 * 1000)
          )
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

      // 6) Trier par arrivée
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

  const onSubmit = () => {
    // Basic validations
    if (!/^\d{14}$/.test(prm)) {
      toast.error("Le PRM doit contenir 14 chiffres.");
      return;
    }
    if (!token || token.length < 10) {
      toast.error("Veuillez renseigner votre token Conso API (Authorization Bearer).");
      return;
    }
    if (!isValidDateStr(start) || !isValidDateStr(end)) {
      toast.error("Veuillez renseigner des dates valides (YYYY-MM-DD).");
      return;
    }
    if (new Date(end) <= new Date(start)) {
      toast.error("La date de fin doit être postérieure à la date de début.");
      return;
    }

    // Persist minimal values for convenience
    localStorage.setItem("conso_prm", prm);
    localStorage.setItem("conso_token", token);
    localStorage.setItem("conso_type", type);
    localStorage.setItem("conso_start", start);
    localStorage.setItem("conso_end", end);

    // Seed affichage instantané depuis le cache si disponible
    const key = makeCacheKey({ prm, type, start, end });
    const cachedRaw = localStorage.getItem(`conso_cache_${key}`);
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw);
        if (cached?.data) {
          queryClient.setQueryData(["conso", key], cached.data);
        }
      } catch {
        // ignore parsing issues
      }
    }
    localStorage.setItem("conso_last_key", key);
    localStorage.setItem(
      "conso_last_params",
      JSON.stringify({ prm, token, type, start, end })
    );

    setParams({ prm, token, type, start, end });
    toast.success("Requête envoyée. Récupération des données...");
  };

  // Afficher la série coût seulement si un prix/kWh valide est présent et que le type s'y prête
  const showCost = React.useMemo(
    () => canComputeEnergyCost && Number((pricePerKWh || "").replace(",", ".")) > 0,
    [canComputeEnergyCost, pricePerKWh]
  );

  const chartDisplayData = React.useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
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
    return chartData.map((d) => {
      const raw = Number(d.value) || 0; // Wh (énergie) ou W (puissance) selon le type
      let cost: number | undefined = undefined;
      if (canComputeEnergyCost && p > 0) {
        if (type === "daily_consumption" || type === "daily_production") {
          // raw en Wh par point -> kWh
          cost = (raw / 1000) * p; // kWh * €/kWh
        } else if (type === "consumption_load_curve" || type === "production_load_curve") {
          // raw en W moyen sur 30 minutes -> énergie point = W * 0.5 h -> kWh = W * 0.5 / 1000
          cost = ((raw * 0.5) / 1000) * p;
        }
      }
      return {
        name: d.name,
        value: raw * factor,
        cost,
      };
    });
  }, [chartData, unit, isEnergyType, pricePerKWh, canComputeEnergyCost, type]);

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

                <div className="flex items-end gap-2">
                  <Button className="w-full" variant="default" onClick={handleSaveCredentials}>
                    Enregistrer
                  </Button>
                  <Button className="w-full" variant="outline" onClick={handleClearCredentials}>
                    Effacer
                  </Button>
                </div>
                <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
                  <Button className="w-full sm:w-auto" variant="secondary" onClick={saveCredentialsToProfile}>
                    Enregistrer dans mon profil
                  </Button>
                  <Button className="w-full sm:w-auto" variant="outline" onClick={loadCredentialsFromProfile}>
                    Charger depuis mon profil
                  </Button>
                  <p className="text-xs text-muted-foreground ml-auto">
                    Stockage chiffré côté Supabase recommandé pour éviter de perdre vos identifiants entre appareils.
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

              {/* Prix par kWh */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="price">Prix par kWh (€)</Label>
                <Input
                  id="price"
                  inputMode="decimal"
                  placeholder="Ex: 0.25"
                  value={pricePerKWh}
                  onChange={(e) => setPricePerKWh(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Le coût est calculé sur l'énergie estimée (kWh). Pour les courbes 30 min, W moyens → kWh via ×0,5 h.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="start">Début (inclus)</Label>
                <Input
                  id="start"
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="end">Fin (exclue)</Label>
                <Input
                  id="end"
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <Button className="w-full" onClick={onSubmit} disabled={isFetching}>
                  {isFetching ? "Chargement..." : "Charger"}
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
            ) : isError ? (
              <Alert variant="destructive">
                <AlertTitle>Erreur de récupération</AlertTitle>
                <AlertDescription>
                  {(error as any)?.message || "Une erreur s'est produite."}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {normalizedArray.length > 0 ? (
                  <>
                    {/* Indicateurs en tête */}
                    <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="rounded-md border p-4 bg-muted/30 hover:bg-muted/40 transition">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Zap className="h-4 w-4 text-yellow-400" /> Énergie totale
                        </div>
                        <div className="mt-1 text-xl font-semibold">
                          {canComputeEnergyCost
                            ? `${energyKWhTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} kWh`
                            : "N/A"}
                        </div>
                      </div>
                      <div className="rounded-md border p-4 bg-muted/30 hover:bg-muted/40 transition">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Euro className="h-4 w-4 text-emerald-500" /> Coût estimé
                        </div>
                        <div className="mt-1 text-xl font-semibold">
                          {canComputeEnergyCost && Number((pricePerKWh || "").replace(",", ".")) > 0
                            ? totalCost.toLocaleString(undefined, { style: "currency", currency: "EUR" })
                            : "—"}
                        </div>
                      </div>
                      <div className="rounded-md border p-4 bg-muted/30 hover:bg-muted/40 transition">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <TrendingUp className="h-4 w-4 text-blue-500" /> Moyenne/jour
                        </div>
                        <div className="mt-1 text-xl font-semibold">
                          {canComputeEnergyCost && periodDays > 0
                            ? `${avgKWhPerDay.toLocaleString(undefined, { maximumFractionDigits: 2 })} kWh/j`
                            : "—"}
                        </div>
                      </div>
                      <div className="rounded-md border p-4 bg-muted/30 hover:bg-muted/40 transition">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Gauge className="h-4 w-4 text-indigo-500" /> Pic
                        </div>
                        <div className="mt-1 text-xl font-semibold">
                          {`${peakDisplay.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`}
                        </div>
                      </div>
                    </div>

                    {/* Badges info rapide */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge variant="secondary" className="text-xs">
                        <CalendarDays className="h-3.5 w-3.5 mr-1" />
                        {start || "—"} → {end || "—"} (fin exclue)
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Points: {nbPoints}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Unité: {unit}
                      </Badge>
                      {canComputeEnergyCost && pricePerKWh && Number((pricePerKWh || "").replace(",", ".")) > 0 && (
                        <Badge variant="outline" className="text-xs">
                          Prix: {Number((pricePerKWh || "").replace(",", ".")).toLocaleString(undefined, { maximumFractionDigits: 4 })} €/kWh
                        </Badge>
                      )}
                    </div>

                    {chartDisplayData.length > 0 ? (
                      <div className="mb-2">
                        <Tabs value={chartView} onValueChange={(v) => setChartView(v as any)} className="w-full">
                          <TabsList className="mb-3">
                            <TabsTrigger value="area">Vue aire</TabsTrigger>
                            <TabsTrigger value="bars">Vue barres</TabsTrigger>
                          </TabsList>
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
                                <ComposedChart data={chartDisplayData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
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
                                  <Bar
                                    name="Valeur"
                                    dataKey="value"
                                    fill="#6366f1"
                                    opacity={0.9}
                                    radius={[4, 4, 0, 0]}
                                  />
                                  {showCost && (
                                    <Line
                                      name="Coût (€)"
                                      yAxisId="right"
                                      type="monotone"
                                      dataKey="cost"
                                      stroke="#10b981"
                                      strokeWidth={2.5}
                                      strokeDasharray="6 4"
                                      dot={false}
                                      activeDot={{ r: 3, stroke: "#10b981", fill: "#fff" }}
                                    />
                                  )}
                                </ComposedChart>
                              </ResponsiveContainer>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                    ) : (
                      <Alert className="mb-4">
                        <AlertTitle>Format de données non reconnu pour l'affichage graphique</AlertTitle>
                        <AlertDescription>
                          Les données sont affichées ci-dessous en format brut.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Légende d'unité déjà incluse dans les badges au-dessus */}
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