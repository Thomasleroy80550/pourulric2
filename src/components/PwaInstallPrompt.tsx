"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Share, PlusSquare } from "lucide-react";
import { useSession } from "@/components/SessionContextProvider";
import {
  isStandalone,
  isMobile,
  getPlatform,
  reportPwaStatus,
  reportPwaInstalled,
} from "@/lib/pwa-api";

const DISMISS_KEY = "pwa-install-prompt-dismissed-at";
const DISMISS_DAYS = 7;

const wasRecentlyDismissed = (): boolean => {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (!dismissedAt) return false;
  return Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
};

const PwaInstallPrompt: React.FC = () => {
  const { session } = useSession();
  const [visible, setVisible] = useState(false);
  const deferredPromptRef = useRef<any>(null);
  const platform = getPlatform();

  // Enregistre le statut PWA à la connexion + écoute l'installation
  useEffect(() => {
    if (!session) return;

    reportPwaStatus().catch(() => {});

    const onInstalled = () => {
      reportPwaInstalled().catch(() => {});
      setVisible(false);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, [session]);

  // Capture l'événement d'installation (Android/Chrome)
  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  // Affiche le popup à la connexion, sur mobile uniquement
  useEffect(() => {
    if (!session) {
      setVisible(false);
      return;
    }
    if (!isMobile() || isStandalone() || wasRecentlyDismissed()) return;

    const timer = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(timer);
  }, [session]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const handleInstall = async () => {
    const deferredPrompt = deferredPromptRef.current;
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPromptRef.current = null;
    if (outcome === "accepted") {
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 z-[100] md:hidden">
      <div className="rounded-xl border bg-background shadow-lg p-4 flex items-start gap-3">
        <img
          src="/icons/pwa-icon.png"
          alt="Hello Keys"
          className="h-12 w-12 rounded-xl border shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Installez l'application Hello Keys</p>
          {platform === "ios" ? (
            <p className="text-xs text-muted-foreground mt-1">
              Appuyez sur <Share className="h-3.5 w-3.5 inline align-text-bottom" />{" "}
              <strong>Partager</strong> puis{" "}
              <PlusSquare className="h-3.5 w-3.5 inline align-text-bottom" />{" "}
              <strong>« Sur l'écran d'accueil »</strong> pour l'installer et recevoir
              les notifications.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Accès rapide depuis votre écran d'accueil et notifications push.
            </p>
          )}
          {platform !== "ios" && (
            <Button size="sm" className="mt-2" onClick={handleInstall} disabled={!deferredPromptRef.current}>
              <Download className="h-4 w-4 mr-2" />
              Installer
            </Button>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="Fermer"
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default PwaInstallPrompt;
