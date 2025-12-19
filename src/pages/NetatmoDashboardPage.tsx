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
    const { error, data } = await supabase.functions.invoke("netatmo-proxy", {
      body: { endpoint: "homesdata" },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Erreur de récupération des thermostats (homesdata).");
      return;
    }
    setHomesData(data);
    const id = data?.body?.homes?.[0]?.id ?? null;
    setHomeId(id);

    const home = data?.body?.homes?.[0];
    if (home) {
      const firstTherm = (home.modules || []).find((m: any) => m.type === "NATherm1");
      if (firstTherm) {
        setSelectedModuleId(firstTherm.id);
        setSelectedBridgeId(firstTherm.bridge);
      }
    }
    persistSelection();
  };

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
      toast.error(error.message || "Erreur de récupération de l’historique chaudière.");
      return;
    }
    setBoilerHistory(data);
    persistSelection();
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
                  <AlertDescription>Connectez une fois votre compte Netatmo pour activer l’accès aux thermostats.</AlertDescription>
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
                        {loading ? "Chargement…" : "Charger l’historique"}
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
            </>
          )}
        </div>
      </section>
    </MainLayout>
  );
};

export default NetatmoDashboardPage;