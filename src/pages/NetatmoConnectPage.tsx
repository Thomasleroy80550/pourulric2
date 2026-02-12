"use client";

import React from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getSetting } from "@/lib/admin-api";

const DEFAULT_SCOPE = "read_thermostat write_thermostat read_station";

const NetatmoConnectPage: React.FC = () => {
  const navigate = useNavigate();
  const [clientId, setClientId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      // Si tokens déjà présents, rediriger directement vers le dashboard
      const { data } = await supabase.from("netatmo_tokens").select("user_id").limit(1);
      if (data && data.length > 0) {
        toast.success("Accès Netatmo déjà activé, ouverture du tableau de bord…");
        navigate("/integrations/netatmo/dashboard");
        return;
      }
      // Sinon, charger le client_id depuis l'edge function
      try {
        const { data: cfg, error } = await supabase.functions.invoke("netatmo-config", { body: {} });
        if (error) {
          toast.error(error.message || "Impossible de charger la configuration Netatmo.");
          setClientId(null);
          return;
        }
        setClientId(cfg?.client_id || null);
      } catch {
        setClientId(null);
      }
    })();
  }, []);

  const connect = async () => {
    if (!clientId) {
      toast.error("Configuration Netatmo manquante (client_id). Contactez un administrateur.");
      return;
    }
    setLoading(true);
    try {
      const redirectUri = `${window.location.origin}/integrations/netatmo/callback`;
      const scope = DEFAULT_SCOPE;
      const state = crypto.randomUUID();
      localStorage.setItem("netatmo_oauth_state", state);

      const url = `https://api.netatmo.com/oauth2/authorize?client_id=${encodeURIComponent(
        clientId
      )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(
        scope
      )}&state=${encodeURIComponent(state)}`;

      window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de la préparation de la connexion Netatmo");
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <section className="container mx-auto py-10 md:py-16">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary">Intégration</Badge>
            <Badge variant="outline">Netatmo</Badge>
          </div>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Connecter mon compte Netatmo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTitle>Comment ça marche ?</AlertTitle>
                <AlertDescription>
                  Vous serez redirigé vers Netatmo pour autoriser l'accès à vos thermostats (Energy). De retour ici, nous finaliserons la connexion et stockerons vos identifiants de façon sécurisée.
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button onClick={connect} disabled={loading || !clientId} className="w-full">
                  {loading ? "Redirection vers Netatmo…" : "Connecter Netatmo"}
                </Button>
                <Button variant="secondary" className="w-full" onClick={() => navigate("/integrations/netatmo/dashboard")}>
                  Ouvrir le tableau de bord
                </Button>
              </div>
              {!clientId && (
                <p className="text-sm text-muted-foreground">
                  Client ID Netatmo introuvable. Vérifiez que les secrets NETATMO_CLIENT_ID et NETATMO_CLIENT_SECRET sont bien configurés dans Supabase.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </MainLayout>
  );
};

export default NetatmoConnectPage;