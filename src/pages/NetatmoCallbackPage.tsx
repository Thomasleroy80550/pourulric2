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

const NetatmoCallbackPage: React.FC = () => {
  const [exchanged, setExchanged] = React.useState(false);
  const [stations, setStations] = React.useState<StationsResponse | null>(null);
  const [loading, setLoading] = React.useState(false);

  const redirectUri = React.useMemo(() => `${window.location.origin}/integrations/netatmo/callback`, []);

  const exchangeCode = async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const savedState = localStorage.getItem("netatmo_oauth_state");

    if (!code) {
      toast.error("Code OAuth manquant dans l’URL.");
      return;
    }
    if (!state || !savedState || state !== savedState) {
      toast.error("Échec de vérification de l’état OAuth. Veuillez recommencer.");
      return;
    }

    setLoading(true);
    const { error, data } = await supabase.functions.invoke("netatmo-auth", {
      body: { code, redirect_uri: redirectUri },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message || "Erreur lors de l’échange du code.");
      return;
    }

    toast.success("Connexion Netatmo réussie !");
    setExchanged(true);
    localStorage.removeItem("netatmo_oauth_state");
  };

  const loadStations = async () => {
    setLoading(true);
    const { error, data } = await supabase.functions.invoke("netatmo-proxy", {
      body: { endpoint: "getstationsdata" },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message || "Erreur de récupération des stations.");
      return;
    }

    setStations(data);
  };

  React.useEffect(() => {
    // Si on revient avec ?code=..., tenter l’échange automatiquement
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
                      Cliquez sur “Finaliser” pour échanger le code contre les identifiants et les stocker en sécurité.
                    </AlertDescription>
                  </Alert>
                  <Button onClick={exchangeCode} disabled={loading}>
                    {loading ? "Traitement en cours…" : "Finaliser"}
                  </Button>
                </>
              ) : (
                <>
                  <Alert>
                    <AlertTitle>Connexion réussie</AlertTitle>
                    <AlertDescription>Vous pouvez maintenant charger vos stations Netatmo.</AlertDescription>
                  </Alert>
                  <div className="flex gap-2">
                    <Button onClick={loadStations} disabled={loading}>
                      {loading ? "Chargement…" : "Charger mes stations"}
                    </Button>
                  </div>
                  {stations && (
                    <div className="mt-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Réponse Netatmo</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-xs whitespace-pre-wrap break-words bg-muted p-3 rounded">
                            {JSON.stringify(stations, null, 2)}
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