import React from "react";
import { Home } from "lucide-react";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-cyan-100 text-cyan-700",
];

export function guestInitials(name: string): string {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0].charAt(0);
  const second = words.length > 1 ? words[words.length - 1].charAt(0) : "";
  return (first + second).toUpperCase();
}

/** Avatar voyageur : initiales sur fond coloré (déterministe selon le nom). */
export const GuestAvatar: React.FC<{
  name: string;
  className?: string;
  light?: boolean;
}> = ({ name, className, light }) => {
  const colorIndex =
    Math.abs(
      (name || "").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
    ) % AVATAR_COLORS.length;

  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-xl font-bold",
        light ? "bg-white/20 text-white" : AVATAR_COLORS[colorIndex],
        className
      )}
    >
      {guestInitials(name)}
    </span>
  );
};

/** Tuile logement : dégradé bleu avec icône maison. */
export const PropertyTile: React.FC<{
  className?: string;
  iconClassName?: string;
}> = ({ className, iconClassName }) => (
  <span
    className={cn(
      "flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700",
      className
    )}
  >
    <Home className={cn("text-white/90", iconClassName)} />
  </span>
);
