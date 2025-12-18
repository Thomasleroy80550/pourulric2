"use client";

import React from "react";
import { Loader2 } from "lucide-react";

type LoadingOverlayProps = {
  message?: string;
};

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = "Chargement..." }) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center"
      aria-live="polite"
      role="status"
    >
      <div className="rounded-2xl bg-white/90 shadow-lg border border-gray-200 px-6 py-5 flex items-center gap-3">
        <Loader2 className="h-6 w-6 text-[#175e82] animate-spin" />
        <span className="text-sm font-medium text-[#0A2540]">{message}</span>
      </div>
    </div>
  );
};

export default LoadingOverlay;