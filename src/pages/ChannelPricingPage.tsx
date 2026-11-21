import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarDays, Euro, Loader2 } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useSession } from "@/components/SessionContextProvider";
import ChannelCalendarPanel from "@/components/channel/ChannelCalendarPanel";
import ChannelPricingPeriodsPanel from "@/components/channel/ChannelPricingPeriodsPanel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getReservationSources, type ReservationSource } from "@/lib/channel-reservations-api";

function sourceLabel(source: ReservationSource) {
  return source.property_name || source.user_rooms?.room_name || `Logement ${source.property_id.slice(0, 8)}`;
}

export default function ChannelPricingPage() {
  const { profile, session } = useSession();
  const [params] = useSearchParams();
  const initialAssignment = params.get("assignment") || "";
  const [sources, setSources] = useState<ReservationSource[]>([]);
  const [assignmentId, setAssignmentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);

  useEffect(() => {
    if (!session || !profile) return;
    if (profile.role !== "user" || !profile.can_manage_prices) {
      setSources([]);
      setAssignmentId("");
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    const load = async () => {
      try {
        const all: ReservationSource[] = [];
        let cursor: string | null = null;
        do {
          const page = await getReservationSources(cursor);
          if (!active) return;
          all.push(...page.sources);
          cursor = page.next_cursor;
        } while (cursor);
        if (!active) return;
        setSources(all);
        if (initialAssignment && !all.some(source => source.id === initialAssignment)) {
          setError("Ce logement Cadence n’est pas accessible à votre profil.");
        } else {
          setAssignmentId(initialAssignment || all[0]?.id || "");
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Impossible de charger vos logements Cadence.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [session?.user.id, profile?.role, profile?.can_manage_prices, initialAssignment]);

  const selectedSource = sources.find(source => source.id === assignmentId);

  if (profile && profile.role === "user" && !profile.can_manage_prices) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-3xl py-8">
          <Alert variant="destructive">
            <AlertTitle>Accès non autorisé</AlertTitle>
            <AlertDescription>Vous n’avez pas la permission de gérer les prix. Contactez un administrateur pour activer cet accès.</AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="w-full max-w-[1600px] space-y-5 px-2 py-6 sm:px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge variant="secondary" className="mb-2">Cadence</Badge>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              <Euro className="h-6 w-6 text-emerald-600" />
              Prix & restrictions
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gérez les périodes tarifaires propriétaire dans une page planning dédiée.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/calendar"><CalendarDays className="mr-2 h-4 w-4" /> Retour au calendrier</Link>
          </Button>
        </div>

        <Card>
          <CardContent className="space-y-3 p-4">
            <Label htmlFor="cadence-pricing-property">Logement Cadence</Label>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full max-w-md" />
                <p className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Vérification des logements attribués…</p>
              </div>
            ) : (
              <>
                <Select value={assignmentId} onValueChange={setAssignmentId} disabled={!sources.length}>
                  <SelectTrigger id="cadence-pricing-property" className="max-w-md">
                    <SelectValue placeholder="Choisir un logement lié" />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map(source => <SelectItem key={source.id} value={source.id}>{sourceLabel(source)}</SelectItem>)}
                  </SelectContent>
                </Select>
                {selectedSource && (
                  <p className="break-all text-xs text-muted-foreground">
                    Agence {selectedSource.agency_id} · environnement {selectedSource.environment} · logement {selectedSource.property_id}
                  </p>
                )}
                {!sources.length && (
                  <p className="text-sm text-muted-foreground">Aucun logement Cadence n’est attribué à votre profil.</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

        {selectedSource && (
          <>
            <ChannelCalendarPanel
              key={`calendar-${selectedSource.id}`}
              assignmentId={selectedSource.id}
              refreshKey={calendarRefreshKey}
            />
            <ChannelPricingPeriodsPanel
              key={`pricing-${selectedSource.id}`}
              assignmentId={selectedSource.id}
              onSaved={() => setCalendarRefreshKey(value => value + 1)}
            />
          </>
        )}
      </div>
    </MainLayout>
  );
}
