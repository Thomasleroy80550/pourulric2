import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Building2, Loader2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import MainLayout from "@/components/MainLayout";
import { useSession } from "@/components/SessionContextProvider";
import ChannelBlocksPanel from "@/components/channel/ChannelBlocksPanel";
import ChannelCalendarPanel from "@/components/channel/ChannelCalendarPanel";
import ChannelCleaningPanel from "@/components/channel/ChannelCleaningPanel";
import ChannelReviewsPanel from "@/components/channel/ChannelReviewsPanel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getReservationSources, ReservationSource } from "@/lib/channel-reservations-api";

function sourceLabel(source: ReservationSource, showOwner: boolean) {
  const name = source.property_name || `Logement ${source.property_id.slice(0, 8)}`;
  if (!showOwner || !source.profiles) return name;
  const owner = [source.profiles.first_name, source.profiles.last_name].filter(Boolean).join(" ");
  return owner ? `${name} · ${owner}` : name;
}

export default function OwnerChannelPage() {
  const { profile, session } = useSession();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const adminPath = pathname.startsWith("/admin/");
  const isAdmin = profile?.role === "admin";
  const Layout = adminPath || isAdmin ? AdminLayout : MainLayout;
  const initialAssignment = params.get("assignment") || "";
  const [sources, setSources] = useState<ReservationSource[]>([]);
  const [assignmentId, setAssignmentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session || !profile || (adminPath && profile.role !== "admin")) return;
    let active = true;
    setLoading(true);
    setError("");
    setSources([]);
    setAssignmentId("");
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
        setSources(all);
        if (initialAssignment && !all.some(source => source.id === initialAssignment)) {
          setError("Ce logement n’est pas accessible à votre profil.");
        } else {
          setAssignmentId(initialAssignment || all[0]?.id || "");
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Impossible de charger les logements attribués.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [session?.user.id, profile?.role, adminPath, initialAssignment]);

  const source = sources.find(item => item.id === assignmentId);

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge variant="secondary">Cadence</Badge>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold"><Building2 className="h-6 w-6" /> Espace logement connecté</h1>
            <p className="mt-1 text-sm text-muted-foreground">Prix, disponibilités, séjours propriétaires, ménages et avis — limités aux logements déjà attribués.</p>
          </div>
          <Button asChild variant="outline">
            <Link to={isAdmin ? "/admin/channel-reservations" : "/channel-reservations"}>Réservations Cadence</Link>
          </Button>
        </div>

        <Alert>
          <AlertDescription>
            Les appels Cadence passent uniquement par le serveur Hello Keys. Chaque lecture ou écriture vérifie le triplet exact logement, agence et environnement de l’attribution. Aucun rapprochement par nom n’est utilisé.
          </AlertDescription>
        </Alert>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

        <Card>
          <CardContent className="space-y-3 p-4">
            <Label htmlFor="cadence-property">Logement attribué</Label>
            <Select value={assignmentId} onValueChange={setAssignmentId} disabled={loading || !sources.length}>
              <SelectTrigger id="cadence-property">
                <SelectValue placeholder={loading ? "Chargement des attributions…" : "Choisir un logement"} />
              </SelectTrigger>
              <SelectContent>
                {sources.map(item => <SelectItem key={item.id} value={item.id}>{sourceLabel(item, isAdmin)}</SelectItem>)}
              </SelectContent>
            </Select>
            {source && <p className="break-all text-xs text-muted-foreground">Agence {source.agency_id} · environnement {source.environment} · logement {source.property_id}</p>}
            {loading && <p className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Vérification des attributions…</p>}
            {!loading && !sources.length && <p className="text-sm text-muted-foreground">Aucun logement Cadence n’est attribué à ce profil. Le mapping existant doit être réalisé par un administrateur.</p>}
          </CardContent>
        </Card>

        {source && (
          <Tabs defaultValue="calendar" className="space-y-4">
            <TabsList className="grid h-auto w-full grid-cols-2 md:grid-cols-4">
              <TabsTrigger value="calendar">Prix & disponibilités</TabsTrigger>
              <TabsTrigger value="blocks">Séjours propriétaires</TabsTrigger>
              <TabsTrigger value="cleaning">Ménages</TabsTrigger>
              <TabsTrigger value="reviews">Avis</TabsTrigger>
            </TabsList>
            <TabsContent value="calendar"><ChannelCalendarPanel key={`calendar-${source.id}`} assignmentId={source.id} /></TabsContent>
            <TabsContent value="blocks"><ChannelBlocksPanel key={`blocks-${source.id}`} assignmentId={source.id} isAdmin={!!isAdmin} /></TabsContent>
            <TabsContent value="cleaning"><ChannelCleaningPanel key={`cleaning-${source.id}`} assignmentId={source.id} /></TabsContent>
            <TabsContent value="reviews"><ChannelReviewsPanel key={`reviews-${source.id}`} assignmentId={source.id} /></TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
}
