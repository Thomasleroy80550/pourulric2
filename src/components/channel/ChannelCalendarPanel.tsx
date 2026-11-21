import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChannelApiError } from "@/lib/owner-channel-api";
import { ChannelCalendar, getChannelCalendar } from "@/lib/channel-features-api";

const availabilityLabels = {
  available: "Disponible",
  booked: "Réservé",
  blocked: "Bloqué",
  unknown: "Inconnu",
} as const;

function todayIso() {
  return format(new Date(), "yyyy-MM-dd");
}

export default function ChannelCalendarPanel({ assignmentId, refreshKey = 0 }: { assignmentId: string; refreshKey?: number }) {
  const [from, setFrom] = useState(todayIso);
  const [to, setTo] = useState(() => format(addDays(new Date(), 31), "yyyy-MM-dd"));
  const [calendar, setCalendar] = useState<ChannelCalendar | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const validPeriod = from < to;

  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setTimeout(() => setRetryAt(0), Math.max(0, retryAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [retryAt]);

  const load = useCallback(async () => {
    if (!assignmentId || !validPeriod) return;
    setLoading(true);
    setError("");
    try {
      setCalendar(await getChannelCalendar(assignmentId, from, to));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Calendrier indisponible.");
      if (loadError instanceof ChannelApiError && loadError.retryAfter) setRetryAt(Date.now() + loadError.retryAfter * 1000);
    } finally {
      setLoading(false);
    }
  }, [assignmentId, from, to, validPeriod, refreshKey]);

  useEffect(() => {
    setCalendar(null);
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const days = calendar?.days ?? [];
    return {
      available: days.filter(day => day.availability === "available").length,
      booked: days.filter(day => day.availability === "booked").length,
      blocked: days.filter(day => day.availability === "blocked").length,
      unknown: days.filter(day => day.availability === "unknown").length,
    };
  }, [calendar]);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg"><CalendarDays className="h-5 w-5" /> Prix et disponibilités</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Lecture NextPax en direct, sans modification. Une journée « inconnue » n’est jamais disponible.</p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading || !!retryAt || !validPeriod}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Actualiser
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="channel-calendar-from">Début inclus</Label><Input id="channel-calendar-from" type="date" value={from} max={to} onChange={event => setFrom(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="channel-calendar-to">Fin exclusive</Label><Input id="channel-calendar-to" type="date" value={to} min={from} onChange={event => setTo(event.target.value)} /></div>
        </div>
        {!validPeriod && <Alert variant="destructive"><AlertDescription>La fin exclusive doit être après le début.</AlertDescription></Alert>}
        {error && <Alert variant="destructive"><AlertDescription>{error}{retryAt ? " Nouvelle tentative possible dans environ 60 secondes." : ""}</AlertDescription></Alert>}
        {calendar && (
          <>
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="secondary">{counts.available} disponible(s)</Badge>
              <Badge variant="secondary">{counts.booked} réservée(s)</Badge>
              <Badge variant="secondary">{counts.blocked} bloquée(s)</Badge>
              {counts.unknown > 0 && <Badge variant="outline">{counts.unknown} inconnue(s)</Badge>}
            </div>
            <Alert>
              <AlertDescription>
                Prix par nuit en {calendar.currency}. Un prix à 1 correspond au prix technique de base et est affiché comme non renseigné. Sources : {calendar.prices_source ?? "Cadence"} · {calendar.availability_source ?? "disponibilité"}. Lecture : {new Date(calendar.fetched_at).toLocaleString("fr-FR")}.
              </AlertDescription>
            </Alert>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {calendar.days.map(day => {
                const unknownPrice = day.price === null || day.price === 1;
                return (
                  <div key={day.date} className="rounded-lg border bg-background p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium capitalize">{format(parseISO(day.date), "EEE d MMM", { locale: fr })}</p>
                        <p className="text-xs text-muted-foreground">{day.date}</p>
                      </div>
                      <Badge variant={day.availability === "available" ? "default" : day.availability === "unknown" ? "outline" : "secondary"}>
                        {availabilityLabels[day.availability]}
                      </Badge>
                    </div>
                    <p className="mt-3 text-xl font-semibold">{unknownPrice ? "Non renseigné" : `${day.price.toFixed(2)} ${calendar.currency}`}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Quantité {day.quantity ?? "?"} · séjour {day.min_stay ?? "?"}–{day.max_stay ?? "∞"} nuit(s)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Arrivée {day.arrivals_allowed === null ? "?" : day.arrivals_allowed ? "oui" : "non"} · départ {day.departures_allowed === null ? "?" : day.departures_allowed ? "oui" : "non"}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {loading && !calendar && <p className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement du calendrier…</p>}
      </CardContent>
    </Card>
  );
}
