"use client";

import React from "react";
import { Send } from "lucide-react";

type EmailSendEffectProps = {
  show: boolean;
  label?: string;
};

const EmailSendEffect: React.FC<EmailSendEffectProps> = ({ show, label = "Envoi de votre demande..." }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
      <div className="relative flex flex-col items-center gap-3 px-6 py-4 rounded-xl border bg-card shadow-lg">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="relative w-56 h-24 overflow-visible">
          <style>
            {`
              @keyframes flyAcross {
                0% { transform: translate(0, 30%) rotate(-10deg); opacity: 0; }
                10% { opacity: 1; }
                50% { transform: translate(60%, -10%) rotate(0deg); opacity: 1; }
                100% { transform: translate(140%, -60%) rotate(10deg); opacity: 0; }
              }
            `}
          </style>
          <div
            className="absolute left-0 top-6"
            style={{
              animation: "flyAcross 1.2s ease-in-out infinite",
            }}
          >
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-3 border border-primary/20 shadow-sm">
                <Send className="h-6 w-6 text-primary" />
              </div>
              <div className="h-1 w-12 rounded-full bg-primary/30" />
              <div className="h-1 w-8 rounded-full bg-primary/20" />
              <div className="h-1 w-4 rounded-full bg-primary/10" />
            </div>
          </div>

          {/* Petites étincelles */}
          <div className="absolute left-6 top-12 w-2 h-2 rounded-full bg-primary/40 animate-ping" />
          <div className="absolute left-10 top-8 w-2 h-2 rounded-full bg-primary/30 animate-ping" />
          <div className="absolute left-14 top-14 w-2 h-2 rounded-full bg-primary/20 animate-ping" />
        </div>
        <div className="text-xs text-muted-foreground">Cela ne prend que quelques secondes…</div>
      </div>
    </div>
  );
};

export default EmailSendEffect;