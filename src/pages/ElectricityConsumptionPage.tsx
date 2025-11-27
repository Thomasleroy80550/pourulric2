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
} from "recharts";
import { Copy, Eye, EyeOff } from "lucide-react";

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

// Crée une clé de cache stable pour une combinaison de paramètres (sans inclure le token)
function makeCacheKey(p: { prm: string; type: ConsoType; start: string; end: string }) {
  return `${p.prm}::${p.type}::${p.start}::${p.end}`;
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
  const [type, setType] = React.useState<ConsoType>(() => (localStorage.getItem("conso_type") as ConsoType) || "daily_consumption");
  const [start, setStart] = React.useState<string>(() => localStorage.getItem("conso_start") || "");
  const [end, setEnd] = React.useState<string>(() => localStorage.getItem("conso_end") || "");
  const [showToken, setShowToken] = React.useState(false);
  // Prix par kWh (€), mémorisé localement
  const [pricePerKWh, setPricePerKWh] = React.useState<string>(() => localStorage.getItem("conso_price_per_kwh") || "");

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
      localStorage.setItem(`conso_cache_${key}`, JSON.stringify({ data: resp, cachedAt: new Date().toISOString() }));
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

  // Convertit la valeur selon l'unité sélectionnée
  const convertedChartData = React.useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
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
    return chartData.map((d) => ({ ...d, value: d.value * factor }));
  }, [chartData, unit, isEnergyType]);

  // Données pour le graphique avec série coût (€) sur l'axe droit
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
          // raw en Wh par point
          cost = (raw / 1000) * p; // kWh * €/kWh
        } else if (type === "consumption_load_curve" || type === "production_load_curve") {
          // raw en W moyen sur 30 minutes -> énergie point = W * 0.5 h -> kWh = W * 0.5 / 1000
          cost = (raw * 0.5) / 1000 * p;
        }
      }
      return {
        name: d.name,
        value: raw * factor,
        cost,
      };
    });
  }, [chartData, unit, isEnergyType, pricePerKWh, canComputeEnergyCost, type]);

  // Calcul énergie totale (kWh) en fonction du type retourné
  const energyKWhTotal = React.useMemo(() => {
    if (!chartData || chartData.length === 0) return 0;
    if (type === "daily_consumption" || type === "daily_production") {
      // valeurs en Wh -> somme puis conversion en kWh
      const sumWh = chartData.reduce((s, d) => s + (Number(d.value) || 0), 0);
      return sumWh / 1000;
    }
    if (type === "consumption_load_curve" || type === "production_load_curve") {
      // valeurs en W moyen sur 30 minutes -> énergie = W * 0.5 h -> kWh = W * 0.5 / 1000
      const sumW = chartData.reduce((s, d) => s + (Number(d.value) || 0), 0);
      return (sumW * 0.5) / 1000;
    }
    // Puissance max quotidienne: pas pertinent pour un coût basé sur l'énergie
    return 0;
  }, [chartData, type]);

  const totalCost = React.useMemo(() => {
    const p = Number((pricePerKWh || "").replace(",", "."));
    if (!canComputeEnergyCost || Number.isNaN(p) || p <= 0) return 0;
    return energyKWhTotal * p;
  }, [energyKWhTotal, pricePerKWh, canComputeEnergyCost]);

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
    localStorage.setItem("conso_last_params", JSON.stringify({ prm, token, type, start, end }));

    setParams({ prm, token, type, start, end });
    toast.success("Requête envoyée. Récupération des données...");
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Conso Électricité (Linky)</h1>
        <p className="text-muted-foreground mb-6">
          Renseignez votre PRM, votre token et la période pour récupérer vos données Linky via Conso API.
        </p>

        {/* Section dédiée aux paramètres persistés */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Mes paramètres (stockés localement)</CardTitle>
          </CardHeader>
          <CardContent>
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
            </div>
          </CardContent>
        </Card>

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
                    {chartDisplayData.length > 0 ? (
                      <div className="h-72 mb-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartDisplayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis
                              tick={{ fontSize: 12 }}
                              tickFormatter={(v: number) =>
                                `${v.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`
                              }
                            />
                            {/* Axe droit pour le coût (€) */}
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              tick={{ fontSize: 12 }}
                              tickFormatter={(v: number) =>
                                Number(v).toLocaleString(undefined, { style: "currency", currency: "EUR" })
                              }
                            />
                            <Tooltip
                              formatter={(val: any, name: any) => {
                                const n = String(name);
                                if (n === "Coût") {
                                  return [
                                    Number(val).toLocaleString(undefined, { style: "currency", currency: "EUR" }),
                                    "Coût",
                                  ];
                                }
                                return [
                                  `${Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`,
                                  "Valeur",
                                ];
                              }}
                            />
                            <Legend />
                            <Area
                              name="Valeur"
                              type="monotone"
                              dataKey="value"
                              stroke="#3b82f6"
                              fill="url(#colorValue)"
                            />
                            <Area
                              name="Coût"
                              yAxisId="right"
                              type="monotone"
                              dataKey="cost"
                              stroke="#22c55e"
                              fill="url(#colorCost)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <Alert className="mb-4">
                        <AlertTitle>Format de données non reconnu pour l'affichage graphique</AlertTitle>
                        <AlertDescription>
                          Les données sont affichées ci-dessous en format brut.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Résumé énergie + coût */}
                    <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">Énergie totale estimée</div>
                        <div className="text-lg font-semibold">
                          {canComputeEnergyCost
                            ? `${energyKWhTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} kWh`
                            : "N/A"}
                        </div>
                      </div>
                      <div className="rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">Coût estimé</div>
                        <div className="text-lg font-semibold">
                          {canComputeEnergyCost && Number((pricePerKWh || "").replace(",", ".")) > 0
                            ? `${totalCost.toLocaleString(undefined, { style: "currency", currency: "EUR" })}`
                            : "Saisissez un prix par kWh"}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mb-4">Unité d'affichage du graphique: {unit}</p>
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