"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEcowatt } from "@/hooks/use-ecowatt";
import { CalendarDays, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

type LevelVariant = "success" | "warning" | "destructive" | "secondary";

function normalizeLevel(item: any): { levelName: "green" | "orange" | "red" | "unknown"; variant: LevelVariant } {
  const candidates = [
    item?.value,
    item?.level,
    item?.signal_level,
    item?.dvalue,
    item?.day_value,
    item?.niveau,
    item?.color,
    item?.couleur,
    item?.status,
    item?.detail?.value,
    item?.detail?.level,
    item?.detail?.color,
  ];
  const raw: any = candidates.find((v) => v !== undefined && v !== null) ?? "";
  const asStr = String(raw).toLowerCase();

  if (asStr.includes("vert") || asStr.includes("green") || raw === 1 || asStr === "1" || asStr === "g" || asStr === "ok") {
    return { levelName: "green", variant: "success" };
  }
  if (asStr.includes("orange") || asStr.includes("yellow") || raw === 2 || asStr === "2" || asStr === "y") {
    return { levelName: "orange", variant: "warning" };
  }
  if (asStr.includes("rouge") || asStr.includes("red") || raw === 3 || asStr === "3" || raw === 4 || asStr === "4" || asStr === "r") {
    return { levelName: "red", variant: "destructive" };
  }

  // Par défaut: pas d'alerte => vert (PowerSense Predict)
  return { levelName: "green", variant: "success" };
}

function getDateString(item: any): string | null {
  const d = item?.date ?? item?.jour ?? item?.day ?? item?.start_date ?? item?.startDate ?? null;
  if (typeof d === "string") return d;
  return null;
}

function getMessage(item: any): string {
  return (
    item?.message ??
    item?.message_detail ??
    item?.short_message ??
    item?.description ??
    item?.detail?.message ??
    "Aucun message."
  );
}

function pickTodaySignal(data: any): any | null {
  const array =
    Array.isArray(data) ? data :
    (Array.isArray(data?.signals) ? data.signals : null);

  if (!array || array.length === 0) return null;

  const todayISO = new Date().toISOString().slice(0, 10);
  const found = array.find((it: any) => {
    const dateStr = getDateString(it);
    return dateStr && dateStr.startsWith(todayISO);
  });

  return found ?? array[0];
}

// NEW: styles par niveau pour un rendu plus élégant
function getLevelStyles(level: "green" | "orange" | "red" | "unknown") {
  if (level === "orange") {
    return {
      card: "border-amber-300 bg-gradient-to-r from-amber-100 to-amber-50 dark:from-amber-900/20 dark:to-amber-900/10",
      dot: "bg-amber-500 ring-amber-300/50",
      title: "text-amber-800 dark:text-amber-200",
    };
  }
  if (level === "red") {
    return {
      card: "border-red-300 bg-gradient-to-r from-red-100 to-rose-50 dark:from-red-900/20 dark:to-rose-900/10",
      dot: "bg-red-600 ring-red-300/50",
      title: "text-red-800 dark:text-red-200",
    };
  }
  // default green
  return {
    card: "border-emerald-300 bg-gradient-to-r from-emerald-100 to-emerald-50 dark:from-emerald-900/20 dark:to-emerald-900/10",
    dot: "bg-emerald-500 ring-emerald-300/50",
    title: "text-emerald-800 dark:text-emerald-200",
  };
}

const EcowattBadge: React.FC = () => {
  const { data, loading, error, refresh } = useEcowatt();

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-9 w-full max-w-md rounded-xl bg-muted/60 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <button
        onClick={refresh}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl px-3 py-2 border",
          "border-border text-foreground hover:bg-muted transition"
        )}
        title="Réessayer de charger les signaux Ecowatt"
      >
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <span className="text-sm">Données Ecowatt indisponibles — Réessayer</span>
      </button>
    );
  }

  const item = pickTodaySignal(data);
  if (!item) return null;

  const { levelName, variant } = normalizeLevel(item);
  const dateStr = getDateString(item);
  let dateLabel = "Aujourd'hui";
  try {
    if (dateStr) {
      const parsed = parseISO(dateStr);
      dateLabel = format(parsed, "EEEE d MMMM", { locale: fr });
    }
  } catch {
    // ignore
  }

  const message = getMessage(item);
  const styles = getLevelStyles(levelName);

  return (
    <Card className={cn(
      "flex w-full max-w-3xl items-center gap-3 px-3 py-2 rounded-xl shadow-sm border",
      styles.card
    )}>
      {/* Pastille de statut */}
      <span className={cn("h-2.5 w-2.5 rounded-full ring-4", styles.dot)} />

      {/* Titre + date */}
      <div className="flex items-center gap-2">
        <Badge
          // on garde variant pour le contraste, mais on peaufine via le cadre global
          variant={variant}
          className={cn("uppercase tracking-wide px-2 py-0.5 text-[11px]")}
          title={levelName === "green" ? "Prédiction du réseau électrique" : undefined}
        >
          {levelName === "green" ? "PowerSense Predict" : levelName === "orange" ? "Niveau Orange" : "Niveau Rouge"}
        </Badge>
        <div className={cn("flex items-center gap-1 text-xs md:text-sm", styles.title)}>
          <CalendarDays className="h-4 w-4" />
          <span className="capitalize">{dateLabel}</span>
        </div>
      </div>

      {/* Message */}
      <div className="ml-2 text-xs md:text-sm text-foreground/90 line-clamp-1">
        {message}
      </div>
    </Card>
  );
};

export default EcowattBadge;