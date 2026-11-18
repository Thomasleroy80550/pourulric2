import { useEffect, useState } from "react";
import { useSession } from "@/components/SessionContextProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChannelApiError, ChannelProperty, channelPropertyName, getMyChannelProperties } from "@/lib/owner-channel-api";

export default function OwnerChannelProperties() {
  const { session, profile } = useSession();
  const [properties, setProperties] = useState<ChannelProperty[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);

  useEffect(() => {
    setProperties([]); setCursor(null); setLoaded(false); setError("");
  }, [session?.user.id]);
  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setTimeout(() => setRetryAt(0), Math.max(0, retryAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [retryAt]);

  const load = async (reset: boolean) => {
    setBusy(true); setError("");
    if (reset) { setProperties([]); setLoaded(false); }
    try {
      const data = await getMyChannelProperties(reset ? null : cursor);
      setProperties(previous => {
        const merged = new Map((reset ? [] : previous).map(p => [`${p.id}:${p.agency_id}:${p.environment}`, p]));
        data.properties.forEach(p => merged.set(`${p.id}:${p.agency_id}:${p.environment}`, p));
        return Array.from(merged.values());
      });
      setCursor(data.next_cursor); setLoaded(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Impossible de charger vos logements.");
      if (error instanceof ChannelApiError && error.retryAfter) setRetryAt(Date.now() + error.retryAfter * 1000);
    } finally { setBusy(false); }
  };

  if (!session || profile?.role !== "user") return null;
  return <Card>
    <CardHeader>
      <CardTitle>Mes logements — nouveau channel</CardTitle>
      <CardDescription>Seuls les logements attribués à votre profil par un administrateur sont affichés. Krossbooking reste actif pour les réservations et les tarifs.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="button" variant="outline" disabled={busy || !!retryAt} onClick={() => load(true)}>{busy ? "Chargement…" : loaded ? "Actualiser mes logements" : "Afficher mes logements"}</Button>
      <div className="grid gap-3 sm:grid-cols-2">
        {properties.map(property => <div key={`${property.id}:${property.agency_id}:${property.environment}`} className="rounded-lg border p-4 text-left">
          <h3 className="break-all font-medium">{channelPropertyName(property)}</h3>
          <p className="mt-1 break-all text-xs text-muted-foreground">{property.id}</p>
          <Badge className="mt-2" variant="secondary">{property.environment}</Badge>
        </div>)}
      </div>
      {loaded && properties.length === 0 && <p className="text-sm text-muted-foreground">Aucun logement accessible sur cette page. Pour toute attribution, contactez votre gestionnaire.</p>}
      {loaded && cursor && <Button type="button" variant="outline" disabled={busy || !!retryAt} onClick={() => load(false)}>Afficher les logements suivants</Button>}
    </CardContent>
  </Card>;
}
