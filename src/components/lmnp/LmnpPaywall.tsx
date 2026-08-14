import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, FileText, TrendingDown, RefreshCw, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createModuleActivationRequest } from "@/lib/module-activation-api";
import { LMNP_MODULE_NAME } from "@/lib/lmnp-api";

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
  const [pending, setPending] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
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
            {pending ? (
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
            Facturation annuelle via votre compte Hello Keys après validation de la demande.
          </p>
        </CardContent>
      </Card>

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
