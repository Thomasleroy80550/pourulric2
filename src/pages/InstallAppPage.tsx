"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Share, PlusSquare, CheckCircle2, Smartphone } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { isStandalone, getPlatform } from "@/lib/pwa-api";

const InstallAppPage: React.FC = () => {
  const [installed, setInstalled] = useState(isStandalone());
  const [canPrompt, setCanPrompt] = useState(false);
  const deferredPromptRef = useRef<any>(null);
  const platform = getPlatform();

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setCanPrompt(true);
    };
    const onInstalled = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    const deferredPrompt = deferredPromptRef.current;
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPromptRef.current = null;
    setCanPrompt(false);
    if (outcome === "accepted") setInstalled(true);
  };

  const installUrl = `${window.location.origin}/installer`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#255f85] to-[#1d4d6d] flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardContent className="p-6 sm:p-8 flex flex-col items-center text-center space-y-5">
          <img
            src="/icons/pwa-icon.png"
            alt="Hello Keys"
            className="h-20 w-20 rounded-2xl border shadow-md"
          />
          <div>
            <h1 className="text-2xl font-bold">Hello Keys</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Portail propriétaire — installez l'application sur votre appareil
              pour un accès rapide et les notifications push.
            </p>
          </div>

          {installed ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-4 w-full">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <p className="font-medium text-green-800 dark:text-green-200">
                L'application est installée !
              </p>
              <Button className="mt-1 w-full" onClick={() => (window.location.href = "/")}>
                Ouvrir l'application
              </Button>
            </div>
          ) : platform === "ios" ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 p-4 w-full text-left space-y-2">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Installation sur iPhone / iPad
              </p>
              <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1.5 list-decimal pl-5">
                <li>
                  Appuyez sur le bouton <strong>Partager</strong>{" "}
                  <Share className="h-4 w-4 inline align-text-bottom" /> en bas de Safari
                </li>
                <li>
                  Choisissez <strong>« Sur l'écran d'accueil »</strong>{" "}
                  <PlusSquare className="h-4 w-4 inline align-text-bottom" />
                </li>
                <li>
                  Appuyez sur <strong>Ajouter</strong>, puis ouvrez l'app depuis votre
                  écran d'accueil
                </li>
              </ol>
            </div>
          ) : platform === "android" ? (
            <div className="w-full space-y-3">
              <Button size="lg" className="w-full" onClick={handleInstall} disabled={!canPrompt}>
                <Download className="h-5 w-5 mr-2" />
                Installer l'application
              </Button>
              {!canPrompt && (
                <p className="text-xs text-muted-foreground">
                  Si le bouton reste grisé : ouvrez le menu de Chrome (⋮) puis
                  choisissez <strong>« Installer l'application »</strong>.
                </p>
              )}
            </div>
          ) : (
            <div className="w-full space-y-3 flex flex-col items-center">
              <p className="text-sm text-muted-foreground">
                Scannez ce QR code avec votre téléphone pour installer l'application :
              </p>
              <div className="rounded-xl border p-3 bg-white">
                <QRCodeCanvas value={installUrl} size={180} includeMargin />
              </div>
              {canPrompt && (
                <Button variant="outline" onClick={handleInstall} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Installer sur cet ordinateur
                </Button>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Gratuit · Aucun téléchargement sur les stores · Mises à jour automatiques
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstallAppPage;
