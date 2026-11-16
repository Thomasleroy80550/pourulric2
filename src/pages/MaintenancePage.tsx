import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Check, Database, Layers3, RefreshCw, Sparkles, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import MigrationUpdates from "@/components/MigrationUpdates";
import MaintenanceAdminAccess from "@/components/MaintenanceAdminAccess";
import { getMigrationProgress, migrationSteps } from "@/lib/migration-api";

export default function MaintenancePage() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [panel, setPanel] = useState<"progress" | "notes">("progress");
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
    themeColor?.setAttribute("content", "#fafafa");
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      if (previousColor !== null && previousColor !== undefined) themeColor?.setAttribute("content", previousColor);
    };
  }, []);

  const completedCount = migration ? migrationSteps.filter((step) => migration[step.key]).length : 0;

  return (
    <main className="relative flex min-h-dvh flex-col justify-center overflow-x-clip bg-[#fafafa] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))] text-slate-900 selection:bg-red-100 sm:pb-[max(2rem,env(safe-area-inset-bottom))] sm:pt-[max(2rem,env(safe-area-inset-top))]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-96 bg-[radial-gradient(#d4d4d8_0.6px,transparent_0.6px)] bg-[size:20px_20px] opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="absolute -right-28 top-0 h-96 w-96 rounded-full bg-rose-100/40 blur-3xl" />
      </div>
      <div className="relative mx-auto w-full max-w-5xl">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200/70 pb-4 sm:pb-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src="/logo.png" alt="Hello Keys" className="h-8 w-auto max-w-[140px] object-contain sm:h-10 sm:max-w-[180px]" />
            <span className="ml-2 hidden border-l border-slate-200 pl-3 text-xs text-slate-400 sm:inline">Journal de migration</span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50/80 px-2.5 py-1 text-[10px] font-medium text-amber-800 sm:text-xs">
            <span className="relative flex h-1.5 w-1.5"><span className="absolute h-full w-full animate-ping rounded-full bg-amber-400 opacity-50 motion-reduce:animate-none" /><span className="relative h-1.5 w-1.5 rounded-full bg-amber-500" /></span>
            Maintenance en cours
          </span>
        </header>

        <div className="flex items-center justify-between gap-6 py-5 sm:py-8">
          <section className="max-w-xl">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-600 sm:text-xs"><Sparkles className="h-3 w-3" aria-hidden="true" /> La prochaine étape de Hello Keys</p>
            <h1 className="text-[30px] font-semibold leading-[1.12] tracking-[-0.045em] sm:text-5xl">On prépare la suite.<br /><span className="text-slate-400">Vous allez l’adorer.</span></h1>
            <p className="mt-3 max-w-lg text-xs leading-relaxed text-slate-500 sm:mt-4 sm:text-sm">Nous transférons vos données vers notre nouveau logiciel hôtelier. Votre espace propriétaire revient bientôt, avec une nouvelle expérience.</p>
            <p className="mt-3 inline-flex items-center gap-2 text-[10px] font-medium text-slate-500 sm:text-xs"><span className="h-1 w-1 rounded-full bg-slate-400" /> Migration du 16 au 18 novembre 2026</p>
          </section>
          <div aria-hidden="true" className="relative hidden h-44 w-64 shrink-0 items-center justify-center sm:flex">
            <div className="absolute h-44 w-44 rounded-full border border-slate-200/60" />
            <div className="absolute h-32 w-32 rounded-full border border-slate-200/60" />
            <div className="absolute h-20 w-20 rounded-full bg-red-50 blur-xl" />
            <div className="absolute left-3 top-7 flex h-16 w-16 -rotate-12 items-center justify-center rounded-2xl border border-white bg-white shadow-[0_8px_30px_-8px_rgba(15,23,42,0.15)]"><Database className="h-6 w-6 text-slate-400" /></div>
            <ArrowRight className="relative h-5 w-5 text-slate-300" />
            <div className="absolute right-4 bottom-6 flex h-20 w-20 rotate-12 items-center justify-center rounded-2xl border border-red-200/50 bg-gradient-to-br from-white to-red-50 shadow-[0_12px_32px_-8px_rgba(220,38,38,0.2)]"><Layers3 className="h-8 w-8 text-red-600" /></div>
            <span className="absolute right-9 top-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-[9px] font-medium text-slate-400">Une nouvelle expérience</span>
          </div>
        </div>

        {!online && <p role="status" className="mb-3 flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 p-2 text-xs text-amber-800"><WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />Hors connexion. Le suivi reprendra à votre retour en ligne.</p>}
        <div aria-label="Affichage du suivi" className="mb-3 grid grid-cols-2 gap-1 rounded-xl border border-slate-200/80 bg-slate-100/70 p-1 lg:hidden">
          <Button variant="ghost" aria-pressed={panel === "progress"} onClick={() => setPanel("progress")} className={`h-8 rounded-lg text-xs ${panel === "progress" ? "bg-white text-slate-900 shadow-sm hover:bg-white" : "text-slate-500"}`}>Progression</Button>
          <Button variant="ghost" aria-pressed={panel === "notes"} onClick={() => setPanel("notes")} className={`h-8 rounded-lg text-xs ${panel === "notes" ? "bg-white text-slate-900 shadow-sm hover:bg-white" : "text-slate-500"}`}>Notes de l’équipe</Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <section aria-labelledby="migration-progress-title" className={`${panel === "progress" ? "block" : "hidden"} rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_24px_-12px_rgba(15,23,42,0.12)] sm:p-5 lg:block`}>
            <div className="flex items-center justify-between gap-3">
              <h2 id="migration-progress-title" className="text-sm font-semibold tracking-tight">Avancement du transfert</h2>
              <Button variant="ghost" size="icon" onClick={() => void refetch()} disabled={isFetching || !online} aria-label="Actualiser la progression" className="h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-50"><RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" /></Button>
            </div>
            {isPending && <p role="status" className="py-4 text-xs text-slate-500">{online ? "Chargement de la progression…" : "Connexion nécessaire pour consulter la progression."}</p>}
            {isError && online && <p role="alert" className="mt-3 flex items-start gap-2 text-xs text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />Actualisation momentanément indisponible. Nouvelle tentative automatique.</p>}
            {migration && (
              <>
                <div className="mb-4 mt-3 space-y-2.5">
                  <div className="flex items-end justify-between gap-3">
                    <p className="text-[11px] text-slate-400">{completedCount} / {migrationSteps.length} étapes terminées</p>
                    <p className="text-4xl font-semibold leading-none tabular-nums tracking-[-0.05em]">{migration.progress}<span className="ml-0.5 text-lg text-slate-400">%</span></p>
                  </div>
                  <Progress value={migration.progress} aria-label="Progression globale de la migration" aria-valuenow={migration.progress} className="h-1.5 bg-slate-100 [&>div]:bg-gradient-to-r [&>div]:from-red-600 [&>div]:to-rose-400 [&>div]:duration-700 motion-reduce:[&>div]:transition-none" />
                </div>
                <ul aria-label="Étapes de la migration" className="grid grid-cols-2 gap-x-3 gap-y-1 sm:gap-x-5">
                  {migrationSteps.map((step, index) => {
                    const completed = migration[step.key];
                    return (
                      <li key={step.key} className="flex items-start gap-2 rounded-lg py-1.5">
                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[8px] font-medium ${completed ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-slate-200 text-slate-400"}`} aria-hidden="true">{completed ? <Check className="h-3 w-3" /> : String(index + 1).padStart(2, "0")}</span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[10px] leading-snug sm:text-xs ${completed ? "text-slate-900" : "text-slate-500"}`}>{step.label}</p>
                          <p className={`mt-0.5 text-[9px] ${completed ? "text-emerald-600" : "text-slate-400"}`}>{completed ? "Terminé" : "À venir"}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 border-t border-slate-100 pt-3 text-[10px] text-slate-400">Mis à jour le {new Date(migration.updated_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · Paris</p>
              </>
            )}
          </section>
          <div className={`${panel === "notes" ? "block" : "hidden"} lg:block`}><MigrationUpdates /></div>
        </div>
        <footer className="mt-4 flex flex-col items-center justify-between gap-2 text-center text-[10px] leading-relaxed text-slate-400 sm:mt-5 sm:flex-row sm:text-left">
          <p>Support client suspendu pendant le transfert. Merci pour votre patience.</p>
          <p className="flex items-center gap-1.5 whitespace-nowrap"><span className={`h-1 w-1 rounded-full ${online ? "bg-emerald-500" : "bg-amber-500"}`} /> Suivi actualisé toutes les 30 s</p>
        </footer>
      </div>
      <MaintenanceAdminAccess />
    </main>
  );
}
