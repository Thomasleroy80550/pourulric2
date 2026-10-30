import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isStandalone } from "@/lib/pwa-api";
import HalloweenPrank from "./HalloweenPrank";

export default function PwaBonusGift({ userId }: { userId: string }) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!isStandalone()) return;
    let active = true;
    supabase.from("halloween_bonus_claims").select("user_id").eq("user_id", userId).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          toast.error("Le bonus cadeau est momentanément indisponible.");
          return;
        }
        setAvailable(!data);
      });
    return () => { active = false; };
  }, [userId]);

  const claim = async () => {
    const { error } = await supabase.from("halloween_bonus_claims").insert({ user_id: userId });
    if (error?.code === "23505") {
      toast.info("Tu as déjà ouvert ton bonus cadeau.");
      return false;
    }
    if (error) throw error;
    return true;
  };

  if (!available) return null;
  return <HalloweenPrank bonus onClaim={claim} onDismiss={() => setAvailable(false)} />;
}
