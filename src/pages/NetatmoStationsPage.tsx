"use client";

import React from "react";
import MainLayout from "@/components/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";

type StationDevice = {
  _id?: string;
  id?: string;
  station_name?: string;
  module_name?: string;
  modules?: StationModule[];
};

type StationModule = {
  _id?: string;
  id?: string;
  module_name?: string;
  type?: string;
};

const SCALES = ["30min", "1hour", "3hours", "1day", "1week", "1month"] as const;

// Types (simplifiés, multi-sélection)
const TYPE_OPTIONS = [
  { key: "temperature", label: "Température (°C)" },
  { key: "min_temp", label: "Min Temp" },
  { key: "max_temp", label: "Max Temp" },
  { key: "humidity", label: "Humidité (%)" },
  { key: "co2", label: "CO₂ (ppm)" },
  { key: "pressure", label: "Pression (bar)" },
  { key: "noise", label: "Bruit (dB)" },
  { key: "rain", label: "Pluie (mm)" },
  { key: "sum_rain", label: "Pluie (cumul)" },
  { key: "windstrength", label: "Vent (force)" },
  { key: "guststrength", label: "Rafales (force)" },
] as const;

// Construire un tableau unifié pour multi-types, timestamps exacts (real_time)
function buildUnifiedPoints(data: any, selectedTypeKeys: string[]) {
  const items = Array.isArray(data?.body?.items) ? data.body.items : [];
  if (!items.length) return { points: [], seriesKeys: selectedTypeKeys };

  const beg = Number(items[0]?.beg_time);
  const step = Number(items[0]?.step_time);
  const hasValidTs = Number.isFinite(beg) && Number.isFinite(step);

  // seriesMap: type -> valeurs[]
  const seriesMap: Record<string, Array<number | null>> = {};
  let fallbackIdx = 0;

  for (const it of items) {
    const v = it?.value;
    const itemType: any = it?.type ?? it?.types ?? it?.measure_type ?? null;

    const toNumber = (x: any) => {
      const n = Array.isArray(x) ? Number(x[0]) : Number(x);
      return Number.isNaN(n) ? null : n;
    };

    if (Array.isArray(v) && Array.isArray(v[0])) {
      // Plusieurs séries dans un même item: v = [ [samples type1], [samples type2], ... ]
      const arrs = v.map((arr: any[]) => arr.map(toNumber));
      const names: string[] = Array.isArray(itemType) ? itemType.map((s: any) => String(s)) : [];
      arrs.forEach((series: Array<number | null>, i: number) => {
        const key = names[i] || selectedTypeKeys[i] || `series_${fallbackIdx++}`;
        seriesMap[key] = series;
      });
    } else if (Array.isArray(v)) {
      // Une seule série pour cet item
      const series = v.map(toNumber);
      const key =
        (Array.isArray(itemType) && typeof itemType[0] === "string")
          ? String(itemType[0])
          : (typeof itemType === "string"
              ? itemType
              : (selectedTypeKeys[fallbackIdx] || `series_${fallbackIdx}`));
      fallbackIdx += 1;
      seriesMap[key] = series;
    }
  }

  // Ordonner les clés: préférer l'ordre des types sélectionnés, puis le reste
  const keysOrdered = [
    ...selectedTypeKeys.filter((k) => k in seriesMap),
    ...Object.keys(seriesMap).filter((k) => !selectedTypeKeys.includes(k)),
  ];

  const maxLen = Math.max(0, ...Object.values(seriesMap).map((arr) => arr.length));
  const points: any[] = [];
  for (let i = 0; i < maxLen; i++) {
    const ts = hasValidTs ? beg + i * step : undefined;
    const label = ts ? new Date(ts * 1000).toLocaleString() : String(i);
    const row: any = { ts, label };
    for (const key of keysOrdered) {
      const val = seriesMap[key]?.[i];
      row[key] = typeof val === "number" ? val : (val ?? null);
    }
    points.push(row);
  }

  return { points, seriesKeys: keysOrdered };
}

