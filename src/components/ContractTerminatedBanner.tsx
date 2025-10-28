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
    <div className="mx-auto max-w-screen-2xl px-3">
      <div className="mt-3 rounded-md border border-red-500 bg-red-50 dark:bg-red-900/10 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4">
          <div className="flex items-start md:items-center gap-3">
            <div className="shrink-0">
              <div className="rounded-full bg-red-600/10 p-2 ring-2 ring-red-300/60">
                <Ban className="h-5 w-5 text-red-700 dark:text-red-300" />
              </div>
            </div>
            <div className="text-red-900 dark:text-red-100">
              <h3 className="text-base md:text-lg font-bold tracking-tight">
                Contrat résilié — accès limité
              </h3>
              <p className="mt-1 text-xs md:text-sm text-red-800 dark:text-red-200">
                Certaines fonctionnalités sont désactivées. Contactez le support pour connaître les prochaines étapes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <Button
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => { window.location.href = "/help"; }}
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Centre d'aide
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                window.location.href = "mailto:support@hellokeys.fr?subject=Contrat%20r%C3%A9sili%C3%A9%20-%20Assistance";
              }}
            >
              <Mail className="mr-2 h-4 w-4" />
              Contacter le support
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-700 hover:bg-red-100"
              onClick={() => {
                localStorage.setItem(STORAGE_KEY, "true");
                setVisible(false);
              }}
            >
              Compris
            </Button>
          </div>
        </div>

        <div className="h-1 w-full bg-gradient-to-r from-red-400 via-red-500 to-red-600" />
      </div>
    </div>
  );
};

export default ContractTerminatedBanner;