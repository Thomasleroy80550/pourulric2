"use client";

import React, { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Check, PartyPopper, RefreshCw } from "lucide-react";

/** Événement custom permettant de tester visuellement le popup (admin). */
export const PWA_UPDATE_TEST_EVENT = "pwa-update-prompt-test";

type Phase = "idle" | "updating" | "done";

const PwaUpdatePrompt: React.FC = () => {
  const [testMode, setTestMode] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);

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
    const openTest = () => {
      setPhase("idle");
      setProgress(0);
      setTestMode(true);
    };
    window.addEventListener(PWA_UPDATE_TEST_EVENT, openTest);
    return () => window.removeEventListener(PWA_UPDATE_TEST_EVENT, openTest);
  }, []);

  const open = needRefresh || testMode;

  const handleClose = (value: boolean) => {
    if (!value && phase === "idle") {
      setTestMode(false);
      setNeedRefresh(false);
    }
  };

  const handleUpdate = async () => {
    setPhase("updating");
    // Lance la barre de progression (effet "préparation de la commande")
    requestAnimationFrame(() => setProgress(90));

    if (testMode && !needRefresh) {
      // Mode test : on simule l'installation puis la confirmation.
      setTimeout(() => {
        setProgress(100);
        setPhase("done");
      }, 2200);
      setTimeout(() => {
        setTestMode(false);
        setPhase("idle");
        setProgress(0);
      }, 3600);
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
    }, 3500);

    try {
      await updateServiceWorker(true);
    } finally {
      clearTimeout(fallbackReload);
      setProgress(100);
      setPhase("done");
      // Laisse le temps de voir la confirmation avant le rechargement.
      setTimeout(() => window.location.reload(), 900);
    }
  };

  return (
    <Drawer open={open} onOpenChange={handleClose} dismissible={phase === "idle"}>
      <DrawerContent className="mx-auto max-w-md rounded-t-3xl">
        <div className="px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-4 text-center">
          {phase === "idle" && (
            <div className="animate-in fade-in duration-300">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-hk-50">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-hk-600 shadow-lg shadow-hk-600/30">
                  <PartyPopper className="h-7 w-7 text-white" />
                </span>
              </div>

              <h2 className="mt-5 text-xl font-bold text-slate-900">
                Du nouveau dans votre app !
              </h2>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
                Une nouvelle version est disponible avec les dernières
                améliorations. La mise à jour ne prend que quelques secondes.
              </p>

              <button
                onClick={handleUpdate}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-hk-600 py-4 font-semibold text-white shadow-md transition-transform active:scale-[0.98]"
              >
                <RefreshCw className="h-5 w-5" />
                Mettre à jour
              </button>
              <button
                onClick={() => handleClose(false)}
                className="mt-3 w-full py-2 text-sm font-semibold text-slate-400"
              >
                Plus tard
              </button>
            </div>
          )}

          {phase === "updating" && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
              {/* Icône avec ondes façon suivi de commande Uber */}
              <div className="relative mx-auto mt-2 flex h-24 w-24 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-hk-200/60 [animation-duration:1.6s]" />
                <span className="absolute inset-2 animate-ping rounded-full bg-hk-300/50 [animation-duration:1.6s] [animation-delay:0.4s]" />
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-hk-600 shadow-lg shadow-hk-600/40">
                  <RefreshCw className="h-7 w-7 animate-spin text-white [animation-duration:1.4s]" />
                </span>
              </div>

              <h2 className="mt-6 text-lg font-bold text-slate-900">
                Installation en cours…
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                On prépare la nouvelle version pour vous 🚀
              </p>

              {/* Barre de progression */}
              <div className="mx-auto mt-5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-hk-600 transition-all duration-[2200ms] ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-hk-400 [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-hk-500 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-hk-600 [animation-delay:300ms]" />
              </div>
            </div>
          )}

          {phase === "done" && (
            <div className="animate-in fade-in zoom-in-75 duration-500">
              <div className="mx-auto mt-2 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/40">
                  <Check className="h-8 w-8 text-white" strokeWidth={3} />
                </span>
              </div>
              <h2 className="mt-6 text-lg font-bold text-slate-900">
                C'est tout bon !
              </h2>
              <p className="mt-1 pb-4 text-sm text-slate-500">
                Votre app est à jour, bonne navigation ✨
              </p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default PwaUpdatePrompt;
