"use client";

import React from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Zap, ShieldCheck, Gauge, Euro, CheckCircle2 } from "lucide-react";

const ElectricityServiceLanding: React.FC = () => {
  const navigate = useNavigate();
  const [prm, setPrm] = React.useState("");
  const [token, setToken] = React.useState("");
  const [pricePerKWh, setPricePerKWh] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    // Pré-remplir si profile a déjà des valeurs
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) return;
      const { data } = await supabase
        .from("profiles")
        .select("conso_prm, conso_token, conso_price_per_kwh, conso_service_enabled")
        .eq("id", userId)
        .single();
      if (data?.conso_prm) setPrm(data.conso_prm);
      if (data?.conso_token) setToken(data.conso_token);
      if (data?.conso_price_per_kwh != null) setPricePerKWh(String(data.conso_price_per_kwh));
      if (data?.conso_service_enabled) {
        // déjà activé → raccourci
        toast.message("Service déjà activé — redirection…");
        navigate("/electricity");
      }
    })().catch(() => {});
  }, [navigate]);

  const submit = async () => {
    // Validations
    if (!/^\d{14}$/.test(prm)) {
      toast.error("Le PRM doit contenir 14 chiffres.");
      return;
    }
    if (!token || token.length < 10) {
      toast.error("Veuillez renseigner votre token Conso API.");
      return;
    }
    const p = Number(String(pricePerKWh || "").replace(",", "."));
    if (!Number.isFinite(p) || p < 0) {
      toast.error("Prix par kWh invalide (ex: 0.25).");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(authError.message);
      const userId = userData?.user?.id;
      if (!userId) {
        toast.error("Veuillez vous connecter.");
        return;
      }

      // 1) Mettre à jour le profil (active le service + enregistre PRM/Token/Prix)
      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          conso_prm: prm || null,
          conso_token: token || null,
          conso_price_per_kwh: p,
          conso_service_enabled: true,
        })
        .eq("id", userId);
      if (upErr) throw new Error(upErr.message);

      // 2) Créer une demande d’activation (trace), marquée pending
      const { error: reqErr } = await supabase
        .from("module_activation_requests")
        .insert({
          user_id: userId,
          module_name: "electricity",
          status: "pending",
        });
      if (reqErr) {
        // non bloquant
        console.warn("module_activation_requests insert error:", reqErr.message);
      }

      toast.success("Service activé, redirection vers votre conso…");
      navigate("/electricity");
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de l’activation du service");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Zap className="h-5 w-5 text-yellow-500" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Conso Électricité (Linky)</h1>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Pourquoi activer le service ?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Gauge className="h-5 w-5 text-indigo-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Suivi quotidien</p>
                    <p className="text-sm text-muted-foreground">
                      Visualisez vos consommations (Wh/W) sur 5 jours glissants, avec alertes si donnée manquante.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Euro className="h-5 w-5 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Coût estimé</p>
                    <p className="text-sm text-muted-foreground">
                      Indiquez votre prix/kWh et suivez automatiquement vos coûts par jour et par réservation.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-sky-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Sécurisé</p>
                    <p className="text-sm text-muted-foreground">
                      Vos identifiants PRM/Token et prix sont stockés en base (Supabase) — aucun stockage local.
                    </p>
                  </div>
                </div>
                <div className="pt-2">
                  <Badge variant="secondary">Activation instantanée</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Activer le service</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="prm">PRM (14 chiffres)</Label>
                    <Input
                      id="prm"
                      inputMode="numeric"
                      pattern="\d{14}"
                      placeholder="Ex: 12345678901234"
                      value={prm}
                      onChange={(e) => setPrm(e.target.value.replace(/\D/g, "").slice(0, 14))}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="token">Token Conso API</Label>
                    <Input
                      id="token"
                      placeholder="Bearer token"
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="price">Prix par kWh (€)</Label>
                    <Input
                      id="price"
                      inputMode="decimal"
                      placeholder="Ex: 0.25"
                      value={pricePerKWh}
                      onChange={(e) => setPricePerKWh(e.target.value)}
                    />
                  </div>

                  <Alert>
                    <AlertTitle>Besoin d’aide ?</AlertTitle>
                    <AlertDescription className="text-sm">
                      Le token s’obtient après consentement Conso API. Le PRM se lit sur votre compteur Linky (14 chiffres).
                    </AlertDescription>
                  </Alert>

                  <Button className="w-full" onClick={submit} disabled={isSubmitting}>
                    {isSubmitting ? "Activation en cours..." : "Activer maintenant"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    En cliquant, vous acceptez l’enregistrement de ces informations dans votre profil et la création d’une demande d’activation.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6 shadow-sm">
            <CardContent className="py-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm">Une fois activé, accédez à votre suivi ici:</span>
                </div>
                <Button variant="secondary" onClick={() => navigate("/electricity")}>
                  Ouvrir le tableau de bord Conso
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default ElectricityServiceLanding;