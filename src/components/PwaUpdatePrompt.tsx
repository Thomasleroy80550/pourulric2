"use client";

import React, { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
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

  const handleDismiss = () => {
    if (phase !== "idle") return;
    setTestMode(false);
    setNeedRefresh(false);
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
      }, 3800);
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

  if (!open) return null;

  // Écran pleine page pendant l'installation / la confirmation
  if (phase !== "idle") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white animate-in fade-in duration-300">
        {phase === "updating" ? (
          <div className="flex flex-col items-center px-8 text-center animate-in fade-in zoom-in-95 duration-300">
            {/* Icône avec ondes façon suivi de commande Uber */}
            <div className="relative flex h-36 w-36 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-hk-200/60 [animation-duration:1.6s]" />
              <span className="absolute inset-4 animate-ping rounded-full bg-hk-300/50 [animation-duration:1.6s] [animation-delay:0.4s]" />
              <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-hk-600 shadow-xl shadow-hk-600/40">
                <RefreshCw className="h-10 w-10 animate-spin text-white [animation-duration:1.4s]" />
              </span>
            </div>

            <h2 className="mt-10 text-2xl font-bold text-slate-900">
              Installation en cours…
            </h2>
            <p className="mt-2 text-base text-slate-500">
              On prépare la nouvelle version pour vous 🚀
            </p>

            {/* Barre de progression */}
            <div className="mt-8 h-2 w-64 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-hk-600 transition-all duration-[2200ms] ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-5 flex items-center justify-center gap-2">
              <span className="h-2 w-2 animate-bounce rounded-full bg-hk-400 [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-hk-500 [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-hk-600 [animation-delay:300ms]" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center px-8 text-center animate-in fade-in zoom-in-75 duration-500">
            <div className="flex h-36 w-36 items-center justify-center rounded-full bg-emerald-50">
              <span className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 shadow-xl shadow-emerald-500/40">
                <Check className="h-12 w-12 text-white" strokeWidth={3} />
              </span>
            </div>
            <h2 className="mt-10 text-2xl font-bold text-slate-900">
              C'est tout bon !
            </h2>
            <p className="mt-2 text-base text-slate-500">
              Votre app est à jour, bonne navigation ✨
            </p>
          </div>
        )}
      </div>
    );
  }

  // Popup centré (proposition de mise à jour)
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={handleDismiss}
      />
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl animate-in fade-in zoom-in-90 duration-300">
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
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-hk-600 py-4 font-semibold text-white shadow-md transition-transform active:scale-[0.98]"
        >
          <RefreshCw className="h-5 w-5" />
          Mettre à jour
        </button>
        <button
          onClick={handleDismiss}
          className="mt-3 w-full py-2 text-sm font-semibold text-slate-400"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
};

export default PwaUpdatePrompt;
