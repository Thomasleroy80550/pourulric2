"use client";

import React from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type StationsResponse = any;
type HomesDataResponse = any;
type HomeStatusResponse = any;

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
  };

  React.useEffect(() => {
    // Si on revient avec ?code=..., tenter l'échange automatiquement
    const params = new URLSearchParams(window.location.search);
    if (params.get("code")) {
      exchangeCode();
    }
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
                                <ul className="text-sm list-disc pl-5 space-y-1">
                                  {(home.rooms || []).map((r: any) => (
                                    <li key={r.id}>
                                      {r.name} · type: {r.type} · id: {r.id}
                                    </li>
                                  ))}
                                </ul>
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