import React, { useEffect, useState } from "react";
import { Ban, HelpCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "dismiss_contract_terminated_banner";

const ContractTerminatedBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkProfile = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        if (!userId) {
          if (isMounted) {
            setVisible(false);
            setChecking(false);
          }
          return;
        }

        // Respect RLS: l'utilisateur ne peut lire que son propre profil
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("is_contract_terminated, first_name, last_name")
          .eq("id", userId)
          .single();

        if (error) {
          console.warn("Profil introuvable ou erreur:", error.message);
          if (isMounted) setVisible(false);
        } else {
          const dismissed = localStorage.getItem(STORAGE_KEY) === "true";
          if (isMounted) {
            setVisible(Boolean(profile?.is_contract_terminated) && !dismissed);
          }
        }
      } finally {
        if (isMounted) setChecking(false);
      }
    };

    checkProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!visible || checking) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-screen-2xl px-3">
        <div className="mt-2 rounded-lg border-2 border-destructive shadow-2xl overflow-hidden">
          <div className="relative">
            <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-destructive-foreground">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 md:p-5">
                <div className="flex items-start md:items-center gap-3">
                  <div className="shrink-0">
                    <div className="rounded-full bg-red-800/70 p-2 md:p-3 ring-2 ring-red-400/60">
                      <Ban className="h-6 w-6 md:h-7 md:w-7 text-white" />
                    </div>
                  </div>
                  <div className="text-white">
                    <h3 className="text-xl md:text-2xl font-extrabold tracking-tight">
                      Contrat résilié — accès fortement limité
                    </h3>
                    <p className="mt-1 text-sm md:text-base text-red-50">
                      Votre contrat a été résilié. Certains services sont désactivés et vos accès sont restreints.
                      Contactez le support pour connaître les prochaines étapes.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                  <Button
                    variant="secondary"
                    className="bg-white/95 text-red-700 hover:bg-white"
                    onClick={() => {
                      window.location.href = "/help";
                    }}
                  >
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Centre d’aide
                  </Button>
                  <Button
                    variant="secondary"
                    className="bg-white/95 text-red-700 hover:bg-white"
                    onClick={() => {
                      window.location.href = "mailto:support@hellokeys.fr?subject=Contrat%20résilié%20-%20Assistance";
                    }}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Contacter le support
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/60 text-white hover:bg-white/10"
                    onClick={() => {
                      localStorage.setItem(STORAGE_KEY, "true");
                      setVisible(false);
                    }}
                  >
                    Compris
                  </Button>
                </div>
              </div>
            </div>

            {/* Barre d'accent animée pour renforcer l'impact visuel */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-red-300 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractTerminatedBanner;