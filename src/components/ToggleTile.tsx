"use client";

import React from "react";
import { Check } from "lucide-react";

type ToggleTileProps = {
  label: string;
  checked: boolean;
  onToggle: () => void;
  Icon?: React.ComponentType<{ className?: string }>;
};

const ToggleTile: React.FC<ToggleTileProps> = ({ label, checked, onToggle, Icon }) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full rounded-lg border p-4 flex items-center justify-between transition-colors cursor-pointer ${
        checked ? "bg-primary/5 border-primary" : "border-input"
      } hover:bg-primary/5 hover:border-primary/60`}
    >
      <div className="flex items-center gap-3">
        {Icon ? (
          <Icon className={`h-5 w-5 ${checked ? "text-primary" : "text-muted-foreground"}`} />
        ) : null}
        <span className="text-sm font-medium">{label}</span>
      </div>

      {/* Indicateur visuel de l'état (pas un vrai input, donc aucune propagation d'événements) */}
      <span
        aria-hidden="true"
        className={`flex items-center justify-center h-5 w-5 rounded border ${
          checked ? "bg-primary border-primary text-white" : "border-muted-foreground/40"
        }`}
      >
        {checked ? <Check className="h-3.5 w-3.5" /> : null}
      </span>
    </button>
  );
};

export default ToggleTile;