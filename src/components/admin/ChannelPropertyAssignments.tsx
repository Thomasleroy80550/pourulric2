import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  assignChannelProperty, ChannelApiError, ChannelAssignment, ChannelProperty, channelPropertyName,
  getChannelAssignments, getChannelCatalog, linkChannelAssignmentRoom, unassignChannelProperty,
} from "@/lib/owner-channel-api";

export default function ChannelPropertyAssignments({ clientProfileId }: { clientProfileId: string }) {
  const [assignments, setAssignments] = useState<ChannelAssignment[]>([]);
  const [properties, setProperties] = useState<ChannelProperty[]>([]);
  const [rooms, setRooms] = useState<{ id: string; room_name: string }[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [context, setContext] = useState<{ agency?: string; environment?: string }>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    getChannelAssignments(clientProfileId).then(data => {
      if (active) setAssignments(data.assignments);
    }).catch(error => { if (active) setError(error.message); });
    supabase.from("user_rooms").select("id,room_name").eq("user_id", clientProfileId).order("room_name")
      .then(({ data, error }) => {
        if (active) {
          if (error) setError(error.message);
          else setRooms(data ?? []);
        }
      });
    return () => { active = false; };
  }, [clientProfileId]);
  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setTimeout(() => setRetryAt(0), Math.max(0, retryAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [retryAt]);

  const fail = (error: unknown) => {
    setError(error instanceof Error ? error.message : "Erreur de connexion au channel.");
    if (error instanceof ChannelApiError && error.retryAfter) setRetryAt(Date.now() + error.retryAfter * 1000);
  };
  const loadCatalog = async (reset: boolean) => {
    setBusy(true); setError("");
    try {
      const data = await getChannelCatalog(reset ? null : cursor);
      // Avoid mixing pages if the configured key changes agency/environment.
      if (!reset && (context.agency !== data.agency_id || context.environment !== data.environment)) {
        throw new Error("La clé a changé d’environnement ou d’agence. Rechargez le catalogue.");
      }
      setProperties(previous => {
        const merged = new Map((reset ? [] : previous).map(p => [p.id, p]));
        data.properties.forEach(p => merged.set(p.id, p));
        return Array.from(merged.values());
      });
      setContext({ agency: data.agency_id, environment: data.environment });
      setCursor(data.next_cursor); setLoaded(true);
    } catch (error) { fail(error); } finally { setBusy(false); }
  };
  const assign = async (propertyId: string) => {
    setBusy(true); setError("");
    try {
      await assignChannelProperty(clientProfileId, propertyId);
      setAssignments((await getChannelAssignments(clientProfileId)).assignments);
      toast.success("Logement attribué au profil.");
    } catch (error) { fail(error); } finally { setBusy(false); }
  };
  const linkRoom = async (assignmentId: string, userRoomId: string) => {
    setBusy(true); setError("");
    try {
      await linkChannelAssignmentRoom(assignmentId, userRoomId === "none" ? null : userRoomId);
      setAssignments(previous => previous.map(link => link.id === assignmentId ? { ...link, user_room_id: userRoomId === "none" ? null : userRoomId } : link));
      toast.success(userRoomId === "none" ? "Lien local retiré." : "Logement local lié explicitement.");
    } catch (error) { fail(error); } finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    setBusy(true); setError("");
    try {
      await unassignChannelProperty(id);
      setAssignments(previous => previous.filter(a => a.id !== id));
      toast.success("Attribution retirée. Le logement n’a pas été supprimé du channel.");
    } catch (error) { fail(error); } finally { setBusy(false); }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Cadence — logements</CardTitle>
        <CardDescription>Attribution du profil puis lien explicite avec le logement local existant. Aucun rapprochement automatique par nom n’est utilisé pour les profils multi-logements.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button asChild variant="outline"><Link to="/admin/channel-onboarding">Onboarding et attributions en lot</Link></Button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="space-y-2">
          <h3 className="font-medium">Logements attribués ({assignments.length})</h3>
          {assignments.length === 0 && <p className="text-sm text-muted-foreground">Aucun logement du nouveau channel attribué.</p>}
          {assignments.map(link => (
            <div key={link.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
              <div className="min-w-0 flex-1 space-y-2">
                <p className="break-all text-sm">{channelPropertyName(properties.find(p => p.id === link.property_id) || { id: link.property_id })}</p>
                <p className="break-all text-xs text-muted-foreground">{link.property_id} · Agence {link.agency_id}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{link.environment}</Badge>
                  <Select value={link.user_room_id || "none"} disabled={busy} onValueChange={value => linkRoom(link.id, value)}>
                    <SelectTrigger className="w-72"><SelectValue placeholder="Choisir le logement local" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Lien local à compléter</SelectItem>
                      {rooms.map(room => <SelectItem key={room.id} value={room.id}>{room.room_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => remove(link.id)}>Retirer l’attribution</Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" disabled={busy || !!retryAt} onClick={() => loadCatalog(true)}>
          {busy ? "Chargement…" : loaded ? "Recharger le catalogue" : "Charger les logements du channel"}
        </Button>
        {loaded && <>
          <p className="break-all text-xs text-muted-foreground">Agence : {context.agency} · Environnement : {context.environment} · {properties.length} logement(s) chargé(s)</p>
          <Input aria-label="Rechercher un logement du channel" placeholder="Rechercher par nom ou UUID dans les logements chargés" value={search} onChange={event => setSearch(event.target.value)} />
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {properties.filter(p => `${channelPropertyName(p)} ${p.id}`.toLowerCase().includes(search.toLowerCase())).map(property => {
              const assigned = assignments.some(a => a.property_id === property.id && a.agency_id === context.agency && a.environment === context.environment);
              return <div key={property.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0"><p className="break-all text-sm font-medium">{channelPropertyName(property)}</p><p className="break-all text-xs text-muted-foreground">{property.id}</p></div>
                <Button type="button" size="sm" disabled={busy || !!retryAt || assigned} onClick={() => assign(property.id)}>{assigned ? "Attribué" : "Attribuer"}</Button>
              </div>;
            })}
            {properties.length === 0 && <p className="text-sm text-muted-foreground">Aucun logement dans cet environnement.</p>}
          </div>
          {cursor && <Button type="button" variant="outline" disabled={busy || !!retryAt} onClick={() => loadCatalog(false)}>Charger les 100 suivants</Button>}
          {!cursor && <p className="text-xs text-muted-foreground">Tous les logements accessibles à la clé ont été chargés.</p>}
        </>}
      </CardContent>
    </Card>
  );
}
