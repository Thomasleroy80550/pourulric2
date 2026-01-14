"use client";

import React from "react";
import MainLayout from "@/components/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const DEFAULT_SCOPE = "read_station read_thermostat write_thermostat";

const NetatmoTokenOverridePage: React.FC = () => {
  const navigate = useNavigate();
  const [accessToken, setAccessToken] = React.useState<string>("");
  const [refreshToken, setRefreshToken] = React.useState<string>("");
  const [scope, setScope] = React.useState<string>(DEFAULT_SCOPE);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const a = params.get("access");
    const r = params.get("refresh");
    const s = params.get("scope");
    if (a) setAccessToken(a);
    if (r) setRefreshToken(r);
    if (s) setScope(s);
  }, []);

  async function saveTokens() {
    if (!accessToken || !refreshToken) {
      toast.error("Renseignez l'access token et le refresh token.");
      return;
    }
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) {
      setLoading(false);
      toast.error("Veuillez vous connecter.");
      navigate("/login");
      return;
    }
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // expire dans ~1h, le proxy rafraîchira ensuite
    const { error } = await supabase
      .from("netatmo_tokens")
      .upsert(
        {
          user_id: uid,
          access_token: accessToken,
          refresh_token: refreshToken,
          scope: scope || DEFAULT_SCOPE,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    setLoading(false);
    if (error) {
      toast.error(error.message || "Erreur d'enregistrement des tokens.");
      return;
    }
    toast.success("Tokens Netatmo enregistrés.");
    navigate("/integrations/netatmo/stations");
  }

  return (
    <MainLayout>
      <section className="container mx-auto py-10 md:py-16">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Intégration</Badge>
            <Badge variant="outline">Netatmo</Badge>
            <Badge>Override Tokens</Badge>
          </div>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Enregistrer les tokens Netatmo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Access Token</Label>
                <Input
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="coller l'access token"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Refresh Token</Label>
                <Input
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                  placeholder="coller le refresh token"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Scope</Label>
                <Input
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  placeholder={DEFAULT_SCOPE}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Par défaut: {DEFAULT_SCOPE}
                </p>
              </div>
              <div className="flex gap-2">
                <Button className="w-full" onClick={saveTokens} disabled={loading}>
                  {loading ? "Enregistrement..." : "Enregistrer et ouvrir Stations"}
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => navigate("/integrations/netatmo/stations")}
                >
                  Ouvrir Stations
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Astuce: vous pouvez aussi passer les paramètres d'URL ?access=...&refresh=...&scope=...
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </MainLayout>
  );
};

export default NetatmoTokenOverridePage;