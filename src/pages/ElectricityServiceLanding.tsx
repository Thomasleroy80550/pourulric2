"use client";

import React from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Zap, ShieldCheck, Gauge, Euro, CheckCircle2 } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { getSetting } from "@/lib/admin-api";
import { CONTACT_EMAIL_KEY } from "@/lib/constants";
import { sendUnauthenticatedEmail } from "@/lib/unauthenticated-email-api";

const sampleData = [
  { day: "J-4", value: 4.2 },
  { day: "J-3", value: 3.8 },
  { day: "J-2", value: 5.1 },
  { day: "J-1", value: 4.7 },
  { day: "Aujourd'hui", value: 4.9 },
];

const ElectricityServiceLanding: React.FC = () => {
  const navigate = useNavigate();
  const [prm, setPrm] = React.useState("");
  const [note, setNote] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    // Si le service est déjà activé sur le profil, proposer un raccourci
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) return;
      const { data } = await supabase
        .from("profiles")
        .select("conso_service_enabled")
        .eq("id", userId)
        .single();
      if (data?.conso_service_enabled) {
        toast.message("Service déjà activé — accès direct au tableau de bord");
      }
    })().catch(() => {});
  }, []);

  const submit = async () => {
    // Validations
    if (!/^\d{14}$/.test(prm)) {
      toast.error("Le PRM doit contenir 14 chiffres.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(authError.message);
      const userId = userData?.user?.id;
      const userEmail = userData?.user?.email || "(email inconnu)";
      if (!userId) {
        toast.error("Veuillez vous connecter.");
        return;
      }

      // 1) Créer une demande d’activation (trace), marquée pending (sans activer le service)
      const { error: reqErr } = await supabase
        .from("module_activation_requests")
        .insert({
          user_id: userId,
          module_name: "electricity",
          status: "pending",
        });
      if (reqErr) {
        console.warn("module_activation_requests insert error:", reqErr.message);
      }

      // 2) Envoyer un email aux admins
      let adminEmail = "contact@hellokeys.fr";
      try {
        const setting = await getSetting(CONTACT_EMAIL_KEY);
        if (setting && setting.value && typeof setting.value === "string") {
          adminEmail = setting.value;
        }
      } catch {
        // fallback sur défaut
      }

      const subject = "Demande d’activation — Conso Électricité (Linky)";
      const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#111">
          <h2 style="margin:0 0 8px">Nouvelle demande d’activation</h2>
          <p><strong>Service :</strong> Conso Électricité (Linky)</p>
          <p><strong>Utilisateur :</strong> ${userEmail}</p>
          <p><strong>PRM :</strong> ${prm}</p>
          ${note ? `<p><strong>Commentaire :</strong> ${note.replace(/\n/g, "<br/>")}</p>` : ""}
          <p style="margin-top:12px">Merci de traiter cette demande depuis l’admin.</p>
        </div>
      `;

      await sendUnauthenticatedEmail(adminEmail, subject, html);

      toast.success("Votre demande a bien été envoyée. Nous reviendrons vers vous rapidement.");
      // Rester sur la page (pas d’activation immédiate)
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de l’envoi de la demande");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Zap className="h-5 w-5 text-yellow-500" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Conso Électricité (Linky)</h1>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Pourquoi + Exemple Chart */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Pourquoi activer le service ?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Gauge className="h-5 w-5 text-indigo-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Suivi quotidien</p>
                    <p className="text-sm text-muted-foreground">
                      Visualisez vos consommations sur 5 jours glissants, avec signalement des jours sans données.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Euro className="h-5 w-5 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Estimation du coût</p>
                    <p className="text-sm text-muted-foreground">
                      Suivez votre consommation et estimez votre coût d’énergie, consolidé par période et par réservation.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-sky-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Sécurisé</p>
                    <p className="text-sm text-muted-foreground">
                      Vos informations sont stockées en base (Supabase). Pas de stockage local.
                    </p>
                  </div>
                </div>
                <div className="pt-1">
                  <Badge variant="secondary">Aperçu</Badge>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sampleData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="sampleColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.28} />
                          <stop offset="70%" stopColor="#6366f1" stopOpacity={0.06} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" opacity={0.6} />
                      <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#6b7280" }} />
                      <YAxis
                        tick={{ fontSize: 12, fill: "#6b7280" }}
                        tickFormatter={(v: number) => `${v.toLocaleString(undefined, { maximumFractionDigits: 2 })} kWh`}
                      />
                      <Tooltip
                        wrapperStyle={{ outline: "none" }}
                        contentStyle={{
                          background: "rgba(17, 24, 39, 0.92)",
                          border: "1px solid #374151",
                          borderRadius: 8,
                        }}
                        labelStyle={{ color: "#e5e7eb", fontWeight: 600 }}
                        itemStyle={{ color: "#e5e7eb" }}
                        formatter={(val: any) => [
                          `${Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 })} kWh`,
                          "Valeur",
                        ]}
                      />
                      <Legend />
                      <Area
                        name="Valeur"
                        type="monotoneX"
                        dataKey="value"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        fill="url(#sampleColor)"
                        dot={false}
                        activeDot={{ r: 3, stroke: "#6366f1", fill: "#fff" }}
                        connectNulls
                        animationDuration={500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Formulaire de candidature */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Formulaire de candidature</CardTitle>
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
                    <Label htmlFor="note">Commentaire (optionnel)</Label>
                    <Textarea
                      id="note"
                      placeholder="Ex: Je souhaite activer le service pour mon logement principal."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <Alert>
                    <AlertTitle>Comment ça marche ?</AlertTitle>
                    <AlertDescription className="text-sm">
                      Nous recevons votre candidature. Un administrateur valide votre accès et vous êtes notifié par email.
                      Aucune activation immédiate n’est effectuée.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2">
                    <Button className="w-full" onClick={submit} disabled={isSubmitting}>
                      {isSubmitting ? "Envoi en cours..." : "Envoyer ma candidature"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      onClick={() => navigate("/electricity")}
                      title="Ouvrir le tableau de bord si vous avez déjà l'accès"
                    >
                      Ouvrir le tableau de bord
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    En soumettant, vous acceptez la création d’une demande d’activation et l’envoi d’un email à nos équipes.
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
                  <span className="text-sm">Accès déjà activé ?</span>
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