"use client";

import React, { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { PartyPopper, RefreshCw } from "lucide-react";

/** Événement custom permettant de tester visuellement le popup (admin). */
export const PWA_UPDATE_TEST_EVENT = "pwa-update-prompt-test";

const PwaUpdatePrompt: React.FC = () => {
  const [testMode, setTestMode] = useState(false);
  const [updating, setUpdating] = useState(false);

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

  useEffect(() => {
    const openTest = () => setTestMode(true);
    window.addEventListener(PWA_UPDATE_TEST_EVENT, openTest);
    return () => window.removeEventListener(PWA_UPDATE_TEST_EVENT, openTest);
  }, []);

  const open = needRefresh || testMode;

  const handleClose = (value: boolean) => {
    if (!value) {
      setTestMode(false);
      setNeedRefresh(false);
    }
  };

  const handleUpdate = async () => {
    setUpdating(true);

    if (testMode && !needRefresh) {
      // Mode test : on simule puis on ferme.
      setTimeout(() => {
        setUpdating(false);
        setTestMode(false);
      }, 1500);
      return;
    }

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
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="mx-auto max-w-md rounded-t-3xl">
        <div className="px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-4 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-hk-50">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-hk-600 shadow-lg shadow-hk-600/30">
              <PartyPopper className="h-7 w-7 text-white" />
            </span>
          </div>

          <h2 className="mt-5 text-xl font-bold text-slate-900">
            Du nouveau dans votre app !
          </h2>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
            Une nouvelle version est disponible avec les dernières améliorations.
            La mise à jour ne prend que quelques secondes.
          </p>

          <button
            onClick={handleUpdate}
            disabled={updating}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-hk-600 py-4 font-semibold text-white shadow-md transition-transform active:scale-[0.98] disabled:opacity-70"
          >
            <RefreshCw className={updating ? "h-5 w-5 animate-spin" : "h-5 w-5"} />
            {updating ? "Mise à jour en cours…" : "Mettre à jour"}
          </button>
          <button
            onClick={() => handleClose(false)}
            disabled={updating}
            className="mt-3 w-full py-2 text-sm font-semibold text-slate-400"
          >
            Plus tard
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default PwaUpdatePrompt;
