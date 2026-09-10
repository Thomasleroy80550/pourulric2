"use client";

import React, { useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRCodeCanvas } from "qrcode.react";
import { QrCode, Download, Copy } from "lucide-react";
import { toast } from "sonner";

const PwaInstallQrCard: React.FC = () => {
  const [baseUrl, setBaseUrl] = useState(window.location.origin);
  const qrWrapperRef = useRef<HTMLDivElement>(null);

  const installUrl = `${baseUrl.replace(/\/$/, "")}/installer`;

  const downloadQr = () => {
    const canvas = qrWrapperRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "qr-installation-hellokeys.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("QR code téléchargé.");
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(installUrl);
    toast.success("Lien d'installation copié.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-blue-600" />
          QR code d'installation de l'application
        </CardTitle>
        <CardDescription>
          À scanner avec un téléphone : ouvre la page d'installation où
          l'application s'installe en un tap (Android) ou avec un guide (iPhone).
          Imprimez-le ou partagez-le à vos clients.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col md:flex-row items-center gap-6">
        <div ref={qrWrapperRef} className="rounded-xl border p-3 bg-white shrink-0">
          <QRCodeCanvas value={installUrl} size={200} includeMargin />
        </div>
        <div className="flex-1 w-full space-y-3">
          <div className="space-y-1">
            <Label>URL du site (production)</Label>
            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
            <p className="text-xs text-muted-foreground break-all">
              Lien encodé : <strong>{installUrl}</strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={downloadQr}>
              <Download className="h-4 w-4 mr-2" />
              Télécharger le QR (PNG)
            </Button>
            <Button variant="outline" onClick={copyLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copier le lien
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PwaInstallQrCard;
