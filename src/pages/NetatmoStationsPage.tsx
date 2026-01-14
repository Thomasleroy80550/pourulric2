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

// Construire des points pour le graphique depuis /getmeasure (body.items)
function buildChartFromGetMeasure(data: any) {
  const items = data?.body?.items;
  if (!Array.isArray(items) || items.length === 0) return [];
  const first = items[0];
  const beg = Number(first?.beg_time);
  const step = Number(first?.step_time);
  let values: any = first?.value;
  if (Array.isArray(values) && Array.isArray(values[0])) {
    values = values[0];
  }
  if (!Array.isArray(values) || !Number.isFinite(beg) || !Number.isFinite(step)) return [];
  return values.map((v: any, idx: number) => {
    const ts = beg + idx * step;
    const val = Array.isArray(v) ? Number(v[0]) : Number(v);
    const label = new Date(ts * 1000).toLocaleString();
    return { ts, label, value: Number.isNaN(val) ? null : val };
  });
}

const NetatmoStationsPage: React.FC = () => {
  const [stationsData, setStationsData] = React.useState<any | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = React.useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = React.useState<string | null>(null);

  const [scale, setScale] = React.useState<(typeof SCALES)[number]>("1hour");
  const [selectedTypes, setSelectedTypes] = React.useState<Set<string>>(new Set(["temperature"]));
  const [dateBegin, setDateBegin] = React.useState<string>("");
  const [dateEnd, setDateEnd] = React.useState<string>("");
  const [limit, setLimit] = React.useState<number>(256);
  const [optimize, setOptimize] = React.useState<boolean>(true);
  const [realTime, setRealTime] = React.useState<boolean>(false);

  const [loading, setLoading] = React.useState(false);
  const [measures, setMeasures] = React.useState<any | null>(null);
  const [chartData, setChartData] = React.useState<{ ts: number; label: string; value: number | null }[]>([]);

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

  async function loadStations() {
    setLoading(true);
    const { error, data } = await supabase.functions.invoke("netatmo-proxy", { body: { endpoint: "getstationsdata" } });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Impossible de charger les stations Netatmo.");
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
    if (selectedModuleId) payload.module_id = selectedModuleId;
    const begin = toUnixSecLocal(dateBegin);
    const end = toUnixSecLocal(dateEnd);
    if (typeof begin === "number") payload.date_begin = begin;
    if (typeof end === "number") payload.date_end = end;

    const { error, data } = await supabase.functions.invoke("netatmo-proxy", { body: payload });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Erreur de récupération des mesures.");
      setMeasures(null);
      setChartData([]);
      return;
    }
    setMeasures(data);
    setChartData(buildChartFromGetMeasure(data));
    toast.success("Mesures chargées.");
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
                        <SelectItem value="">Aucun module</SelectItem>
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

              {/* Options avancées */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Date début</Label>
                  <Input type="datetime-local" value={dateBegin} onChange={(e) => setDateBegin(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Date fin</Label>
                  <Input type="datetime-local" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Limit</Label>
                  <Input type="number" min={1} max={1024} value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between rounded border p-2">
                  <span className="text-sm">Optimize</span>
                  <Switch checked={optimize} onCheckedChange={setOptimize} />
                </div>
                <div className="flex items-center justify-between rounded border p-2">
                  <span className="text-sm">Real time</span>
                  <Switch checked={realTime} onCheckedChange={setRealTime} />
                </div>
              </div>

              {/* Graphique simple */}
              <div>
                <Label className="text-sm font-medium">Graphique (premier type)</Label>
                <div className="h-56 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
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

              {/* Tableau brut des items */}
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