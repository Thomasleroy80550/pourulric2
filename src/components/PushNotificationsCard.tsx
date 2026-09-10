"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { BellRing, Share, PlusSquare, Smartphone } from "lucide-react";
import { toast } from "sonner";
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

const PushNotificationsCard: React.FC = () => {
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
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <BellRing className="h-5 w-5 text-blue-600" />
          Notifications push
        </CardTitle>
      </CardHeader>
      <CardContent>
        {supported ? (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Recevez une notification sur cet appareil dès qu'une nouvelle
              notification arrive, même lorsque l'application est fermée.
            </p>
            <Switch
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={loading}
              aria-label="Activer les notifications push"
            />
          </div>
        ) : isIos() && !isStandalone() ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 p-4 space-y-2">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <Smartphone className="h-4 w-4 shrink-0" />
              Installez l'application pour activer les notifications
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Sur iPhone et iPad, les notifications push nécessitent d'installer
              l'application sur votre écran d'accueil :
            </p>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal pl-5">
              <li>
                Appuyez sur le bouton <strong>Partager</strong>{" "}
                <Share className="h-4 w-4 inline align-text-bottom" /> de Safari
              </li>
              <li>
                Choisissez <strong>« Sur l'écran d'accueil »</strong>{" "}
                <PlusSquare className="h-4 w-4 inline align-text-bottom" />
              </li>
              <li>Ouvrez l'app depuis l'écran d'accueil et revenez ici</li>
            </ol>
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Les notifications push ne sont pas supportées par ce navigateur.
            Essayez avec Chrome, Edge ou Firefox, ou installez l'application sur
            votre écran d'accueil.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PushNotificationsCard;
