"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Megaphone } from "lucide-react";
import { Link } from "react-router-dom";
import { getPublicChangelog, ChangelogEntry } from "@/lib/changelog-api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";

const NewsFeedPublic: React.FC = () => {
  const [entries, setEntries] = React.useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const all = await getPublicChangelog();
        if (!mounted) return;
        setEntries((all || []).slice(0, 4));
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Impossible de charger les nouveautés.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base font-medium">Nouveautés</CardTitle>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/new-version">Voir tout</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune nouveauté pour le moment.</p>
        ) : (
          <ul className="space-y-4">
            {entries.map((e) => (
              <li key={e.id} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{e.category || "Nouveauté"}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(e.created_at), "dd MMM yyyy", { locale: fr })}
                  </span>
                  {e.version && (
                    <span className="ml-auto text-xs text-muted-foreground">v{e.version}</span>
                  )}
                </div>
                <div className="text-sm font-medium">{e.title}</div>
                {e.description ? (
                  <p className="text-sm text-muted-foreground line-clamp-2">{e.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default NewsFeedPublic;