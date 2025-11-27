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
import { useQuery } from "@tanstack/react-query";
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
  const [prm, setPrm] = React.useState<string>(() => localStorage.getItem("conso_prm") || "");
  const [token, setToken] = React.useState<string>(() => localStorage.getItem("conso_token") || "");
  const [type, setType] = React.useState<ConsoType>(() => (localStorage.getItem("conso_type") as ConsoType) || "daily_consumption");
  const [start, setStart] = React.useState<string>(() => localStorage.getItem("conso_start") || "");
  const [end, setEnd] = React.useState<string>(() => localStorage.getItem("conso_end") || "");
  const [showToken, setShowToken] = React.useState(false);

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

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["conso", params],
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
  });

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

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copié`);
    } catch {
      toast.error(`Impossible de copier ${label}`);
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

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Paramètres</CardTitle>
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
                  Astuce: le token est stocké localement sur votre appareil (localStorage).
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Type de donnée</Label>
                <Select value={type} onValueChange={(v) => setType(v as ConsoType)}>
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
                    {chartData.length > 0 ? (
                      <div className="h-72 mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#colorValue)" />
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

                    <div className="overflow-auto rounded-md border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/40">
                            <th className="text-left p-2">#</th>
                            <th className="text-left p-2">Clé</th>
                            <th className="text-left p-2">Valeur</th>
                          </tr>
                        </thead>
                        <tbody>
                          {normalizedArray.slice(0, 100).map((item: any, idx: number) => (
                            <tr key={idx} className="border-t">
                              <td className="p-2 align-top">{idx + 1}</td>
                              <td className="p-2 align-top">
                                <pre className="whitespace-pre-wrap break-words">
                                  {Object.keys(item).join(", ")}
                                </pre>
                              </td>
                              <td className="p-2 align-top">
                                <pre className="whitespace-pre-wrap break-words">
                                  {JSON.stringify(item, null, 2)}
                                </pre>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {normalizedArray.length > 100 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Affichage limité aux 100 premières entrées.
                      </p>
                    )}
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