import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, FileText, TrendingDown, RefreshCw, CheckCircle2, Clock, Download, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createModuleActivationRequest } from "@/lib/module-activation-api";
import { LMNP_MODULE_NAME, LMNP_ACTIVATION_OPEN } from "@/lib/lmnp-api";
import { buildSampleLmnpData } from "@/lib/lmnp-sample";
import { exportLiassePdf } from "@/lib/lmnp-pdf";
import { useSession } from "@/components/SessionContextProvider";

const FEATURES = [
  {
    icon: FileText,
    title: "Liasse fiscale complète",
    description: "Formulaire 2031 et annexes 2033-A à 2033-E générés automatiquement, exportables en PDF.",
  },
  {
    icon: TrendingDown,
    title: "Amortissements automatiques",
    description: "Gestion des immobilisations (bien, mobilier, travaux) avec plafonnement fiscal (art. 39 C).",
  },
  {
    icon: RefreshCw,
    title: "Import automatique des revenus",
    description: "Vos recettes sont importées directement depuis vos relevés Hello Keys, sans ressaisie.",
  },
  {
    icon: Calculator,
    title: "Résultat fiscal en temps réel",
    description: "Suivi de votre résultat imposable, des déficits reportables et amortissements différés.",
  },
];

const LmnpPaywall: React.FC = () => {
  const { profile } = useSession();
  const [pending, setPending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (!LMNP_ACTIVATION_OPEN) return;
    const checkPending = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("module_activation_requests")
        .select("id")
        .eq("user_id", user.id)
        .eq("module_name", LMNP_MODULE_NAME)
        .eq("status", "pending");
      setPending(!!data && data.length > 0);
    };
    checkPending();
  }, []);

  const handleRequest = async () => {
    setSubmitting(true);
    try {
      await createModuleActivationRequest(LMNP_MODULE_NAME);
      setPending(true);
      toast.success("Demande d'activation envoyée ! Notre équipe va la traiter rapidement.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadSample = () => {
    try {
      const year = new Date().getFullYear() - 1;
      const { computation, settings } = buildSampleLmnpData(year);
      exportLiassePdf(computation, settings, { specimen: true });
      toast.success("Bilan de test généré ! Vous pouvez l'envoyer à votre expert-comptable.");
    } catch (err: any) {
      toast.error(`Erreur lors de la génération du bilan de test : ${err.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-[hsl(var(--sidebar-foreground))] via-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white shadow-lg">
        <CardContent className="p-8 text-center">
          <Badge variant="secondary" className="bg-white/15 text-white mb-4">Module payant</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold">Compta LMNP — Liasse fiscale</h2>
          <p className="mt-3 max-w-2xl mx-auto text-white/85">
            Sortez votre liasse fiscale LMNP au régime réel simplifié en quelques clics :
            revenus importés automatiquement, amortissements calculés, formulaires 2031 et 2033 prêts à l'emploi.
          </p>
          <div className="mt-6 flex items-baseline justify-center gap-2">
            <span className="text-4xl font-extrabold">99€</span>
            <span className="text-white/80">HT / an</span>
          </div>
          <div className="mt-6">
            {!LMNP_ACTIVATION_OPEN ? (
              <Button size="lg" variant="secondary" disabled className="rounded-full bg-white/15 text-white">
                <Clock className="mr-2 h-4 w-4" />
                Bientôt disponible
              </Button>
            ) : pending ? (
              <Button size="lg" variant="secondary" disabled className="rounded-full bg-white/15 text-white">
                <Clock className="mr-2 h-4 w-4" />
                Demande envoyée — en attente de validation
              </Button>
            ) : (
              <Button
                size="lg"
                variant="secondary"
                className="rounded-full bg-white text-[hsl(var(--primary))] hover:bg-white/90"
                onClick={handleRequest}
                disabled={submitting}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {submitting ? "Envoi en cours…" : "Demander l'activation"}
              </Button>
            )}
          </div>
          <p className="mt-3 text-xs text-white/70">
            {LMNP_ACTIVATION_OPEN
              ? "Facturation annuelle via votre compte Hello Keys après validation de la demande."
              : "Le module est en cours de validation par un expert-comptable. Ouverture des activations très prochainement."}
          </p>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card className="border-dashed border-2 shadow-none">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5">
            <div className="flex gap-4">
              <div className="rounded-lg bg-muted p-2.5 h-fit">
                <FlaskConical className="h-5 w-5 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">Bilan de test</p>
                  <Badge variant="outline">Réservé admin</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Liasse complète (2031 + 2033-A à E) générée à partir d'un jeu de données fictif :
                  12 relevés mensuels, charges variées, 4 immobilisations, déficits antérieurs.
                  À envoyer à votre expert-comptable pour validation avant l'ouverture aux clients.
                </p>
              </div>
            </div>
            <Button onClick={handleDownloadSample} className="shrink-0">
              <Download className="mr-2 h-4 w-4" />
              Télécharger le bilan de test
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FEATURES.map((f) => (
          <Card key={f.title} className="shadow-sm">
            <CardContent className="p-5 flex gap-4">
              <div className="rounded-lg bg-muted p-2.5 h-fit">
                <f.icon className="h-5 w-5 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <p className="font-semibold">{f.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LmnpPaywall;
