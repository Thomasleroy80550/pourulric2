"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import {
  isPushSupported,
  getCurrentPushSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push-api";

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

  if (!supported) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <BellRing className="h-5 w-5 text-blue-600" />
          Notifications push
        </CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
};

export default PushNotificationsCard;
