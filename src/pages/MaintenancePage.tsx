import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Check, Database, RefreshCw, ShieldCheck, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getMigrationProgress, migrationSteps } from "@/lib/migration-api";

export default function MaintenancePage() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const { data: migration, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ["migration-progress"],
    queryFn: getMigrationProgress,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    const themeColor = document.querySelector('meta[name="theme-color"]');
    const previousColor = themeColor?.getAttribute("content");
    themeColor?.setAttribute("content", "#f8fafc");
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      if (previousColor !== null && previousColor !== undefined) themeColor?.setAttribute("content", previousColor);
    };
  }, []);

  const completedCount = migration ? migrationSteps.filter((step) => migration[step.key]).length : 0;

  return (
    <main className="relative flex min-h-dvh flex-col justify-center overflow-x-clip bg-slate-50 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] text-slate-900 sm:pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-32 h-80 w-80 rounded-full bg-red-100/60 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-rose-100/50 blur-3xl" />
      </div>
      <div className="relative mx-auto w-full max-w-5xl">
        <header className="mb-4 flex items-center justify-between gap-2 sm:mb-8">
          <p className="text-xl font-extrabold tracking-tight">Hello Keys<span className="text-red-600">.</span></p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200/80 bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-red-700 sm:text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600" /> Maintenance en cours
          </span>
        </header>

        <div className="grid items-center gap-4 sm:gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <section className="space-y-2.5 text-center lg:space-y-5 lg:text-left">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-lg shadow-red-600/15 lg:mx-0 lg:h-14 lg:w-14 lg:rounded-2xl">
              <Database className="h-5 w-5 lg:h-7 lg:w-7" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl">Un nouveau départ<br className="hidden lg:block" /> pour votre plateforme.</h1>
            <p className="mx-auto max-w-md text-xs leading-relaxed text-slate-500 sm:text-sm lg:mx-0 lg:text-base">Vos données migrent vers notre nouveau logiciel hôtelier. L’espace propriétaire est temporairement indisponible.</p>
            <p className="text-[11px] font-medium text-red-700 sm:text-xs">Du 16 au 18 novembre 2026</p>
            <div className="hidden rounded-xl border border-slate-200/80 bg-white/60 p-4 text-sm leading-relaxed text-slate-500 lg:block">
              Nos équipes se consacrent au transfert des données. Le support client est suspendu pendant cette période. Merci pour votre patience et votre confiance.
            </div>
          </section>

          <section aria-labelledby="migration-progress-title" className="overflow-hidden rounded-2xl border border-white bg-white shadow-xl shadow-slate-200/60 sm:rounded-3xl">
            <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 id="migration-progress-title" className="text-sm font-bold sm:text-base">Avancement de la migration</h2>
                  <p className="mt-0.5 text-[10px] text-slate-400 sm:text-xs">Mis à jour par notre équipe</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => void refetch()} disabled={isFetching || !online} aria-label="Actualiser la progression" className="h-8 w-8 shrink-0 rounded-full text-slate-400 hover:bg-slate-50 hover:text-red-700">
                  <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
                </Button>
              </div>

              {!online && <p role="status" className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800"><WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />Hors connexion. Les informations seront actualisées à votre retour en ligne.</p>}
              {isPending && <p role="status" className="py-3 text-sm text-slate-500">{online ? "Chargement de la progression…" : "Connexion nécessaire pour consulter la progression."}</p>}
              {isError && online && <p role="alert" className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />Actualisation indisponible. Une nouvelle tentative sera effectuée automatiquement.</p>}
              {migration && (
                <>
                  <div className="space-y-2.5">
                    <div className="flex items-end justify-between">
                      <p className="text-xs text-slate-500">{completedCount} étape{completedCount > 1 ? "s" : ""} sur 4 terminée{completedCount > 1 ? "s" : ""}</p>
                      <p className="text-3xl font-extrabold leading-none tabular-nums tracking-tight text-red-600 sm:text-4xl">{migration.progress}<span className="ml-0.5 text-base font-semibold sm:text-lg">%</span></p>
                    </div>
                    <Progress value={migration.progress} aria-label="Progression globale de la migration" aria-valuenow={migration.progress} className="h-2 bg-red-50 [&>div]:bg-gradient-to-r [&>div]:from-red-600 [&>div]:to-rose-500 [&>div]:duration-700" />
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {migrationSteps.map((step, index) => {
                      const completed = migration[step.key];
                      return (
                        <li key={step.key} className="flex items-center gap-2.5 py-2.5 sm:gap-3 sm:py-3.5">
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${completed ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`} aria-hidden="true">{completed ? <Check className="h-4 w-4" /> : String(index + 1).padStart(2, "0")}</span>
                          <span className={`min-w-0 flex-1 text-xs font-medium leading-relaxed sm:text-sm ${completed ? "text-emerald-800" : "text-slate-600"}`}>{step.label}</span>
                          <span className={`shrink-0 text-[9px] sm:text-[10px] ${completed ? "text-emerald-600" : "text-slate-400"}`}>{completed ? "Terminé" : "À venir"}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-[10px] text-slate-400">Dernière mise à jour : {new Date(migration.updated_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} (Paris)</p>
                </>
              )}
            </div>
            <div className="flex items-center justify-center gap-1.5 border-t border-slate-100 bg-slate-50/80 px-3 py-2 text-[10px] text-slate-400">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Suivi actualisé automatiquement toutes les 30 s
            </div>
          </section>
        </div>
        <footer className="mt-3 text-center text-[10px] leading-relaxed text-slate-400 sm:mt-5 sm:text-xs">
          <p className="lg:hidden">Support client suspendu pendant le transfert. Merci pour votre patience.</p>
          <p className="hidden lg:block">Merci de nous accompagner dans cette nouvelle étape. — L’équipe Hello Keys</p>
        </footer>
      </div>
    </main>
  );
}
