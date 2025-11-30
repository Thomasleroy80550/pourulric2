"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEcowatt } from "@/hooks/use-ecowatt";
import { CalendarDays, RefreshCw, Info } from "lucide-react";
import { format, parseISO, isAfter, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

type LevelVariant = "success" | "warning" | "destructive" | "secondary";

function normalizeLevel(item: any): { levelName: "green" | "orange" | "red"; variant: LevelVariant } {
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

  // Par défaut: pas d'alerte => vert
  return { levelName: "green", variant: "success" };
}

function getDateString(item: any): string | null {
  const d = item?.date ?? item?.jour ?? item?.day ?? item?.start_date ?? item?.startDate ?? null;
  return typeof d === "string" ? d : null;
}

function getMessage(item: any): string {
  return (
    item?.message ??
    item?.message_detail ??
    item?.short_message ??
    item?.description ??
    item?.detail?.message ??
    (normalizeLevel(item).levelName === "green"
      ? "Aucune alerte — fonctionnement normal du réseau."
      : "Information réseau disponible.")
  );
}

function extractSignals(data: any): any[] {
  const arr = Array.isArray(data) ? data : (Array.isArray(data?.signals) ? data.signals : []);
  // Trier par date croissante et garder à partir d'aujourd'hui
  const today = startOfDay(new Date());
  const withDates = arr
    .map((it: any) => ({ it, d: getDateString(it) }))
    .filter((x: any) => !!x.d);
  withDates.sort((a: any, b: any) => {
    try {
      return new Date(a.d!).getTime() - new Date(b.d!).getTime();
    } catch {
      return 0;
    }
  });
  const filtered = withDates.filter((x: any) => {
    try {
      const dt = startOfDay(parseISO(x.d!));
      return isAfter(dt, today) || dt.getTime() === today.getTime();
    } catch {
      return true;
    }
  });
  return filtered.map((x: any) => x.it);
}

function getLevelStyles(level: "green" | "orange" | "red") {
  if (level === "orange") {
    return {
      card: "border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/10 dark:to-amber-900/20",
      dot: "bg-amber-500 ring-amber-300/50",
      title: "text-amber-800 dark:text-amber-200",
    };
  }
  if (level === "red") {
    return {
      card: "border-rose-300 bg-gradient-to-br from-rose-50 to-red-100 dark:from-red-900/10 dark:to-rose-900/20",
      dot: "bg-red-600 ring-red-300/50",
      title: "text-red-800 dark:text-red-200",
    };
  }
  return {
    card: "border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/10 dark:to-emerald-900/20",
    dot: "bg-emerald-500 ring-emerald-300/50",
    title: "text-emerald-800 dark:text-emerald-200",
  };
}

const EcowattForecast: React.FC = () => {
  const { data, loading, error, refresh } = useEcowatt();

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Info className="h-4 w-4 text-yellow-600" />
          <span>Données Ecowatt indisponibles pour le moment.</span>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Réessayer
        </Button>
      </Card>
    );
  }

  const signals = extractSignals(data).slice(0, 5);
  if (signals.length === 0) return null;

  const today = signals[0];
  const { levelName: todayLevel, variant: todayVariant } = normalizeLevel(today);
  const todayStyles = getLevelStyles(todayLevel);
  const todayDateStr = getDateString(today);
  let todayLabel = "Aujourd'hui";
  try {
    if (todayDateStr) {
      todayLabel = format(parseISO(todayDateStr), "EEEE d MMMM", { locale: fr });
    }
  } catch {
    // ignore
  }

  return (
    <div className="space-y-3">
      {/* Bandeau principal explicatif */}
      <Card className={cn("p-3 rounded-2xl border shadow-sm", todayStyles.card)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={cn("h-3 w-3 rounded-full ring-4", todayStyles.dot)} />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <Badge
                  variant={todayVariant}
                  className="uppercase tracking-wide px-2 py-0.5 text-[11px]"
                  title={todayLevel === "green" ? "Prédiction du réseau électrique" : undefined}
                >
                  {todayLevel === "green" ? "PowerSense Predict" : todayLevel === "orange" ? "Niveau Orange" : "Niveau Rouge"}
                </Badge>
                <div className={cn("flex items-center gap-1 text-xs md:text-sm", todayStyles.title)}>
                  <CalendarDays className="h-4 w-4" />
                  <span className="capitalize">{todayLabel}</span>
                </div>
              </div>
              <div className="text-sm mt-1 text-foreground/90">
                {todayLevel === "green"
                  ? "Réseau normal — aucune action requise."
                  : todayLevel === "orange"
                  ? "Réseau sous tension — limitez les usages énergivores aux heures de pointe."
                  : "Forte tension — évitez les usages énergivores et reportez si possible."}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={refresh} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Actualiser
          </Button>
        </div>
      </Card>

      {/* Légende et explications concises */}
      <div className="text-xs text-muted-foreground">
        PowerSense Predict: prévisions Ecowatt (RTE) — vert: normal, orange: tension, rouge: forte tension.
      </div>

      {/* Liste des 5 prochains jours (scroll horizontal sur mobile) */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {signals.map((it, idx) => {
          const { levelName, variant } = normalizeLevel(it);
          const styles = getLevelStyles(levelName);
          const dStr = getDateString(it);
          let label = "Jour";
          try {
            if (dStr) label = format(parseISO(dStr), "EEE d MMM", { locale: fr });
          } catch {
            // ignore
          }
          const msg = getMessage(it);

          return (
            <Card
              key={idx}
              className={cn(
                "min-w-[180px] p-3 rounded-xl border shadow-sm flex flex-col gap-2",
                styles.card
              )}
              title={msg}
            >
              <div className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full ring-4", styles.dot)} />
                <span className={cn("text-sm font-medium", styles.title)}>{label}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={variant} className="text-[11px] px-2 py-0.5 uppercase">
                  {levelName === "green" ? "PowerSense Predict" : levelName === "orange" ? "Niveau Orange" : "Niveau Rouge"}
                </Badge>
              </div>
              <div className="text-xs text-foreground/90 line-clamp-2">{msg}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default EcowattForecast;