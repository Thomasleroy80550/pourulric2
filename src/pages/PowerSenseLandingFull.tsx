"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Zap, ShieldCheck, Gauge, Euro, CheckCircle2, Activity, LineChart, Bell, Lock } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ComposedChart,
  Bar,
  Line,
} from "recharts";
import { getSetting } from "@/lib/admin-api";
import { CONTACT_EMAIL_KEY } from "@/lib/constants";
import { sendUnauthenticatedEmail } from "@/lib/unauthenticated-email-api";
import ElectricitySpark from "@/components/ElectricitySpark";

const sampleData = [
  { day: "J-4", value: 4.2 },
  { day: "J-3", value: 3.8 },
  { day: "J-2", value: 5.1 },
  { day: "J-1", value: 4.7 },
  { day: "Aujourd'hui", value: 4.9 },
];

const PowerSenseLandingFull: React.FC = () => {
  const navigate = useNavigate();
  const [prm, setPrm] = React.useState("");
  const [note, setNote] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Données animées (exemple)
  const [animatedData, setAnimatedData] = React.useState(sampleData);
  React.useEffect(() => {
    const id = setInterval(() => {
      setAnimatedData((prev) =>
        prev.map((d, i) => {
          const jitter = (Math.random() - 0.5) * 0.2; // +/-0.1..0.2 kWh
          const next = Math.max(0, d.value + jitter);
          return { ...d, value: Number(next.toFixed(2)) };
        })
      );
    }, 1400);
    return () => clearInterval(id);
  }, []);
  const animatedCo2 = React.useMemo(
    () => animatedData.map((d) => ({ ...d, co2: Number((d.value * 0.05).toFixed(3)) })), // 0,05 kg/kWh
    [animatedData]
  );

  const submit = async () => {
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

      // Trace demande d'activation
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

      // Email admins
      let adminEmail = "contact@hellokeys.fr";
      try {
        const setting = await getSetting(CONTACT_EMAIL_KEY);
        if (setting && setting.value && typeof setting.value === "string") {
          adminEmail = setting.value;
        }
      } catch {
        // fallback
      }

      const subject = "Demande d'activation — PowerSense (Conso Électricité)";
      const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#111">
          <h2 style="margin:0 0 8px">Nouvelle demande d'activation</h2>
          <p><strong>Service :</strong> PowerSense (Linky)</p>
          <p><strong>Utilisateur :</strong> ${userEmail}</p>
          <p><strong>PRM :</strong> ${prm}</p>
          ${note ? `<p><strong>Commentaire :</strong> ${note.replace(/\n/g, "<br/>")}</p>` : ""}
          <p style="margin-top:12px">Merci de traiter cette demande depuis l'admin.</p>
        </div>
      `;
      await sendUnauthenticatedEmail(adminEmail, subject, html);

      toast.success("Candidature envoyée. Nous reviendrons vers vous rapidement.");
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de l'envoi de la demande");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-b from-indigo-600/10 via-sky-500/5 to-white">
      {/* Top brand bar minimaliste */}
      <header className="w-full">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-yellow-100 flex items-center justify-center">
              <Zap className="h-5 w-5 text-yellow-500" />
            </div>
            <span className="text-xl font-semibold tracking-tight">PowerSense</span>
            <Badge variant="outline" className="ml-2">Linky</Badge>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" onClick={() => document.getElementById('apply-form')?.scrollIntoView({ behavior: 'smooth' })}>
              Demander l'accès
            </Button>
            <Button variant="secondary" onClick={() => navigate("/electricity")}>
              Ouvrir le tableau de bord
            </Button>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4">
          <ElectricitySpark className="mb-2" />
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-6 md:pt-10 text-center">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
          Votre électricité, sous contrôle — simplement.
        </h1>
        <p className="mt-3 text-base md:text-lg text-muted-foreground max-w-3xl mx-auto">
          PowerSense vous aide à suivre votre consommation Linky au quotidien, à repérer les anomalies
          et à préparer vos décisions — sans prise de tête.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Button size="lg" onClick={() => document.getElementById('apply-form')?.scrollIntoView({ behavior: 'smooth' })}>
            <Zap className="h-4 w-4 mr-2" /> Demander l'accès
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/electricity")}>
            Voir mon tableau de bord
          </Button>
        </div>
      </section>

      {/* Aperçu chart + bénéfices */}
      <section className="mx-auto max-w-6xl px-4 mt-8 md:mt-12">
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-indigo-500" />
                <CardTitle>Aperçu en temps réel</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
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
                      name="Consommation"
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

          <div className="grid gap-4">
            <Card>
              <CardContent className="p-5 flex items-start gap-3">
                <Gauge className="h-5 w-5 text-indigo-500 mt-0.5" />
                <div>
                  <p className="font-medium">Suivi quotidien</p>
                  <p className="text-sm text-muted-foreground">
                    Visualisez vos consommations récentes et identifiez les jours sans remontée de données.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-start gap-3">
                <Bell className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium">Anomalies & pics</p>
                  <p className="text-sm text-muted-foreground">
                    Repérez rapidement les pics de conso, pour réagir et optimiser vos coûts.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-start gap-3">
                <Lock className="h-5 w-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-medium">Sécurisé & simple</p>
                  <p className="text-sm text-muted-foreground">
                    Données stockées en base, pas de stockage local. Activation gérée par nos équipes.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Fonctionnalités clés */}
      <section className="mx-auto max-w-6xl px-4 mt-10">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">Fonctionnalité</Badge>
                <Zap className="h-4 w-4 text-yellow-500" />
              </div>
              <p className="font-medium">CO₂ et coût estimés</p>
              <p className="text-sm text-muted-foreground">Suivi automatique du coût et des émissions (0,05 kg/kWh).</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">Fonctionnalité</Badge>
                <LineChart className="h-4 w-4 text-indigo-600" />
              </div>
              <p className="font-medium">Analyse par réservation</p>
              <p className="text-sm text-muted-foreground">Sommes par séjour (kWh, € et CO₂), même si la période affichée ne couvre pas toutes les résas.</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">Fonctionnalité</Badge>
                <Bell className="h-4 w-4 text-amber-500" />
              </div>
              <p className="font-medium">Détection des pics</p>
              <p className="text-sm text-muted-foreground">Mise en évidence des pics de conso pour décider rapidement.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Exemples animés: Dashboard et Relevé */}
      <section className="mx-auto max-w-6xl px-4 mt-10">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Dashboard animé */}
          <Card className="shadow-sm relative overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CardTitle>Aperçu du tableau de bord</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ElectricitySpark className="mb-3" />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={animatedCo2} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" opacity={0.6} />
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#6b7280" }} />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                      tickFormatter={(v: number) => `${v.toLocaleString(undefined, { maximumFractionDigits: 2 })} kWh`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                      tickFormatter={(v: number) => `${v.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`}
                    />
                    <Tooltip
                      wrapperStyle={{ outline: "none" }}
                      contentStyle={{ background: "rgba(17,24,39,0.92)", border: "1px solid #374151", borderRadius: 8 }}
                      labelStyle={{ color: "#e5e7eb", fontWeight: 600 }}
                      itemStyle={{ color: "#e5e7eb" }}
                    />
                    <Legend />
                    <Bar dataKey="value" name="Consommation" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="co2"
                      name="CO₂ (kg)"
                      stroke="#14b8a6"
                      strokeWidth={2.2}
                      dot={false}
                      activeDot={{ r: 3, stroke: "#14b8a6", fill: "#fff" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Relevé animé */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CardTitle>Relevé d'événements</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ElectricitySpark className="mb-3" />
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-yellow-500 animate-pulse mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Pic de consommation détecté</p>
                    <p className="text-xs text-muted-foreground">Aujourd'hui, 11:02 — +18% vs veille</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-blue-500 animate-pulse mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Jour sans relevé</p>
                    <p className="text-xs text-muted-foreground">Hier — aucune donnée remontée</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-emerald-500 animate-pulse mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">CO₂ estimé</p>
                    <p className="text-xs text-muted-foreground">Semaine — 1,25 kg (facteur 0,05 kg/kWh)</p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Étapes */}
      <section className="mx-auto max-w-6xl px-4 mt-10">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">Étape 1</Badge>
                <Activity className="h-4 w-4 text-sky-500" />
              </div>
              <p className="font-medium">Envoyez votre PRM</p>
              <p className="text-sm text-muted-foreground">Soumettez votre candidature en 30 secondes.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">Étape 2</Badge>
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="font-medium">Validation</p>
              <p className="text-sm text-muted-foreground">Un admin active votre accès dans les meilleurs délais.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">Étape 3</Badge>
                <LineChart className="h-4 w-4 text-indigo-600" />
              </div>
              <p className="font-medium">Suivi & décisions</p>
              <p className="text-sm text-muted-foreground">Accédez à votre tableau de bord PowerSense.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Formulaire + FAQ */}
      <section id="apply-form" className="mx-auto max-w-6xl px-4 mt-10">
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-sm md:col-span-1">
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
                    Votre candidature est transmise à nos équipes. Un administrateur valide l'accès.
                    Aucune activation immédiate n'est effectuée.
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
                  En soumettant, vous acceptez la création d'une demande d'activation et l'envoi d'un email à nos équipes.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm md:col-span-1">
            <CardHeader>
              <CardTitle>Questions fréquentes</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="q1">
                  <AccordionTrigger>Qu'est-ce que PowerSense ?</AccordionTrigger>
                  <AccordionContent>
                    PowerSense est l'add-on de suivi de la consommation électrique (Linky) intégré à votre espace. Il met en forme vos données et simplifie vos décisions.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q2">
                  <AccordionTrigger>Combien de temps pour l'activation ?</AccordionTrigger>
                  <AccordionContent>
                    Nous traitons les demandes rapidement. Vous recevrez un email dès que votre accès est prêt.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q3">
                  <AccordionTrigger>Mes données sont-elles sécurisées ?</AccordionTrigger>
                  <AccordionContent>
                    Oui. Vos identifiants (PRM et autres) sont stockés côté serveur (Supabase), sans stockage local.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Bandeau accès */}
      <section className="mx-auto max-w-6xl px-4 mt-10 pb-12">
        <Card className="shadow-sm">
          <CardContent className="py-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="text-sm">Accès déjà activé ?</span>
              </div>
              <Button variant="secondary" onClick={() => navigate("/electricity")}>
                Ouvrir le tableau de bord PowerSense
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default PowerSenseLandingFull;