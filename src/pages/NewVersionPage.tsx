"use client";

import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { Badge, BadgeProps } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sparkles, Rocket, Terminal, Tag } from 'lucide-react';
import { getPublicChangelog, ChangelogEntry } from '@/lib/changelog-api';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const getCategoryBadgeVariant = (category?: string): BadgeProps['variant'] => {
  switch (category?.toLowerCase()) {
    case 'nouveauté':
      return 'default';
    case 'amélioration':
      return 'secondary';
    case 'correction':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getCategoryDotColor = (category?: string): string => {
  switch (category?.toLowerCase()) {
    case 'nouveauté':
      return 'bg-[hsl(var(--primary))]';
    case 'amélioration':
      return 'bg-sky-500';
    case 'correction':
      return 'bg-red-500';
    default:
      return 'bg-muted-foreground';
  }
};

const NewVersionPage: React.FC = () => {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getPublicChangelog();
        setEntries(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <MainLayout>
      <div className="container mx-auto max-w-3xl py-6">
        {/* ── En-tête ─────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-[hsl(var(--sidebar-foreground))] via-[hsl(var(--primary))] to-[hsl(var(--accent))] p-6 text-white shadow-md sm:p-8">
          <div className="flex items-center gap-2 text-white/80">
            <Rocket className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-widest">Mises à jour</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Nouveautés de votre espace</h1>
          <p className="mt-1 max-w-xl text-sm text-white/85">
            Votre espace propriétaire évolue en continu. Retrouvez ici toutes les améliorations,
            nouveautés et corrections publiées par l'équipe.
          </p>
        </div>

        {/* ── Timeline ────────────────────────────────────── */}
        <div className="mt-8">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-2xl" />
              ))}
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-3">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-3 font-medium">Aucune mise à jour publiée pour le moment</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Revenez bientôt, les nouveautés arrivent régulièrement !
              </p>
            </div>
          ) : (
            <ol className="relative ml-3 border-l-2 border-muted pl-6">
              {entries.map((entry) => (
                <li key={entry.id} className="relative pb-8 last:pb-0">
                  <span
                    className={`absolute -left-[31px] top-1.5 h-3 w-3 rounded-full ring-4 ring-background ${getCategoryDotColor(entry.category)}`}
                  />
                  <div className="rounded-2xl border bg-card p-4 shadow-sm transition hover:shadow-md sm:p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={getCategoryBadgeVariant(entry.category)}>{entry.category}</Badge>
                      <Badge variant="outline" className="gap-1 font-normal">
                        <Tag className="h-3 w-3" />v{entry.version}
                      </Badge>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {format(parseISO(entry.created_at), 'dd MMMM yyyy', { locale: fr })}
                      </span>
                    </div>
                    <h2 className="mt-3 text-base font-bold sm:text-lg">{entry.title}</h2>
                    {entry.description && (
                      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                        {entry.description}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default NewVersionPage;
