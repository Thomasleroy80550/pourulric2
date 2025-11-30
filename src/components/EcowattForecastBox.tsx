"use client";

import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEcowatt } from "@/hooks/use-ecowatt";
import { CalendarDays, RefreshCw, Info } from "lucide-react";
import { format, parseISO, isAfter, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

type LevelVariant = "success" | "warning" | "destructive";

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
    "Aucune information détaillée."
  );
}

function extractSignals(data: any): any[] {
  const arr = Array.isArray(data) ? data : (Array.isArray(data?.signals) ? data.signals : []);
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

function levelClasses(level: "green" | "orange" | "red") {
  if (level === "orange") {
    return {
      card: "border-amber-300 bg-amber-50 dark:bg-amber-900/10",
      dot: "bg-amber-500 ring-amber-300/50",
      title: "text-amber-800 dark:text-amber-200",
    };
  }
  if (level === "red") {
    return {
      card: "border-rose-300 bg-rose-50 dark:bg-rose-900/10",
      dot: "bg-red-600 ring-red-300/50",
      title: "text-red-800 dark:text-red-200",
    };
  }
  return {
    card: "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/10",
    dot: "bg-emerald-500 ring-emerald-300/50",
    title: "text-emerald-800 dark:text-emerald-200",
  };
}

const EcowattForecastBox: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { data, loading, error, refresh } = useEcowatt();

  const signals = useMemo(() => (data ? extractSignals(data).slice(0, 5) : []), [data]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2"
        >
          <CalendarDays className="h-4 w-4" />
          Prévision réseau Ecowatt (RTE)
        </Button>
        {open && (
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            className="flex items-center gap-2"
            title="Actualiser les prévisions"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        )}
      </div>

      {open && (
        <Card className="mt-3 p-3 rounded-xl border shadow-sm">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          ) : error || !data ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Info className="h-4 w-4 text-yellow-600" />
                <span>Données Ecowatt indisponibles pour le moment.</span>
              </div>
              <Button variant="outline" size="sm" onClick={refresh} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" /> Réessayer
              </Button>
            </div>
          ) : signals.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucune prévision disponible.</div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground mb-2">
                PowerSense Predict: prévisions Ecowatt (RTE) — vert: normal, orange: tension, rouge: forte tension.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {signals.map((it, idx) => {
                  const { levelName, variant } = normalizeLevel(it);
                  const styles = levelClasses(levelName);
                  const dStr = getDateString(it);
                  const label = (() => {
                    try {
                      if (dStr) return format(parseISO(dStr), "EEE d MMM", { locale: fr });
                    } catch {}
                    return "Jour";
                  })();
                  const msg = getMessage(it);

                  return (
                    <Card key={idx} className={cn("p-3 rounded-lg border", styles.card)} title={msg}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2.5 w-2.5 rounded-full ring-4", styles.dot)} />
                          <span className={cn("text-sm font-medium", styles.title)}>{label}</span>
                        </div>
                        <Badge variant={variant} className="text-[11px] px-2 py-0.5 uppercase">
                          {levelName === "green" ? "PowerSense Predict" : levelName === "orange" ? "Niveau Orange" : "Niveau Rouge"}
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs text-foreground/90 line-clamp-2">{msg}</div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default EcowattForecastBox;