import React, { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  isPushSupported,
  getCurrentPushSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push-api";

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.userAgent.includes("Mac") && "ontouchend" in document);

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as any).standalone === true;

const PushSettingV4: React.FC = () => {
  const [supported] = useState(isPushSupported());
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supported) {
      setLoading(false);
      return;
    }
    getCurrentPushSubscription()
      .then((sub) => setEnabled(!!sub))
      .catch(() => setEnabled(false))
      .finally(() => setLoading(false));
  }, [supported]);

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    try {
      if (checked) {
        await subscribeToPush();
        setEnabled(true);
        toast.success("Notifications push activées sur cet appareil !");
      } else {
        await unsubscribeFromPush();
        setEnabled(false);
        toast.success("Notifications push désactivées.");
      }
    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue.");
      setEnabled(!checked);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
          <BellRing size={18} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">
            Notifications push
          </p>
          <p className="text-xs text-slate-400">
            {supported
              ? enabled
                ? "Activées sur cet appareil"
                : "Recevez les alertes même app fermée"
              : isIos() && !isStandalone()
                ? "Installez l'app sur l'écran d'accueil pour les activer"
                : "Non supportées par ce navigateur"}
          </p>
        </div>
        {supported && (
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={loading}
            aria-label="Activer les notifications push"
          />
        )}
      </div>
    </div>
  );
};

export default PushSettingV4;
