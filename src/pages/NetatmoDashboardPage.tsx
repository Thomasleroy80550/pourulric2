"use client";

import React from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";

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

  // Helper: build chart points from getroommeasure response (robuste)
  // Ajout d'un paramètre scale pour fallback du step_time si absent
  function buildChartPoints(data: any, scaleForFallback?: string) {
    const homeBlock = data?.body?.home ?? data?.body;
    let beg = homeBlock?.beg_time;
    let step = homeBlock?.step_time;

    // Fallback step_time si absent (format optimisé)
    if (typeof step !== "number" && typeof scaleForFallback === "string") {
      const map: Record<string, number> = {
        "30min": 1800,
        "1hour": 3600,
        "3hours": 10800,
        "1day": 86400,
        "1week": 604800,
        "1month": 2592000, // approx.
      };
      step = map[scaleForFallback] ?? 3600;
    }

    let values = homeBlock?.values;

    // Si body est un tableau (format optimisé), reconstituer values
    if (!Array.isArray(values) && Array.isArray(data?.body)) {
      const first = data.body[0];
      beg = typeof beg === "number" ? beg : first?.beg_time;
      const v = first?.value;
      if (Array.isArray(v)) {
        // v peut être [[19.3, ...]] ou [19.3, ...]
        const arr = Array.isArray(v[0]) ? v[0] : v;
        values = arr.map((n: any) => ({ value: n }));
      } else if (typeof v === "number") {
        values = [{ value: v }];
      }
    }

    if (typeof beg !== "number" || typeof step !== "number" || !Array.isArray(values)) return [];

    return values
      .map((item: any, idx: number) => {
        let raw: any = item;
        if (Array.isArray(raw)) raw = raw[0];
        else if (raw && typeof raw === "object") raw = Array.isArray(raw.value) ? raw.value[0] : raw.value;
        const val = Number(raw);
        const ts = beg + idx * step;
        if (Number.isNaN(val)) return null;
        return { ts, label: new Date(ts * 1000).toLocaleString(), value: val };
      })
      .filter((p) => p !== null) as { ts: number; label: string; value: number }[];
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

    const nowSec = Math.floor(Date.now() / 1000);
    const dayBegin = nowSec - 24 * 60 * 60;
    const weekBegin = nowSec - 7 * 24 * 60 * 60;

    setLoading(true);
    const [dayRes, weekRes] = await Promise.all([
      supabase.functions.invoke("netatmo-proxy", {
        body: {
          endpoint: "getroommeasure",
          home_id: homeId,
          room_id: selectedRoomId,
          scale: "1day",
          type: "temperature",
          date_begin: dayBegin,
          date_end: nowSec,
          real_time: true,
          optimize: false, // CHANGED: format facile à parser (inclut step_time)
        },
      }),
      supabase.functions.invoke("netatmo-proxy", {
        body: {
          endpoint: "getroommeasure",
          home_id: homeId,
          room_id: selectedRoomId,
          scale: "1week",
          type: "temperature",
          date_begin: weekBegin,
          date_end: nowSec,
          real_time: true,
          optimize: false, // CHANGED
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
      setDayChartData(buildChartPoints(dayRes.data, "1day"));
    }

    if (weekRes.error) {
      toast.error(weekRes.error.message || "Erreur historique (semaine).");
      setWeekChartData([]);
      setWeekRaw(weekRes.error);
    } else {
      setWeekRaw(weekRes.data);
      setWeekChartData(buildChartPoints(weekRes.data, "1week"));
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

  // Trigger auto-loading when ready
  React.useEffect(() => {
    if (homeId && selectedRoomId) {
      loadRoomCharts();
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

  React.useEffect(() => {
    restoreSelection();
    checkTokens().then(async () => {
      if (hasTokens === null) return;
      if (hasTokens) {
        await loadHomesData();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTokens]);

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
      <section className="container mx-auto py-10 md:py-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary">Intégration</Badge>
            <Badge variant="outline">Netatmo</Badge>
          </div>

          <Card>
            <CardHeader><CardTitle>Maison</CardTitle></CardHeader>
            <CardContent>
              {home ? (
                <div className="grid md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="font-medium">{home.name || "Sans nom"}</p>
                    <p className="text-muted-foreground">{home.country} · {home.timezone}</p>
                  </div>
                  <div>
                    <p className="font-medium">Mode</p>
                    <p className="text-muted-foreground">therm_mode: {home.therm_mode}</p>
                    <p className="text-muted-foreground">temperature_control_mode: {home.temperature_control_mode}</p>
                  </div>
                  <div>
                    <p className="font-medium">Position</p>
                    <p className="text-muted-foreground">
                      alt: {home.altitude} · coords: {Array.isArray(home.coordinates) ? home.coordinates.join(", ") : "n/a"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune maison détectée.</p>
              )}
            </CardContent>
          </Card>

          {home && (
            <>
              <Card className="mt-4">
                <CardHeader><CardTitle>Contrôles par pièce</CardTitle></CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-3">
                    {(home.rooms || []).map((r: any) => (
                      <li key={r.id} className="flex flex-col gap-2">
                        <div className="text-muted-foreground">{r.name} · type: {r.type} · id: {r.id}</div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Input type="number" min={5} max={30} step={0.5} placeholder="Temp °C (manual)" className="w-32" id={`temp-${r.id}`} />
                          <Input type="number" min={5} max={360} step={5} defaultValue={60} placeholder="Durée (min)" className="w-32" id={`mins-${r.id}`} />
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              const tempInput = (document.getElementById(`temp-${r.id}`) as HTMLInputElement | null)?.value;
                              const minsInput = (document.getElementById(`mins-${r.id}`) as HTMLInputElement | null)?.value;
                              const tempVal = tempInput ? Number(tempInput) : NaN;
                              const minsVal = minsInput ? Number(minsInput) : 60;
                              if (isNaN(tempVal)) {
                                toast.error("Température invalide pour le mode manual.");
                                return;
                              }
                              setRoomThermPoint({ roomId: r.id, mode: "manual", temp: tempVal, minutes: minsVal });
                            }}
                          >
                            Appliquer (manual)
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              const minsInput = (document.getElementById(`mins-${r.id}`) as HTMLInputElement | null)?.value;
                              const minsVal = minsInput ? Number(minsInput) : 60;
                              setRoomThermPoint({ roomId: r.id, mode: "max", minutes: minsVal });
                            }}
                          >
                            Max
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setRoomThermPoint({ roomId: r.id, mode: "home" })}>
                            Home (suivre maison)
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardHeader><CardTitle>Thermostats & passerelles</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="font-medium mb-1">Thermostat</p>
                      <Select value={selectedModuleId ?? ""} onValueChange={(v) => { setSelectedModuleId(v); persistSelection(); }}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Choisir" /></SelectTrigger>
                        <SelectContent>
                          {therms.map((m: any) => (
                            <SelectItem key={m.id} value={m.id}>{m.name || m.id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="font-medium mb-1">Passerelle (relay)</p>
                      <Select value={selectedBridgeId ?? ""} onValueChange={(v) => { setSelectedBridgeId(v); persistSelection(); }}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Choisir" /></SelectTrigger>
                        <SelectContent>
                          {relays.map((r: any) => (
                            <SelectItem key={r.id} value={r.id}>{r.name || r.id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button className="w-full" onClick={loadHomestatus} disabled={loading || !homeId}>
                        {loading ? "Chargement…" : "Statut en temps réel"}
                      </Button>
                    </div>
                  </div>

                  {homeStatus && (
                    <div className="mt-4">
                      <p className="text-sm font-medium">Pièces (homestatus)</p>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        {(() => {
                          const rooms = homeStatus?.body?.home?.rooms || homeStatus?.body?.rooms || [];
                          return rooms.map((room: any) => (
                            <li key={room.id}>
                              {room.name || room.id}: mesurée {room.therm_measured_temperature ?? "n/a"}°C · consigne {room.therm_setpoint_temperature ?? "n/a"}°C
                            </li>
                          ));
                        })()}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardHeader><CardTitle>Programme sélectionné</CardTitle></CardHeader>
                <CardContent>
                  {schedule ? (
                    <div className="text-sm">
                      <p className="font-medium">{schedule.name || "__DEFAULT_SCHEDULE"}</p>
                      <p className="text-muted-foreground">
                        away_temp: {schedule.away_temp}°C · hors gel (hg_temp): {schedule.hg_temp}°C
                      </p>
                      <p className="text-muted-foreground">type: {schedule.type}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun programme trouvé.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardHeader><CardTitle>Historique chaudière</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="font-medium mb-1">Échelle</p>
                      <Select value={selectedScale} onValueChange={(v) => { setSelectedScale(v); persistSelection(); }}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30min">30min</SelectItem>
                          <SelectItem value="1hour">1hour</SelectItem>
                          <SelectItem value="3hours">3hours</SelectItem>
                          <SelectItem value="1day">1day</SelectItem>
                          <SelectItem value="1week">1week</SelectItem>
                          <SelectItem value="1month">1month</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="font-medium mb-1">Type</p>
                      <Select value={selectedTypes} onValueChange={(v) => { setSelectedTypes(v); persistSelection(); }}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="boileron">boileron</SelectItem>
                          <SelectItem value="boileroff">boileroff</SelectItem>
                          <SelectItem value="sum_boiler_on">sum_boiler_on</SelectItem>
                          <SelectItem value="sum_boiler_off">sum_boiler_off</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button className="w-full" onClick={loadBoilerHistory} disabled={loading || !selectedModuleId || !selectedBridgeId}>
                        {loading ? "Chargement…" : "Charger l'historique"}
                      </Button>
                    </div>
                  </div>

                  {boilerHistory && (
                    <div className="mt-3">
                      <p className="text-sm font-medium">Mesures</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border border-muted rounded">
                          <thead>
                            <tr className="bg-muted">
                              <th className="p-2 text-left">beg_time</th>
                              <th className="p-2 text-left">step_time</th>
                              <th className="p-2 text-left">value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const items = boilerHistory?.body?.items;
                              const rows = Array.isArray(items) ? items : (items ? [items] : []);
                              return rows.map((it: any, idx: number) => (
                                <tr key={idx} className="border-t">
                                  <td className="p-2">{it.beg_time}</td>
                                  <td className="p-2">{it.step_time}</td>
                                  <td className="p-2">{Array.isArray(it.value) ? it.value.join(", ") : String(it.value)}</td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* NEW: Graphiques auto jour & semaine */}
              {home && (
                <Card className="mt-4">
                  <CardHeader><CardTitle>Historique de pièce</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="font-medium mb-1">Pièce</p>
                        <Select value={selectedRoomId ?? ""} onValueChange={(v) => setSelectedRoomId(v)}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Choisir une pièce" /></SelectTrigger>
                          <SelectContent>
                            {(home.rooms || []).map((r: any) => (
                              <SelectItem key={r.id} value={r.id}>{r.name || r.id}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2 text-muted-foreground flex items-end">
                        <span className="text-xs">Les courbes se chargent automatiquement (température).</span>
                      </div>
                    </div>

                    {/* Courbe quotidienne */}
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Quotidien (1 jour) – Température</p>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={dayChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" opacity={0.6} />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} minTickGap={24} />
                            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v: number) => `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })}°C`} />
                            <Tooltip
                              wrapperStyle={{ outline: "none" }}
                              contentStyle={{ background: "rgba(17, 24, 39, 0.92)", border: "1px solid #374151", borderRadius: 8 }}
                              labelStyle={{ color: "#e5e7eb", fontWeight: 600 }}
                              itemStyle={{ color: "#e5e7eb" }}
                              formatter={(val: any) => [`${Number(val).toLocaleString(undefined, { maximumFractionDigits: 1 })}°C`, "temperature"]}
                            />
                            <Legend />
                            <Line
                              name="Température"
                              type="monotone"
                              dataKey="value"
                              stroke="#1d4ed8"
                              strokeWidth={2.5}
                              dot={false}
                              activeDot={{ r: 3, stroke: "#1d4ed8", fill: "#fff" }}
                              animationDuration={400}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      {dayChartData.length === 0 && <p className="text-xs text-red-600 mt-2">Aucune donnée disponible pour ce jour.</p>}
                      {/* NEW: logs sous le graphique jour */}
                      <div className="mt-2 text-xs text-muted-foreground">
                        Points: {dayChartData.length} • beg_time: {dayRaw?.body?.home?.beg_time ?? dayRaw?.body?.beg_time ?? "n/a"} • step_time: {dayRaw?.body?.home?.step_time ?? dayRaw?.body?.step_time ?? "n/a"}
                      </div>
                      {dayRaw && (
                        <pre className="mt-1 text-[10px] whitespace-pre-wrap break-words bg-muted p-2 rounded">
                          {(() => {
                            const vals = dayRaw?.body?.home?.values ?? dayRaw?.body?.values ?? [];
                            const preview = Array.isArray(vals) ? vals.slice(0, 10) : vals;
                            return `Aperçu valeurs (10): ${JSON.stringify(preview)}`;
                          })()}
                        </pre>
                      )}
                    </div>

                    {/* Courbe hebdomadaire */}
                    <div className="mt-6">
                      <p className="text-sm font-medium mb-2">Hebdomadaire (1 semaine) – Température</p>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={weekChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" opacity={0.6} />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} minTickGap={24} />
                            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v: number) => `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })}°C`} />
                            <Tooltip
                              wrapperStyle={{ outline: "none" }}
                              contentStyle={{ background: "rgba(17, 24, 39, 0.92)", border: "1px solid #374151", borderRadius: 8 }}
                              labelStyle={{ color: "#e5e7eb", fontWeight: 600 }}
                              itemStyle={{ color: "#e5e7eb" }}
                              formatter={(val: any) => [`${Number(val).toLocaleString(undefined, { maximumFractionDigits: 1 })}°C`, "temperature"]}
                            />
                            <Legend />
                            <Line
                              name="Température"
                              type="monotone"
                              dataKey="value"
                              stroke="#10b981"
                              strokeWidth={2.5}
                              dot={false}
                              activeDot={{ r: 3, stroke: "#10b981", fill: "#fff" }}
                              animationDuration={400}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      {weekChartData.length === 0 && <p className="text-xs text-red-600 mt-2">Aucune donnée disponible pour cette semaine.</p>}
                      {/* NEW: logs sous le graphique semaine */}
                      <div className="mt-2 text-xs text-muted-foreground">
                        Points: {weekChartData.length} • beg_time: {weekRaw?.body?.home?.beg_time ?? weekRaw?.body?.beg_time ?? "n/a"} • step_time: {weekRaw?.body?.home?.step_time ?? weekRaw?.body?.step_time ?? "n/a"}
                      </div>
                      {weekRaw && (
                        <pre className="mt-1 text-[10px] whitespace-pre-wrap break-words bg-muted p-2 rounded">
                          {(() => {
                            const vals = weekRaw?.body?.home?.values ?? weekRaw?.body?.values ?? [];
                            const preview = Array.isArray(vals) ? vals.slice(0, 10) : vals;
                            return `Aperçu valeurs (10): ${JSON.stringify(preview)}`;
                          })()}
                        </pre>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* NEW: Logs Netatmo (diagnostic) */}
              <Card className="mt-6">
                <CardHeader><CardTitle>Logs Netatmo (derniers 10)</CardTitle></CardHeader>
                <CardContent>
                  {logs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aucun log enregistré pour l'instant.</p>
                  ) : (
                    <div className="space-y-2">
                      {logs.map((l) => (
                        <div key={l.id} className="border rounded p-2">
                          <div className="text-xs">
                            <span className="font-medium">{l.endpoint}</span> · status {l.response_status} · points {l.count_points ?? "n/a"} · {new Date(l.created_at).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-muted-foreground break-words mt-1">
                            params: {JSON.stringify(l.params)}
                          </div>
                          {l.error ? (
                            <div className="text-[10px] text-red-600 break-words mt-1">
                              error: {l.error}
                            </div>
                          ) : (
                            <div className="text-[10px] break-words mt-1">
                              preview: {l.body_preview}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-2">
                    <Button variant="secondary" size="sm" onClick={loadLogs}>Rafraîchir les logs</Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </section>
    </MainLayout>
  );
};

export default NetatmoDashboardPage;