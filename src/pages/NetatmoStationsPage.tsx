"use client";

import React from "react";
import MainLayout from "@/components/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Home as HomeIcon, Cloud, Thermometer, Droplets, Leaf, Volume2, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type StationDevice = {
  _id?: string;
  id?: string;
  station_name?: string;
  module_name?: string;
  modules?: StationModule[];
  dashboard_data?: any;
};

type StationModule = {
  _id?: string;
  id?: string;
  module_name?: string;
  type?: string;
  dashboard_data?: any;
};

function formatTs(ts?: number) {
  if (typeof ts !== "number" || Number.isNaN(ts)) return "—";
  try {
    return new Date(ts * 1000).toLocaleString();
  } catch {
    return "—";
  }
}

const NetatmoStationsPage: React.FC = () => {
  const [stationsData, setStationsData] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(false);

  // NEW: sélection pour assignation
  const [selectedDeviceId, setSelectedDeviceId] = React.useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = React.useState<string | null>(null);

  // NEW: rooms & assignments
  const [userRooms, setUserRooms] = React.useState<{ id: string; room_name: string }[]>([]);
  const [assignments, setAssignments] = React.useState<Array<{
    id: string; user_room_id: string; device_id: string; module_id: string | null; station_name: string | null; module_name: string | null;
  }>>([]);

  // Devices/modules helpers
  const devices: StationDevice[] = React.useMemo(() => {
    const devs = stationsData?.body?.devices;
    return Array.isArray(devs) ? devs : [];
  }, [stationsData]);
  const currentDevice = React.useMemo(() => {
    if (!selectedDeviceId) return null;
    return devices.find((d) => String(d._id || d.id) === selectedDeviceId) || null;
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
      const status = (error as any)?.status;
      if (status === 403) {
        toast.error("Accès Netatmo refusé (scope read_station manquant). Reconnectez Netatmo et réessayez.");
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
    toast.success("Dernières mesures récupérées.");
    // refresh assignments after load
    await loadAssignments();
  }

  // NEW: load user rooms
  async function loadUserRooms() {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return;
    const { data } = await supabase
      .from("user_rooms")
      .select("id, room_name")
      .eq("user_id", userId)
      .order("room_name", { ascending: true });
    setUserRooms(data || []);
  }

  // NEW: load assignments
  async function loadAssignments() {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return;
    const { data } = await supabase
      .from("netatmo_weather_stations")
      .select("id, user_room_id, device_id, module_id, station_name, module_name")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    setAssignments(data || []);
  }

  // NEW: assign station to room
  async function assignStationToRoom(userRoomId: string) {
    if (!selectedDeviceId) {
      toast.error("Sélectionnez une station.");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) { toast.error("Non authentifié."); return; }
    const dev = currentDevice;
    const mod = modules.find((m) => String(m._id || m.id) === selectedModuleId || "");
    const payload = {
      user_id: userId,
      user_room_id: userRoomId,
      device_id: selectedDeviceId,
      module_id: selectedModuleId ?? null,
      station_name: dev?.station_name ?? dev?.module_name ?? null,
      module_name: mod?.module_name ?? null,
    };
    const { error } = await supabase.from("netatmo_weather_stations").insert(payload);
    if (error) { toast.error(error.message || "Erreur lors de l'assignation."); return; }
    toast.success("Station liée au logement.");
    await loadAssignments();
  }

  // NEW: unassign
  async function unassignStation(recordId: string) {
    const { error } = await supabase.from("netatmo_weather_stations").delete().eq("id", recordId);
    if (error) { toast.error(error.message || "Erreur lors de la suppression."); return; }
    toast.success("Station désassignée.");
    await loadAssignments();
  }

  React.useEffect(() => { loadUserRooms(); loadAssignments(); }, []);

  const devicesList = devices;
  const mainDevice = React.useMemo(() => {
    return devicesList.find((d) => d?.dashboard_data) || devicesList[0] || null;
  }, [devicesList]);

  const outdoorModule = React.useMemo(() => {
    const mods = mainDevice?.modules || [];
    return mods.find((m) => m?.type === "NAModule1" && m?.dashboard_data) || mods.find((m) => m?.type === "NAModule1") || null;
  }, [mainDevice]);

  const indoor = mainDevice?.dashboard_data || null;
  const outdoor = outdoorModule?.dashboard_data || null;

  return (
    <MainLayout>
      <section className="container mx-auto py-10 md:py-16">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Intégration</Badge>
            <Badge variant="outline">Netatmo</Badge>
            <Badge>Stations météo</Badge>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Dernières mesures — Stations Météo Netatmo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-2">
                <Button className="w-full md:w-auto" onClick={loadStations} disabled={loading}>
                  {loading ? "Chargement..." : "Actualiser les mesures"}
                </Button>
              </div>

              {!mainDevice ? (
                <p className="text-sm text-muted-foreground">Aucune station détectée. Cliquez sur "Actualiser les mesures".</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Intérieur */}
                    <div className="rounded border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <HomeIcon className="w-5 h-5 text-blue-600" />
                        <Label className="text-sm font-medium">Intérieur</Label>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Thermometer className="w-4 h-4 text-red-500" />
                            <span>Température</span>
                          </div>
                          <span className="font-medium">{typeof indoor?.Temperature === "number" ? `${indoor.Temperature}°C` : "—"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Leaf className="w-4 h-4 text-green-600" />
                            <span>CO₂</span>
                          </div>
                          <span className="font-medium">{typeof indoor?.CO2 === "number" ? `${indoor.CO2} ppm` : "—"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Droplets className="w-4 h-4 text-sky-500" />
                            <span>Humidité</span>
                          </div>
                          <span className="font-medium">{typeof indoor?.Humidity === "number" ? `${indoor.Humidity}%` : "—"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Volume2 className="w-4 h-4 text-purple-600" />
                            <span>Bruit</span>
                          </div>
                          <span className="font-medium">{typeof indoor?.Noise === "number" ? `${indoor.Noise} dB` : "—"}</span>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Clock className="w-3 h-3" />
                        <span>Mis à jour: {formatTs(indoor?.time_utc)}</span>
                      </div>
                    </div>

                    {/* Extérieur */}
                    <div className="rounded border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Cloud className="w-5 h-5 text-gray-600" />
                        <Label className="text-sm font-medium">Extérieur</Label>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {outdoorModule?.module_name || "Module extérieur"}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Thermometer className="w-4 h-4 text-red-500" />
                            <span>Température</span>
                          </div>
                          <span className="font-medium">{typeof outdoor?.Temperature === "number" ? `${outdoor.Temperature}°C` : "—"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Droplets className="w-4 h-4 text-sky-500" />
                            <span>Humidité</span>
                          </div>
                          <span className="font-medium">{typeof outdoor?.Humidity === "number" ? `${outdoor.Humidity}%` : "—"}</span>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Clock className="w-3 h-3" />
                        <span>Mis à jour: {formatTs(outdoor?.time_utc)}</span>
                      </div>
                      {!outdoor && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Aucun module extérieur (NAModule1) détecté sur cette station.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Détails station */}
                  <div className="rounded bg-gray-50 p-3 text-sm">
                    <p className="font-medium">{mainDevice?.station_name || "Station"}</p>
                    <p className="text-gray-600">Device ID: {String(mainDevice?._id || mainDevice?.id || "—")}</p>
                  </div>

                  {/* NEW: Assignation station ↔ chambre */}
                  <div className="rounded border p-4">
                    <p className="font-medium mb-3">Lier la station à un logement</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Station</Label>
                        <Select onValueChange={(v) => setSelectedDeviceId(v)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Choisir une station" />
                          </SelectTrigger>
                          <SelectContent>
                            {devicesList.map((d) => {
                              const id = String(d._id || d.id);
                              const name = d.station_name || d.module_name || id;
                              return <SelectItem key={id} value={id}>{name}</SelectItem>;
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Module (optionnel)</Label>
                        <Select onValueChange={(v) => setSelectedModuleId(v)}>
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
                        <Label className="text-sm font-medium">Assigner au logement</Label>
                        <Select onValueChange={(roomId) => assignStationToRoom(roomId)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Choisir un logement" />
                          </SelectTrigger>
                          <SelectContent>
                            {userRooms.map((ur) => (
                              <SelectItem key={ur.id} value={ur.id}>{ur.room_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Assignations existantes */}
                    <div className="mt-4">
                      <p className="font-medium">Assignations stations météo</p>
                      {assignments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucune assignation pour l'instant.</p>
                      ) : (
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                          {assignments.map((a) => {
                            const ur = userRooms.find((r) => r.id === a.user_room_id);
                            const label = (a.station_name || a.device_id) + (a.module_name ? ` • module ${a.module_name}` : "");
                            return (
                              <li key={a.id} className="flex items-center">
                                <span>{label} → {ur?.room_name || a.user_room_id}</span>
                                <Button variant="ghost" size="sm" className="ml-2 h-6 px-2" onClick={() => unassignStation(a.id)}>Retirer</Button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </MainLayout>
  );
};

export default NetatmoStationsPage;