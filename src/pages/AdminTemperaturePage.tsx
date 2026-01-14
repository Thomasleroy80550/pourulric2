"use client";

import React from "react";
import MainLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Thermometer, Cloud, Home as HomeIcon, AlertTriangle, Droplets, Leaf, Volume2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// Types de tables
type ThermAssign = {
  id: string;
  user_id: string;
  user_room_id: string;
  home_id: string;
  netatmo_room_id?: string | null;
  netatmo_room_name?: string | null;
  label?: string | null;
};

type StationAssign = {
  id: string;
  user_id: string;
  user_room_id: string;
  device_id: string;
  module_id?: string | null;
  station_name?: string | null;
  module_name?: string | null;
};

type UserRoom = { id: string; user_id: string; room_name: string };

function formatTs(ts?: number) {
  if (typeof ts !== "number" || Number.isNaN(ts)) return "—";
  try {
    return new Date(ts * 1000).toLocaleString();
  } catch {
    return "—";
  }
}

const AdminTemperaturePage: React.FC = () => {
  const [loading, setLoading] = React.useState(false);

  const [thermAssigns, setThermAssigns] = React.useState<ThermAssign[]>([]);
  const [stationAssigns, setStationAssigns] = React.useState<StationAssign[]>([]);
  const [userRooms, setUserRooms] = React.useState<UserRoom[]>([]);

  // Mesures en direct par netatmo_room_id (thermostats)
  const [roomLiveTemps, setRoomLiveTemps] = React.useState<Record<string, { name?: string; measured?: number; setpoint?: number }>>({});
  // Stations: cache des dashboard_data par device_id/ module_id
  const [stationDashboard, setStationDashboard] = React.useState<Record<string, any>>({});

  // Charger toutes les assignations (admin)
  async function loadAssignments() {
    setLoading(true);
    // rooms
    const roomsRes = await supabase.from("user_rooms").select("id, user_id, room_name").limit(1000);
    if (roomsRes.error) toast.error(roomsRes.error.message);
    setUserRooms(roomsRes.data || []);

    // thermostats
    const thermRes = await supabase
      .from("netatmo_thermostats")
      .select("id, user_id, user_room_id, home_id, netatmo_room_id, netatmo_room_name, label")
      .limit(1000);
    if (thermRes.error) toast.error(thermRes.error.message);
    setThermAssigns(thermRes.data || []);

    // stations
    const stationRes = await supabase
      .from("netatmo_weather_stations")
      .select("id, user_id, user_room_id, device_id, module_id, station_name, module_name")
      .limit(1000);
    if (stationRes.error) toast.error(stationRes.error.message);
    setStationAssigns(stationRes.data || []);

    setLoading(false);
  }

  // Charger homestatus par home_id et remplir roomLiveTemps
  async function refreshThermostatsStatus() {
    if (thermAssigns.length === 0) return;
    const byHome = Array.from(new Set(thermAssigns.map((t) => t.home_id).filter(Boolean)));
    const live: Record<string, { name?: string; measured?: number; setpoint?: number }> = {};
    for (const homeId of byHome) {
      const { error, data } = await supabase.functions.invoke("netatmo-proxy", { body: { endpoint: "homestatus", home_id: homeId } });
      if (error) {
        // Ne bloque pas, mais informe
        toast.message(`Statut indisponible pour home ${homeId}`);
        continue;
      }
      const rooms = data?.body?.home?.rooms || data?.body?.rooms || [];
      rooms.forEach((r: any) => {
        const key = String(r.id);
        live[key] = {
          name: r.name,
          measured: typeof r.therm_measured_temperature === "number" ? r.therm_measured_temperature : undefined,
          setpoint: typeof r.therm_setpoint_temperature === "number" ? r.therm_setpoint_temperature : undefined,
        };
      });
    }
    setRoomLiveTemps(live);
  }

  // Charger getstationsdata et alimenter stationDashboard
  async function refreshStationsStatus() {
    const { error, data } = await supabase.functions.invoke("netatmo-proxy", { body: { endpoint: "getstationsdata" } });
    if (error) {
      toast.message("Stations météo indisponibles (scope read_station requis)");
      return;
    }
    // indexer par device_id / module_id
    const devices = data?.body?.devices || [];
    const map: Record<string, any> = {};
    devices.forEach((dev: any) => {
      const devId = String(dev._id || dev.id);
      map[`device:${devId}`] = dev?.dashboard_data || null;
      const mods = dev?.modules || [];
      mods.forEach((m: any) => {
        const mid = String(m._id || m.id);
        map[`module:${mid}`] = m?.dashboard_data || null;
      });
    });
    setStationDashboard(map);
  }

  React.useEffect(() => {
    loadAssignments();
  }, []);
  React.useEffect(() => {
    if (thermAssigns.length) refreshThermostatsStatus();
  }, [thermAssigns.length]);
  React.useEffect(() => {
    if (stationAssigns.length) refreshStationsStatus();
  }, [stationAssigns.length]);

  // ADD: état pour la vue détaillée
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [detailsRoom, setDetailsRoom] = React.useState<{
    roomId: string;
    roomName: string;
    thermostat?: { measured?: number; setpoint?: number; netatmoRoomName?: string };
    stationIndoor?: { Temperature?: number; CO2?: number; Humidity?: number; Noise?: number; time_utc?: number };
    stationOutdoor?: { Temperature?: number; Humidity?: number; time_utc?: number };
    alert?: boolean;
  } | null>(null);

  // ADD: helpers list view data
  const alertThreshold = 14;
  const roomName = (id: string) => userRooms.find((r) => r.id === id)?.room_name || id;

  const listItems = React.useMemo(() => {
    // index assignments par user_room_id
    const byRoom: Record<string, { therm?: typeof thermAssigns[number]; station?: typeof stationAssigns[number] }> = {};
    thermAssigns.forEach((t) => {
      byRoom[t.user_room_id] = byRoom[t.user_room_id] || {};
      byRoom[t.user_room_id].therm = t;
    });
    stationAssigns.forEach((s) => {
      byRoom[s.user_room_id] = byRoom[s.user_room_id] || {};
      byRoom[s.user_room_id].station = s;
    });

    return Object.entries(byRoom).map(([userRoomId, data]) => {
      const rn = data.therm?.netatmo_room_id ? roomLiveTemps[String(data.therm.netatmo_room_id)] : undefined;
      const indoorKey = data.station ? `device:${data.station.device_id}` : "";
      const outdoorKey = data.station?.module_id ? `module:${data.station.module_id}` : "";
      const indoor = indoorKey ? stationDashboard[indoorKey] : undefined;
      const outdoor = outdoorKey ? stationDashboard[outdoorKey] : undefined;

      const measured = rn?.measured;
      const alert = typeof measured === "number" && measured < alertThreshold;

      return {
        roomId: userRoomId,
        roomName: roomName(userRoomId),
        thermostat: {
          measured,
          setpoint: rn?.setpoint,
          netatmoRoomName: rn?.name,
        },
        stationIndoor: indoor,
        stationOutdoor: outdoor,
        alert,
      };
    }).sort((a, b) => a.roomName.localeCompare(b.roomName));
  }, [thermAssigns, stationAssigns, roomLiveTemps, stationDashboard, userRooms]);

  function openDetails(item: typeof listItems[number]) {
    setDetailsRoom({
      roomId: item.roomId,
      roomName: item.roomName,
      thermostat: item.thermostat,
      stationIndoor: item.stationIndoor,
      stationOutdoor: item.stationOutdoor,
      alert: item.alert,
    });
    setDetailsOpen(true);
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Thermometer className="w-6 h-6" />
          Temperature — Admin
        </h1>
        <p className="text-gray-600">Vue d'ensemble des thermostats et des stations météo par logement.</p>

        <div className="flex gap-2">
          <Button onClick={loadAssignments} disabled={loading}>{loading ? "Chargement..." : "Recharger les assignations"}</Button>
          <Button variant="secondary" onClick={refreshThermostatsStatus}>Actualiser thermostats</Button>
          <Button variant="secondary" onClick={refreshStationsStatus}>Actualiser stations</Button>
        </div>

        {/* NEW: Vue liste sexy */}
        <Card>
          <CardHeader>
            <CardTitle>Logements — Vue liste</CardTitle>
          </CardHeader>
          <CardContent>
            {listItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun logement avec assignation de thermostat ou station.</p>
            ) : (
              <div className="divide-y rounded-md border bg-white">
                {listItems.map((item) => (
                  <div key={item.roomId} className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 w-48">
                      <HomeIcon className="w-4 h-4 text-orange-600" />
                      <span className="font-medium truncate">{item.roomName}</span>
                      {item.alert && (
                        <Badge variant="destructive" className="ml-1">Alerte &lt; {alertThreshold}°C</Badge>
                      )}
                    </div>

                    {/* Thermostat */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground">Thermostat</span>
                      <Thermometer className="w-4 h-4 text-red-500" />
                      <span className="text-sm">
                        {typeof item.thermostat?.measured === "number" ? `${item.thermostat!.measured}°C` : "—"}
                      </span>
                      <span className="text-xs text-muted-foreground">Consigne:</span>
                      <span className="text-sm">
                        {typeof item.thermostat?.setpoint === "number" ? `${item.thermostat!.setpoint}°C` : "—"}
                      </span>
                    </div>

                    {/* Station intérieure */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground">Station</span>
                      <Thermometer className="w-4 h-4 text-red-500" />
                      <span className="text-sm">{typeof item.stationIndoor?.Temperature === "number" ? `${item.stationIndoor!.Temperature}°C` : "—"}</span>
                      <Leaf className="w-4 h-4 text-green-600" />
                      <span className="text-sm">{typeof item.stationIndoor?.CO2 === "number" ? `${item.stationIndoor!.CO2} ppm` : "—"}</span>
                      <Droplets className="w-4 h-4 text-sky-500" />
                      <span className="text-sm">{typeof item.stationIndoor?.Humidity === "number" ? `${item.stationIndoor!.Humidity}%` : "—"}</span>
                      <Volume2 className="w-4 h-4 text-purple-600" />
                      <span className="text-sm">{typeof item.stationIndoor?.Noise === "number" ? `${item.stationIndoor!.Noise} dB` : "—"}</span>
                    </div>

                    {/* Station extérieure */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground">Extérieur</span>
                      <Cloud className="w-4 h-4 text-gray-600" />
                      <span className="text-sm">{typeof item.stationOutdoor?.Temperature === "number" ? `${item.stationOutdoor!.Temperature}°C` : "—"}</span>
                      <Droplets className="w-4 h-4 text-sky-500" />
                      <span className="text-sm">{typeof item.stationOutdoor?.Humidity === "number" ? `${item.stationOutdoor!.Humidity}%` : "—"}</span>
                    </div>

                    <div className="flex items-center justify-end w-32">
                      <Button size="sm" variant="secondary" onClick={() => openDetails(item)}>Voir plus</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section Thermostats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HomeIcon className="w-5 h-5" />
              Thermostats (Netatmo Energy)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {thermAssigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun thermostat assigné.</p>
            ) : (
              <div className="space-y-2">
                {thermAssigns.map((t) => {
                  const rn = roomLiveTemps[String(t.netatmo_room_id || "")];
                  const measured = rn?.measured;
                  const setpoint = rn?.setpoint;
                  const underThreshold = typeof measured === "number" && measured < alertThreshold;
                  return (
                    <div key={t.id} className="flex flex-col md:flex-row md:items-center md:justify-between border rounded p-2 gap-2">
                      <div>
                        <p className="font-medium">{roomName(t.user_room_id)} {t.netatmo_room_name ? `• ${t.netatmo_room_name}` : ""}</p>
                        <p className="text-sm text-gray-600">
                          Mesurée: {typeof measured === "number" ? `${measured}°C` : "—"} • Consigne: {typeof setpoint === "number" ? `${setpoint}°C` : "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {underThreshold && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Alerte &lt; {alertThreshold}°C
                          </Badge>
                        )}
                        {!underThreshold && <Badge variant="secondary">OK</Badge>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Section Stations météo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="w-5 h-5" />
              Stations météo (Netatmo)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stationAssigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune station météo assignée.</p>
            ) : (
              <div className="space-y-2">
                {stationAssigns.map((s) => {
                  const indoor = stationDashboard[`device:${s.device_id}`] || null;
                  const outdoor = s.module_id ? stationDashboard[`module:${s.module_id}`] || null : null;
                  const measuredIndoor = typeof indoor?.Temperature === "number" ? indoor.Temperature : undefined;
                  const underThresholdIndoor = typeof measuredIndoor === "number" && measuredIndoor < alertThreshold;

                  return (
                    <div key={s.id} className="border rounded p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">
                          {roomName(s.user_room_id)} • {s.station_name || s.device_id}
                          {s.module_name ? ` • module ${s.module_name}` : ""}
                        </p>
                        {underThresholdIndoor && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Alerte &lt; {alertThreshold}°C
                          </Badge>
                        )}
                      </div>

                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Intérieur */}
                        <div className="rounded border p-3">
                          <p className="font-medium flex items-center gap-2"><Thermometer className="w-4 h-4 text-red-500" /> Intérieur</p>
                          <div className="mt-2 space-y-2 text-sm">
                            <div className="flex items-center justify-between"><span>Température</span><span className="font-medium">{typeof indoor?.Temperature === "number" ? `${indoor.Temperature}°C` : "—"}</span></div>
                            <div className="flex items-center justify-between"><span className="flex items-center gap-2"><Leaf className="w-4 h-4 text-green-600" /> CO₂</span><span className="font-medium">{typeof indoor?.CO2 === "number" ? `${indoor.CO2} ppm` : "—"}</span></div>
                            <div className="flex items-center justify-between"><span className="flex items-center gap-2"><Droplets className="w-4 h-4 text-sky-500" /> Humidité</span><span className="font-medium">{typeof indoor?.Humidity === "number" ? `${indoor.Humidity}%` : "—"}</span></div>
                            <div className="flex items-center justify-between"><span className="flex items-center gap-2"><Volume2 className="w-4 h-4 text-purple-600" /> Bruit</span><span className="font-medium">{typeof indoor?.Noise === "number" ? `${indoor.Noise} dB` : "—"}</span></div>
                            <div className="text-xs text-gray-600">Maj: {formatTs(indoor?.time_utc)}</div>
                          </div>
                        </div>

                        {/* Extérieur */}
                        <div className="rounded border p-3">
                          <p className="font-medium flex items-center gap-2"><Cloud className="w-4 h-4 text-gray-600" /> Extérieur</p>
                          <div className="mt-2 space-y-2 text-sm">
                            <div className="flex items-center justify-between"><span>Température</span><span className="font-medium">{typeof outdoor?.Temperature === "number" ? `${outdoor.Temperature}°C` : "—"}</span></div>
                            <div className="flex items-center justify-between"><span className="flex items-center gap-2"><Droplets className="w-4 h-4 text-sky-500" /> Humidité</span><span className="font-medium">{typeof outdoor?.Humidity === "number" ? `${outdoor.Humidity}%` : "—"}</span></div>
                            <div className="text-xs text-gray-600">Maj: {formatTs(outdoor?.time_utc)}</div>
                            {!outdoor && <p className="text-xs text-muted-foreground">Aucun module extérieur détecté.</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* NEW: Dialog détails */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Détails — {detailsRoom?.roomName || ""}</DialogTitle>
            </DialogHeader>
            {detailsRoom ? (
              <div className="space-y-4">
                {/* Thermostat */}
                <div className="rounded border p-3">
                  <p className="font-medium flex items-center gap-2"><Thermometer className="w-4 h-4 text-red-500" /> Thermostat</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>Mesurée: {typeof detailsRoom.thermostat?.measured === "number" ? `${detailsRoom.thermostat!.measured}°C` : "—"}</div>
                    <div>Consigne: {typeof detailsRoom.thermostat?.setpoint === "number" ? `${detailsRoom.thermostat!.setpoint}°C` : "—"}</div>
                    <div>Pièce Netatmo: {detailsRoom.thermostat?.netatmoRoomName || "—"}</div>
                    {detailsRoom.alert && (
                      <div className="col-span-2">
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-3 h-3" /> Alerte &lt; {alertThreshold}°C
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* Station intérieur */}
                <div className="rounded border p-3">
                  <p className="font-medium flex items-center gap-2"><HomeIcon className="w-4 h-4 text-orange-600" /> Station — Intérieur</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>Température: {typeof detailsRoom.stationIndoor?.Temperature === "number" ? `${detailsRoom.stationIndoor!.Temperature}°C` : "—"}</div>
                    <div>CO₂: {typeof detailsRoom.stationIndoor?.CO2 === "number" ? `${detailsRoom.stationIndoor!.CO2} ppm` : "—"}</div>
                    <div>Humidité: {typeof detailsRoom.stationIndoor?.Humidity === "number" ? `${detailsRoom.stationIndoor!.Humidity}%` : "—"}</div>
                    <div>Bruit: {typeof detailsRoom.stationIndoor?.Noise === "number" ? `${detailsRoom.stationIndoor!.Noise} dB` : "—"}</div>
                    <div className="col-span-2 text-xs text-gray-600">Maj: {detailsRoom.stationIndoor?.time_utc ? new Date(detailsRoom.stationIndoor!.time_utc * 1000).toLocaleString() : "—"}</div>
                  </div>
                </div>

                {/* Station extérieur */}
                <div className="rounded border p-3">
                  <p className="font-medium flex items-center gap-2"><Cloud className="w-4 h-4 text-gray-600" /> Station — Extérieur</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>Température: {typeof detailsRoom.stationOutdoor?.Temperature === "number" ? `${detailsRoom.stationOutdoor!.Temperature}°C` : "—"}</div>
                    <div>Humidité: {typeof detailsRoom.stationOutdoor?.Humidity === "number" ? `${detailsRoom.stationOutdoor!.Humidity}%` : "—"}</div>
                    <div className="col-span-2 text-xs text-gray-600">Maj: {detailsRoom.stationOutdoor?.time_utc ? new Date(detailsRoom.stationOutdoor!.time_utc * 1000).toLocaleString() : "—"}</div>
                  </div>
                </div>
              </div>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>Fermer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default AdminTemperaturePage;