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

  // verts
  if (asStr.includes("vert") || asStr.includes("green") || raw === 1 || asStr === "1" || asStr === "g" || asStr === "ok") {
    return { levelName: "green", variant: "success" };
  }
  // orange / jaune
  if (asStr.includes("orange") || asStr.includes("yellow") || raw === 2 || asStr === "2" || asStr === "y") {
    return { levelName: "orange", variant: "warning" };
  }
  // rouge (incl. niveau 3/4)
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

  const todayISO = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const found = array.find((it: any) => {
    const dateStr = getDateString(it);
    return dateStr && dateStr.startsWith(todayISO);
  });

  return found ?? array[0];
}

const EcowattBadge: React.FC = () => {
  const { data, loading, error, refresh } = useEcowatt();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
        <div className="h-4 w-40 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <button
        onClick={refresh}
        className={cn(
          "inline-flex items-center gap-2 text-xs md:text-sm rounded-md px-3 py-1.5 border",
          "border-border text-foreground hover:bg-muted transition"
        )}
        title="Réessayer de charger les signaux Ecowatt"
      >
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        Charger Ecowatt
      </button>
    );
  }

  const item = pickTodaySignal(data);
  if (!item) {
    return null;
  }

  const { levelName, variant } = normalizeLevel(item);
  const dateStr = getDateString(item);
  let dateLabel = "Aujourd'hui";
  try {
    if (dateStr) {
      const parsed = parseISO(dateStr);
      dateLabel = format(parsed, "EEEE d MMMM", { locale: fr });
    }
  } catch {
    // ignore parsing error, keep default
  }

  const message = getMessage(item);

  return (
    <Card className="flex items-center gap-3 px-3 py-2">
      <Badge variant={variant} className="uppercase" title={levelName === "green" ? "Prédiction du réseau électrique" : undefined}>
        {levelName === "green" ? "PowerSense Predict" : levelName === "orange" ? "Orange" : levelName === "red" ? "Rouge" : "N/A"}
      </Badge>
      <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
        <CalendarDays className="h-4 w-4" />
        <span>{dateLabel}</span>
      </div>
      <span className="text-xs md:text-sm text-foreground">{message}</span>
    </Card>
  );
};

export default EcowattBadge;