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

  const devices: StationDevice[] = React.useMemo(() => {
    const devs = stationsData?.body?.devices;
    return Array.isArray(devs) ? devs : [];
  }, [stationsData]);

  const mainDevice = React.useMemo(() => {
    // Premier device avec dashboard_data (station intérieure)
    return devices.find((d) => d?.dashboard_data) || devices[0] || null;
  }, [devices]);

  const outdoorModule = React.useMemo(() => {
    // Premier module extérieur (NAModule1 = Outdoor)
    const mods = mainDevice?.modules || [];
    return mods.find((m) => m?.type === "NAModule1" && m?.dashboard_data) || mods.find((m) => m?.type === "NAModule1") || null;
  }, [mainDevice]);

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
    toast.success("Dernières mesures récupérées.");
  }

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
                <p className="text-sm text-muted-foreground">Aucune station détectée. Cliquez sur “Actualiser les mesures”.</p>
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