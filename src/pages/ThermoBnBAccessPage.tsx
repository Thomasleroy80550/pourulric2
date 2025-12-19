"use client";

import React from "react";
import MainLayout from "@/components/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ACCESS_KEY = "thermobnb_access_granted";

const ThermoBnBAccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [expectedPwd, setExpectedPwd] = React.useState<string>("Yolo80550");
  const [pwd, setPwd] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    // Essayer de charger le mot de passe depuis app_settings (si connecté); sinon garder la valeur par défaut
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "thermobnb_access_password")
      .limit(1)
      .then(({ data }) => {
        try {
          const v = data?.[0]?.value;
          const pass =
            typeof v === "string"
              ? v
              : v && typeof v === "object"
              ? (v.password || v.pass || null)
              : null;
          if (pass) setExpectedPwd(String(pass));
        } catch {
          // garder la valeur par défaut
        }
      });
  }, []);

  const handleSubmit = async () => {
    if (!pwd.trim()) {
      toast.error("Entrez un mot de passe.");
      return;
    }
    setLoading(true);
    const ok = pwd.trim() === expectedPwd;
    setLoading(false);
    if (!ok) {
      toast.error("Mot de passe incorrect.");
      return;
    }
    try {
      localStorage.setItem(ACCESS_KEY, "true");
    } catch {}
    toast.success("Accès confirmé.");
    navigate("/integrations/netatmo/dashboard");
  };

  return (
    <MainLayout>
      <div className="p-6 max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Accès ThermoBnB</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-3">
              Pour ouvrir le service ThermoBnB, entrez le mot de passe fourni.
            </p>
            <Input
              type="password"
              placeholder="Mot de passe ThermoBnB"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              className="mb-3"
            />
            <Button onClick={handleSubmit} disabled={loading} className="w-full">
              {loading ? "Validation..." : "Valider et ouvrir ThermoBnB"}
            </Button>

            <div className="mt-4">
              <Button variant="outline" className="w-full" onClick={() => navigate("/thermobnb")}>
                Retour à la page de lancement
              </Button>
            </div>

            <p className="text-xs text-gray-500 mt-3">
              Astuce: le mot de passe peut être défini dans les paramètres (app_settings → key "thermobnb_access_password").
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ThermoBnBAccessPage;