"use client";

import React from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type StationsResponse = any;
type HomesDataResponse = any;
type HomeStatusResponse = any;

// Helper: calculer endtime local en secondes (durée en minutes)
function computeEndtime(minutes: number): number {
  const nowMs = Date.now();
  const endMs = nowMs + Math.max(1, minutes) * 60_000;
  return Math.floor(endMs / 1000);
}

// NEW: appliquer setroomthermpoint
async function setRoomThermPoint(opts: { homeId: string; roomId: string; mode: "manual" | "max" | "home"; temp?: number; minutes?: number }, onDone?: () => void) {
  const { homeId, roomId, mode, temp, minutes = 60 } = opts;
  const payload: any = { endpoint: "setroomthermpoint", home_id: homeId, room_id: roomId, mode };
  if (mode === "manual") payload.temp = temp;
  const endtime = computeEndtime(minutes);
  // Envoyer endtime pour manual/max; pour home ce n'est pas obligatoire, on peut ne pas l'envoyer
  if (mode !== "home") payload.endtime = endtime;

  const { error, data } = await supabase.functions.invoke("netatmo-proxy", { body: payload });
  if (error) {
    toast.error(error.message || "Échec de la mise à jour du thermostat.");
    return;
  }
  toast.success("Thermostat mis à jour.");
  if (typeof onDone === "function") onDone();
}

// Persistance locale pour éviter la perte au reload
const LS_KEY = "netatmo_selection_v1";

// NEW: états pour affectations et user rooms
const [userRooms, setUserRooms] = React.useState<{ id: string; room_name: string }[]>([]);
const [assignments, setAssignments] = React.useState<any[]>([]);

// NEW: états pour getmeasure
const [selectedModuleId, setSelectedModuleId] = React.useState<string | null>(null);
const [selectedBridgeId, setSelectedBridgeId] = React.useState<string | null>(null);
const [selectedScale, setSelectedScale] = React.useState<string>("1day");
const [selectedTypes, setSelectedTypes] = React.useState<string>("sum_boiler_on");
const [boilerHistory, setBoilerHistory] = React.useState<any | null>(null);

// Charger user rooms et assignments
async function loadUserRoomsAndAssignments() {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) return;

  const { data: rooms } = await supabase
    .from("user_rooms")
    .select("id, room_name")
    .eq("user_id", userId)
    .order("room_name", { ascending: true });
  setUserRooms(rooms || []);

  const { data: assigns } = await supabase
    .from("netatmo_thermostats")
    .select("*")
    .eq("user_id", userId);
  setAssignments(assigns || []);
}

// Restaurer sélections au reload
React.useEffect(() => {
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
}, []);

function persistSelection() {
  const payload = {
    homeId,
    moduleId: selectedModuleId,
    bridgeId: selectedBridgeId,
    scale: selectedScale,
    types: selectedTypes,
  };
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
  } catch {}
}

// Mettre à jour modules & bridge sélectionnés lorsque homesdata arrive
React.useEffect(() => {
  if (!homesData) return;
  const home = homesData?.body?.homes?.[0];
  if (!home) return;
  // Sélection par défaut: premier thermostat et son bridge
  const firstTherm = (home.modules || []).find((m: any) => m.type === "NATherm1");
  if (firstTherm) {
    setSelectedModuleId(firstTherm.id);
    setSelectedBridgeId(firstTherm.bridge);
  }
  persistSelection();
  // Charger rooms + assignments
  loadUserRoomsAndAssignments();
}, [homesData]);

// Charger homestatus et persister sélection
async function loadHomestatus() {
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
}

// Historique chaudière via getmeasure
async function loadBoilerHistory() {
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
      type: selectedTypes, // string CSV ou simple clé, le proxy normalise
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
}

// Assignation thermostat → logement
async function assignThermostatToRoom(opts: { homeId: string; bridgeId: string; moduleId: string; netatmoRoomId?: string; netatmoRoomName?: string; userRoomId: string }) {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) {
    toast.error("Non authentifié.");
    return;
  }
  const payload = {
    user_id: userId,
    user_room_id: opts.userRoomId,
    home_id: opts.homeId,
    device_id: opts.bridgeId,
    module_id: opts.moduleId,
    netatmo_room_id: opts.netatmoRoomId ?? null,
    netatmo_room_name: opts.netatmoRoomName ?? null,
  };
  const { error } = await supabase.from("netatmo_thermostats").insert(payload);
  if (error) {
    toast.error(error.message || "Erreur lors de l’assignation.");
    return;
  }
  toast.success("Thermostat assigné au logement.");
  await loadUserRoomsAndAssignments();
}

// Désassignation
async function unassignThermostat(recordId: string) {
  const { error } = await supabase.from("netatmo_thermostats").delete().eq("id", recordId);
  if (error) {
    toast.error(error.message || "Erreur lors de la suppression.");
    return;
  }
  toast.success("Thermostat désassigné.");
  await loadUserRoomsAndAssignments();
}

