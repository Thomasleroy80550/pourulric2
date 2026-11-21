import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Star, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChannelReviewImport,
  ChannelReviewsCache,
  advanceChannelReviewsSync,
  getChannelReviewsCache,
  startChannelReviewsSync,
} from "@/lib/channel-features-api";
import { ChannelApiError } from "@/lib/owner-channel-api";

function displayReviewDate(value: string | null) {
  if (!value) return "Date non fournie";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
}

export default function ChannelReviewsPanel({ assignmentId }: { assignmentId: string }) {
  const [cache, setCache] = useState<ChannelReviewsCache | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const mounted = useRef(true);
  const assignmentRef = useRef(assignmentId);
  assignmentRef.current = assignmentId;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setTimeout(() => setRetryAt(0), Math.max(0, retryAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [retryAt]);

  const loadCache = useCallback(async (offset = 0) => {
    if (!assignmentId) return;
    setLoading(true);
    setError("");
    try {
      const page = await getChannelReviewsCache(assignmentId, offset, 50);
      if (!mounted.current || assignmentRef.current !== assignmentId) return;
      setCache(previous => offset && previous
        ? { ...page, reviews: [...previous.reviews, ...page.reviews] }
        : page);
    } catch (loadError) {
      if (!mounted.current) return;
      setError(loadError instanceof Error ? loadError.message : "Avis importés indisponibles.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    setCache(null);
    setError("");
    void loadCache();
  }, [loadCache]);

  const runImport = async (restart: boolean) => {
    if (syncing || !assignmentId) return;
    setSyncing(true);
    setError("");
    try {
      let job: ChannelReviewImport = await startChannelReviewsSync(assignmentId, restart);
      while (mounted.current && assignmentRef.current === assignmentId && job.status === "syncing") {
        setCache(previous => previous ? { ...previous, import: job } : { reviews: [], total_count: 0, next_offset: null, import: job });
        job = await advanceChannelReviewsSync(job.job_id);
      }
      if (!mounted.current || assignmentRef.current !== assignmentId) return;
      setCache(previous => previous ? { ...previous, import: job } : { reviews: [], total_count: 0, next_offset: null, import: job });
      if (job.status === "completed") {
        toast.success(`Import terminé : ${job.pages} page(s), ${job.review_count} avis lus.`);
        await loadCache();
      }
    } catch (syncError) {
      if (!mounted.current) return;
      const message = syncError instanceof Error ? syncError.message : "Import des avis indisponible.";
      setError(message);
      if (syncError instanceof ChannelApiError && syncError.retryAfter) setRetryAt(Date.now() + syncError.retryAfter * 1000);
    } finally {
      if (mounted.current) setSyncing(false);
    }
  };

  const importInfo = cache?.import ?? null;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg"><Star className="h-5 w-5" /> Avis voyageurs Cadence</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Affichage depuis le cache local. L’import parcourt toutes les pages du gestionnaire, y compris celles sans avis pour ce logement.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void loadCache()} disabled={loading || syncing}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Recharger le cache
            </Button>
            <Button onClick={() => void runImport(false)} disabled={syncing || !!retryAt}>
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              {importInfo?.status === "syncing" ? "Reprendre l’import" : "Importer tous les avis"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Chaque page consomme une lecture NextPax et le quota commun. L’affichage ci-dessous ne relance jamais Cadence : seul le bouton d’import le fait. Les avis sont dédupliqués par `reviewId`.
          </AlertDescription>
        </Alert>
        {importInfo && (
          <div className="rounded-lg border p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={importInfo.status === "completed" ? "default" : importInfo.status === "failed" ? "destructive" : "secondary"}>
                {importInfo.status === "completed" ? "Import complet" : importInfo.status === "failed" ? "Import arrêté" : "Import en cours"}
              </Badge>
              <span>{importInfo.pages} page(s) · {importInfo.review_count} avis reçu(s) · prochain offset {importInfo.next_offset}</span>
            </div>
            {importInfo.fetched_at && <p className="mt-1 text-xs text-muted-foreground">Dernière page : {new Date(importInfo.fetched_at).toLocaleString("fr-FR")}</p>}
            {importInfo.last_error && <p className="mt-1 text-xs text-muted-foreground">{importInfo.last_error}</p>}
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Import ou lecture indisponible</AlertTitle>
            <AlertDescription>{error}{retryAt ? " La reprise sera possible après la fenêtre de quota." : ""}</AlertDescription>
          </Alert>
        )}
        {importInfo?.status === "syncing" && !syncing && (
          <Alert><AlertDescription>Un import est en pause. Cliquez sur « Reprendre l’import » : la chaîne de signatures reprend à la page suivante.</AlertDescription></Alert>
        )}
        {loading && !cache && <p className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement du cache…</p>}
        {cache && !cache.reviews.length && <p className="text-sm text-muted-foreground">Aucun avis importé pour ce logement. Lancez un import complet.</p>}
        <div className="space-y-3">
          {cache?.reviews.map(review => (
            <article key={review.review_id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {review.rating != null && (
                      <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3 fill-current" /> {review.rating}{review.rating_scale ? `/${review.rating_scale}` : ""}</Badge>
                    )}
                    {review.channel_id && <Badge variant="outline">{review.channel_id}</Badge>}
                  </div>
                  {review.title && <h3 className="mt-2 font-semibold">{review.title}</h3>}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{review.reviewer_name || "Voyageur"}</p>
                  <p>{displayReviewDate(review.created_label)}</p>
                </div>
              </div>
              {review.content && <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{review.content}</p>}
              {!review.content && <p className="mt-3 text-sm italic text-muted-foreground">Avis sans texte transmis par NextPax.</p>}
            </article>
          ))}
        </div>
        {cache?.next_offset != null && (
          <Button variant="outline" onClick={() => void loadCache(cache.next_offset ?? 0)} disabled={loading}>
            {loading ? "Chargement…" : `Afficher la suite (${cache.reviews.length}/${cache.total_count})`}
          </Button>
        )}
        {cache && cache.total_count > 0 && <p className="text-xs text-muted-foreground">{cache.total_count} avis importé(s) pour ce logement.</p>}
      </CardContent>
    </Card>
  );
}
