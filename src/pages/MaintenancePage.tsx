import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, Circle, Database, RefreshCw, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getMigrationProgress, migrationSteps } from "@/lib/migration-api";

export default function MaintenancePage() {
  const { data: migration, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ["migration-progress"],
    queryFn: getMigrationProgress,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <nav aria-label="Accès administrateur" className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-lg font-bold tracking-tight">Hello Keys<span className="text-red-700">.</span></p>
          <Button asChild size="sm" className="bg-red-700 text-white hover:bg-red-800">
            <Link to="/admin/status">
              Accès administrateur
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </nav>
        <header className="mx-auto max-w-2xl space-y-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-200 bg-red-100 text-red-700">
            <Wrench className="h-8 w-8" aria-hidden="true" />
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
            <span className="h-2 w-2 rounded-full bg-red-600" /> Maintenance en cours
          </span>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Votre plateforme fait peau neuve</h1>
          <p className="text-base leading-relaxed text-slate-600">Nous transférons vos données vers notre nouveau logiciel hôtelier. L’espace propriétaire est temporairement indisponible pendant cette opération.</p>
          <p className="text-sm font-medium text-slate-600">Période de migration annoncée : du 16 au 18 novembre 2026.</p>
        </header>

        <Card className="border-red-200 bg-white text-slate-900 shadow-sm">
          <CardContent className="flex items-start gap-3 p-5">
            <Database className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-hidden="true" />
            <div className="space-y-2 text-sm leading-relaxed">
              <p className="font-semibold">Nos équipes sont mobilisées pour le transfert des données.</p>
              <p className="text-slate-600">Aucun support client ne sera assuré pendant cette période. Suivez ci-dessous l’avancement de la migration, mis à jour par notre équipe.</p>
              <p className="text-slate-600">Merci pour votre patience et votre confiance.</p>
            </div>
          </CardContent>
        </Card>

        <section aria-labelledby="migration-progress-title" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="migration-progress-title" className="text-xl font-bold">Avancement de la migration</h2>
              <p className="mt-1 text-xs text-slate-500">Actualisation automatique toutes les 30 secondes.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching} className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100">
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
              Actualiser
            </Button>
          </div>

          {isPending && <p role="status" className="text-sm text-slate-500">Chargement de la progression…</p>}
          {isError && (
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              Impossible d’actualiser la progression pour le moment. Une nouvelle tentative sera effectuée automatiquement.
            </p>
          )}
          {migration && (
            <Card className="overflow-hidden border-slate-200 bg-white text-slate-900 shadow-sm">
              <CardContent className="space-y-6 p-5 sm:p-7">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-600">Progression globale</p>
                    <span className="text-3xl font-bold tabular-nums text-red-700">{migration.progress}<span className="ml-1 text-lg">%</span></span>
                  </div>
                  <Progress value={migration.progress} aria-label="Progression globale de la migration" aria-valuenow={migration.progress} className="h-3 bg-red-100 [&>div]:bg-red-600 [&>div]:duration-700" />
                </div>
                <ul className="space-y-3">
                  {migrationSteps.map((step) => {
                    const completed = migration[step.key];
                    return (
                      <li key={step.key} className={`flex items-center gap-3 rounded-xl border p-3 sm:p-4 ${completed ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                        {completed ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" /> : <Circle className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />}
                        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <span className={`text-sm font-medium ${completed ? "text-emerald-900" : "text-slate-700"}`}>{step.label}</span>
                          <span className={`text-xs ${completed ? "text-emerald-700" : "text-slate-500"}`}>{completed ? "Terminé" : "À venir"}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-xs text-slate-500">Dernière mise à jour par notre équipe : {new Date(migration.updated_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} (Paris).</p>
              </CardContent>
            </Card>
          )}
        </section>

        <footer className="border-t border-slate-200 pt-5 text-center">
          <Link to="/admin/status" className="inline-flex items-center gap-1 text-xs text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline">Accès administration <ArrowRight className="h-3 w-3" aria-hidden="true" /></Link>
        </footer>
      </div>
    </main>
  );
}