const NetatmoCallbackPage: React.FC = () => {
  const [exchanged, setExchanged] = React.useState(false);
  const [stations, setStations] = React.useState<StationsResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [homesData, setHomesData] = React.useState<HomesDataResponse | null>(null);
  const [homeId, setHomeId] = React.useState<string | null>(null);
  const [homeStatus, setHomeStatus] = React.useState<HomeStatusResponse | null>(null);

  const redirectUri = React.useMemo(() => `${window.location.origin}/integrations/netatmo/callback`, []);

  const exchangeCode = async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const savedState = localStorage.getItem("netatmo_oauth_state");

    if (!code) {
      toast.error("Code OAuth manquant dans l'URL.");
      return;
    }
    if (!state || !savedState || state !== savedState) {
      toast.error("Échec de vérification de l'état OAuth. Veuillez recommencer.");
      return;
    }

    setLoading(true);
    const { error, data } = await supabase.functions.invoke("netatmo-auth", {
      body: { code, redirect_uri: redirectUri },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message || "Erreur lors de l'échange du code.");
      return;
    }

    toast.success("Connexion Netatmo réussie !");
    setExchanged(true);
    localStorage.removeItem("netatmo_oauth_state");
  };

  const loadStations = async () => {
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
  };

  React.useEffect(() => {
    // Si on revient avec ?code=..., tenter l'échange automatiquement
    const params = new URLSearchParams(window.location.search);
    if (params.get("code")) {
      exchangeCode();
    }
  }, []);

  React.useEffect(() => {
    loadUserRoomsAndAssignments();
  }, []);

  return (
    <MainLayout>
      <section className="container mx-auto py-10 md:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary">Intégration</Badge>
            <Badge variant="outline">Netatmo</Badge>
          </div>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Finalisation de la connexion Netatmo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!exchanged ? (
                <>
                  <Alert>
                    <AlertTitle>Étape 2</AlertTitle>
                    <AlertDescription>
                      Cliquez sur "Finaliser" pour échanger le code contre les identifiants et les stocker en sécurité.
                    </AlertDescription>
                  </Alert>
                  <Button onClick={exchangeCode} disabled={loading}>
                    {loading ? "Traitement en cours..." : "Finaliser"}
                  </Button>
                </>
              ) : (
                <>
                  <Alert>
                    <AlertTitle>Connexion réussie</AlertTitle>
                    <AlertDescription>Vous pouvez maintenant charger vos données Thermostat (homesdata) et le statut en temps réel (homestatus).</AlertDescription>
                  </Alert>
                  <div className="flex gap-2">
                    <Button onClick={loadStations} disabled={loading}>
                      {loading ? "Chargement..." : "Charger mes stations"}
                    </Button>
                  </div>
                  {homesData && (
                    <div className="mt-4 space-y-4">
                      {(() => {
                        const home = homesData?.body?.homes?.[0];
                        if (!home) return null;
                        const schedule = (home.schedules || []).find((s: any) => s.selected) || home.schedules?.[0];

                        return (
                          <>
                            <Card>
                              <CardHeader>
                                <CardTitle>Maison</CardTitle>
                              </CardHeader>
                              <CardContent>
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
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader>
                                <CardTitle>Pièces</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <ul className="text-sm space-y-3">
                                  {(home.rooms || []).map((r: any) => (
                                    <li key={r.id} className="flex flex-col gap-2">
                                      <div className="text-muted-foreground">
                                        {r.name} · type: {r.type} · id: {r.id}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        {/* Temp pour manual */}
                                        <Input
                                          type="number"
                                          min={5}
                                          max={30}
                                          step={0.5}
                                          placeholder="Temp °C (manual)"
                                          className="w-32"
                                          id={`temp-${r.id}`}
                                        />
                                        {/* Durée en minutes */}
                                        <Input
                                          type="number"
                                          min={5}
                                          max={360}
                                          step={5}
                                          defaultValue={60}
                                          placeholder="Durée (min)"
                                          className="w-32"
                                          id={`mins-${r.id}`}
                                        />
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          onClick={() => {
                                            const tempInput = (document.getElementById(`temp-${r.id}`) as HTMLInputElement | null)?.value;
                                            const minsInput = (document.getElementById(`mins-${r.id}`) as HTMLInputElement | null)?.value;
                                            const tempVal = tempInput ? Number(tempInput) : NaN;
                                            const minsVal = minsInput ? Number(minsInput) : 60;
                                            if (isNaN(tempVal)) {
                                              toast.error("Veuillez saisir une température valide pour le mode manual.");
                                              return;
                                            }
                                            setRoomThermPoint({ homeId: home.id, roomId: r.id, mode: "manual", temp: tempVal, minutes: minsVal }, () => loadHomestatus());
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
                                            setRoomThermPoint({ homeId: home.id, roomId: r.id, mode: "max", minutes: minsVal }, () => loadHomestatus());
                                          }}
                                        >
                                          Max
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setRoomThermPoint({ homeId: home.id, roomId: r.id, mode: "home" }, () => loadHomestatus())}
                                        >
                                          Home (suivre maison)
                                        </Button>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader>
                                <CardTitle>Thermostats détectés</CardTitle>
                              </CardHeader>
                              <CardContent>
                                {(() => {
                                  const home = homesData?.body?.homes?.[0];
                                  if (!home) return null;
                                  const relays = (home.modules || []).filter((m: any) => m.type === "NAPlug");
                                  const therms = (home.modules || []).filter((m: any) => m.type === "NATherm1");
                                  const currentTherm = therms.find((t: any) => t.id === selectedModuleId);
                                  const currentBridge = relays.find((r: any) => r.id === (currentTherm?.bridge ?? selectedBridgeId));

                                  return (
                                    <div className="space-y-3 text-sm">
                                      <div className="grid md:grid-cols-3 gap-3">
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
                                        <div>
                                          <p className="font-medium mb-1">Assigner au logement</p>
                                          <Select onValueChange={(roomId) => {
                                            const netRoom = (home.rooms || []).find((r: any) => r.id === currentTherm?.room_id);
                                            assignThermostatToRoom({
                                              homeId: home.id,
                                              bridgeId: selectedBridgeId || currentTherm?.bridge,
                                              moduleId: selectedModuleId || currentTherm?.id,
                                              netatmoRoomId: netRoom?.id,
                                              netatmoRoomName: netRoom?.name,
                                              userRoomId: roomId,
                                            });
                                          }}>
                                            <SelectTrigger className="w-full"><SelectValue placeholder="Choisir un logement" /></SelectTrigger>
                                            <SelectContent>
                                              {userRooms.map((ur) => (
                                                <SelectItem key={ur.id} value={ur.id}>{ur.room_name}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>

                                      {/* Assignations existantes */}
                                      <div className="mt-3">
                                        <p className="font-medium">Assignations</p>
                                        <ul className="list-disc pl-5 space-y-1">
                                          {assignments.map((a) => {
                                            const ur = userRooms.find((r) => r.id === a.user_room_id);
                                            return (
                                              <li key={a.id}>
                                                {ur?.room_name || a.user_room_id} ← {a.module_id} (relay {a.device_id}) {a.netatmo_room_name ? `· pièce ${a.netatmo_room_name}` : ""}
                                                <Button variant="ghost" size="sm" className="ml-2 h-6 px-2" onClick={() => unassignThermostat(a.id)}>Retirer</Button>
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader>
                                <CardTitle>Modules</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <ul className="text-sm list-disc pl-5 space-y-1">
                                  {(home.modules || []).map((m: any) => (
                                    <li key={m.id}>
                                      {m.name} · {m.type} · id: {m.id}
                                      {m.type === "NATherm1" && m.room_id ? (
                                        <span className="text-muted-foreground"> · room_id: {m.room_id}</span>
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader>
                                <CardTitle>Programme sélectionné</CardTitle>
                              </CardHeader>
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

                            <div className="flex gap-2">
                              <Button onClick={loadHomestatus} disabled={loading || !homeId}>
                                {loading ? "Chargement…" : "Statut en temps réel (homestatus)"}
                              </Button>
                            </div>

                            {homeStatus && (
                              <Card className="mt-4">
                                <CardHeader>
                                  <CardTitle>Statut en temps réel</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="text-sm space-y-2">
                                    {/* Affichage basique: essaye d'extraire temp mesurée et consigne si dispo */}
                                    {(() => {
                                      const rooms = homeStatus?.body?.home?.rooms || homeStatus?.body?.rooms || [];
                                      if (!rooms.length) {
                                        return <p className="text-muted-foreground">Aucune donnée détaillée de pièce disponible.</p>;
                                      }
                                      return (
                                        <ul className="list-disc pl-5 space-y-1">
                                          {rooms.map((room: any) => (
                                            <li key={room.id}>
                                              {room.name || room.id}: mesurée {room.therm_measured_temperature ?? "n/a"}°C · consigne {room.therm_setpoint_temperature ?? "n/a"}°C
                                            </li>
                                          ))}
                                        </ul>
                                      );
                                    })()}
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            <Card className="mt-4">
                              <CardHeader>
                                <CardTitle>Historique chaudière</CardTitle>
                              </CardHeader>
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
                                            if (!items) return null;
                                            const rows = Array.isArray(items) ? items : [items];
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
                        );
                      })()}
                    </div>
                  )}
                  {homesData && (
                    <div className="mt-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Réponse brute (Energy / homesdata)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-xs whitespace-pre-wrap break-words bg-muted p-3 rounded">
                            {JSON.stringify(homesData, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                  {homeStatus && (
                    <div className="mt-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Réponse brute (Energy / homestatus)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-xs whitespace-pre-wrap break-words bg-muted p-3 rounded">
                            {JSON.stringify(homeStatus, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </MainLayout>
  );
};

export default NetatmoCallbackPage;