"use client";

import React from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RefreshCw } from "lucide-react";

const PwaUpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // Vérifie les mises à jour toutes les 15 minutes
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 15 * 60 * 1000);
      }
    },
  });

  const handleUpdate = async () => {
    // Vide tous les caches (Cache Storage) pour éviter de servir l'ancienne version
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch (e) {
      console.warn("Impossible de vider le cache avant la mise à jour :", e);
    }

    // Filet de sécurité : si l'activation du nouveau service worker ne
    // recharge pas la page d'elle-même, on force le rechargement.
    const fallbackReload = setTimeout(() => {
      window.location.reload();
    }, 3000);

    try {
      await updateServiceWorker(true);
    } finally {
      clearTimeout(fallbackReload);
      window.location.reload();
    }
  };

  return (
    <AlertDialog open={needRefresh}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            Nouvelle version disponible
          </AlertDialogTitle>
          <AlertDialogDescription>
            Une mise à jour de l'application est disponible. Cliquez sur
            « Mettre à jour » pour profiter des dernières nouveautés.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setNeedRefresh(false)}>
            Plus tard
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleUpdate}>
            Mettre à jour
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PwaUpdatePrompt;