const NetatmoStationsPage: React.FC = () => {
  const [stationsData, setStationsData] = React.useState<any | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = React.useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = React.useState<string | null>(null);

  const [scale, setScale] = React.useState<(typeof SCALES)[number]>("1hour");
  const [selectedTypes, setSelectedTypes] = React.useState<Set<string>>(new Set(["temperature"]));
  const [dateBegin, setDateBegin] = React.useState<string>("");
  const [dateEnd, setDateEnd] = React.useState<string>("");
  const [datePreset, setDatePreset] = React.useState<string>("today"); // NEW: preset
  const [limit, setLimit] = React.useState<number>(256);
  const [optimize, setOptimize] = React.useState<boolean>(true);
  const [realTime, setRealTime] = React.useState<boolean>(true); // CHANGED: true par défaut

  const [loading, setLoading] = React.useState(false);
  const [measures, setMeasures] = React.useState<any | null>(null);
  const [chartData, setChartData] = React.useState<any[]>([]); // multi-séries (lignes dynamiques)
  const [seriesTypes, setSeriesTypes] = React.useState<string[]>(["temperature"]); // NEW: pour rendu dynamique

  const devices: StationDevice[] = React.useMemo(() => {
    const devs = stationsData?.body?.devices;
    return Array.isArray(devs) ? devs : [];
  }, [stationsData]);

  const currentDevice = React.useMemo(() => {
    if (!selectedDeviceId) return null;
    return devices.find((d) => (d._id || d.id) === selectedDeviceId) || null;
  }, [devices, selectedDeviceId]);

  const modules: StationModule[] = React.useMemo(() => {
    const mods = currentDevice?.modules;
    return Array.isArray(mods) ? mods : [];
  }, [currentDevice]);

  // NEW: couleurs simples par type
  const colorFor = (key: string) => {
    const palette = {
      temperature: "#2563eb",
      humidity: "#10b981",
      co2: "#ef4444",
      pressure: "#f59e0b",
      noise: "#6b7280",
      rain: "#0ea5e9",
      sum_rain: "#22c55e",
      windstrength: "#a855f7",
      guststrength: "#f43f5e",
      min_temp: "#3b82f6",
      max_temp: "#f59e0b",
    } as Record<string, string>;
    return palette[key] || "#374151";
  };

  // NEW: appliquer presets de date
  React.useEffect(() => {
    const now = new Date();
    if (datePreset === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      setDateBegin(start.toISOString().slice(0, 16));
      setDateEnd(end.toISOString().slice(0, 16));
    } else if (datePreset === "last7") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      setDateBegin(start.toISOString().slice(0, 16));
      setDateEnd(end.toISOString().slice(0, 16));
    }
  }, [datePreset]);

  async function loadStations() {
    setLoading(true);
    const { error, data } = await supabase.functions.invoke("netatmo-proxy", { body: { endpoint: "getstationsdata" } });
    setLoading(false);

    if (error) {
      const status = (error as any)?.status;
      if (status === 403) {
        toast.error("Accès Netatmo refusé (scope read_station manquant). Reconnectez Netatmo pour autoriser les stations météo.");
      } else if (status === 401) {
        toast.error("Session expirée. Veuillez vous reconnecter.");
      } else {
        toast.error(error.message || "Impossible de charger les stations Netatmo.");
      }
      return;
    }
    setStationsData(data);
    const firstDev = (data?.body?.devices || [])[0];
    const id = firstDev?._id || firstDev?.id || null;
    if (id) setSelectedDeviceId(String(id));
    const firstMod = (firstDev?.modules || [])[0];
    const mid = firstMod?._id || firstMod?.id || null;
    if (mid) setSelectedModuleId(String(mid));
    toast.success("Stations chargées.");
  }

  function toggleType(key: string) {
    const next = new Set(selectedTypes);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedTypes(next);
  }

  function toUnixSecLocal(dt: string): number | undefined {
    if (!dt) return undefined;
    const d = new Date(dt);
    const t = Math.floor(d.getTime() / 1000);
    return Number.isNaN(t) ? undefined : t;
    // Note: l'API attend Local Unix Time en secondes
  }

  async function loadMeasures() {
    if (!selectedDeviceId) {
      toast.error("Sélectionnez un device (station).");
      return;
    }
    const typesArr = Array.from(selectedTypes);
    if (typesArr.length === 0) {
      toast.error("Sélectionnez au moins un type de mesure.");
      return;
    }
    setLoading(true);
    const payload: any = {
      endpoint: "getmeasure",
      device_id: selectedDeviceId,
      scale,
      type: typesArr,
      limit,
      optimize,
      real_time: realTime,
    };
    if (selectedModuleId && selectedModuleId !== "__none__") payload.module_id = selectedModuleId;
    const begin = toUnixSecLocal(dateBegin);
    const end = toUnixSecLocal(dateEnd);
    if (typeof begin === "number") payload.date_begin = begin;
    if (typeof end === "number") payload.date_end = end;

    const { error, data } = await supabase.functions.invoke("netatmo-proxy", { body: payload });
    setLoading(false);
    if (error) {
      const status = (error as any)?.status;
      if (status === 403) {
        toast.error("Accès Netatmo refusé (vérifiez le scope read_station).");
      } else {
        toast.error(error.message || "Erreur de récupération des mesures.");
      }
      setMeasures(null);
      setChartData([]);
      setSeriesTypes(typesArr);
      return;
    }
    setMeasures(data);
    const unified = buildUnifiedPoints(data, typesArr);
    setChartData(unified.points);
    setSeriesTypes(unified.seriesKeys);
    if (unified.points.length === 0) {
      toast.message("Aucune donnée pour la période sélectionnée.");
    } else {
      toast.success("Mesures chargées (horodatage exact).");
    }
  }

  return (
    <MainLayout>
      <section className="container mx-auto py-10 md:py-16">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Intégration</Badge>
            <Badge variant="outline">Netatmo</Badge>
            <Badge>Stations météo</Badge>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Stations Météo Netatmo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-2">
                <Button className="w-full md:w-auto" onClick={loadStations} disabled={loading}>
                  {loading ? "Chargement..." : "Charger mes stations"}
                </Button>
                <Button variant="secondary" className="w-full md:w-auto" onClick={loadMeasures} disabled={loading || !selectedDeviceId}>
                  {loading ? "Chargement..." : "Charger mesures"}
                </Button>
              </div>

              {/* Sélection device/module */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Station (device)</Label>
                  <Select value={selectedDeviceId ?? ""} onValueChange={(v) => setSelectedDeviceId(v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choisir une station" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((d) => {
                        const id = String(d._id || d.id);
                        const name = d.station_name || d.module_name || id;
                        return <SelectItem key={id} value={id}>{name}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Module (optionnel)</Label>
                  <Select value={selectedModuleId ?? ""} onValueChange={(v) => setSelectedModuleId(v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choisir un module" />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.length === 0 ? (
                        <SelectItem value="__none__" disabled>Aucun module</SelectItem>
                      ) : modules.map((m) => {
                        const id = String(m._id || m.id);
                        const name = m.module_name || id;
                        return <SelectItem key={id} value={id}>{name}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Échelle (scale)</Label>
                  <Select value={scale} onValueChange={(v) => setScale(v as (typeof SCALES)[number])}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choisir une échelle" />
                    </SelectTrigger>
                    <SelectContent>
                      {SCALES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Types multi-sélection */}
              <div>
                <Label className="text-sm font-medium">Types de mesures</Label>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                  {TYPE_OPTIONS.map((t) => (
                    <div key={t.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`type-${t.key}`}
                        checked={selectedTypes.has(t.key)}
                        onCheckedChange={() => toggleType(t.key)}
                      />
                      <Label htmlFor={`type-${t.key}`} className="text-sm">{t.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Plage de dates + options avancées */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Preset</Label>
                  <Select value={datePreset} onValueChange={(v) => setDatePreset(v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choisir un preset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Aujourd'hui</SelectItem>
                      <SelectItem value="last7">7 derniers jours</SelectItem>
                      <SelectItem value="custom">Personnalisé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Date début</Label>
                  <Input
                    type="datetime-local"
                    value={dateBegin}
                    onChange={(e) => setDateBegin(e.target.value)}
                    className="mt-1"
                    disabled={datePreset !== "custom"}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Date fin</Label>
                  <Input
                    type="datetime-local"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="mt-1"
                    disabled={datePreset !== "custom"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Limit</Label>
                  <Input type="number" min={1} max={1024} value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="mt-1" />
                </div>
                <div className="flex items-center justify-between rounded border p-2">
                  <span className="text-sm">Optimize</span>
                  <Switch checked={optimize} onCheckedChange={setOptimize} />
                </div>
                <div className="flex items-center justify-between rounded border p-2">
                  <span className="text-sm">Real time (horodatage exact)</span>
                  <Switch checked={realTime} onCheckedChange={setRealTime} />
                </div>
              </div>

              {/* Graphique multi-séries */}
              <div>
                <Label className="text-sm font-medium">Graphique (valeurs en temps réel)</Label>
                {chartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    Aucune donnée disponible pour les paramètres choisis. Essayez de changer la plage de dates, le scale ou les types.
                  </p>
                ) : (
                  <div className="h-56 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {seriesTypes.map((t) => (
                          <Line key={t} type="monotone" dataKey={t} stroke={colorFor(t)} dot={false} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Tableau complet des points */}
              {chartData.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs border border-muted rounded">
                    <thead>
                      <tr className="bg-muted">
                        <th className="p-2 text-left">Horodatage</th>
                        {seriesTypes.map((t) => (
                          <th key={t} className="p-2 text-left">{t}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map((row, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">{row.label}</td>
                          {seriesTypes.map((t) => (
                            <td key={t} className="p-2">{typeof row[t] === "number" ? row[t] : (row[t] ?? "—")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Réponse brute */}
              {measures?.body?.items && (
                <div className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Réponse brute (getmeasure)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs whitespace-pre-wrap break-words bg-muted p-3 rounded">
                        {JSON.stringify(measures, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </MainLayout>
  );
};

export default NetatmoStationsPage;