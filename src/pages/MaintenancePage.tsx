import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Check, RefreshCw, Sparkles, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import MigrationUpdates from "@/components/MigrationUpdates";
import MaintenanceAdminAccess from "@/components/MaintenanceAdminAccess";
import MaintenanceQuestions from "@/components/MaintenanceQuestions";
import MaintenanceCountdown from "@/components/MaintenanceCountdown";
import MobileMaintenance from "@/components/MobileMaintenance";
import { getMigrationProgress, migrationSteps } from "@/lib/migration-api";
import "@/styles/maintenance.css";

export default function MaintenancePage() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const { data: migration, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ["migration-progress"],
    queryFn: getMigrationProgress,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    retry: false,
    networkMode: "always",
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

  const completedCount = migration ? migrationSteps.filter((step) => migration[step.key] === 100).length : 0;

  return (
    <>
    <MobileMaintenance migration={migration} online={online} pending={isPending} error={isError} fetching={isFetching} refresh={() => void refetch()} />
    <main className="relative hidden min-h-dvh bg-[#fafafa] text-slate-900 selection:bg-red-100 lg:block">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-96 bg-[radial-gradient(#d4d4d8_0.6px,transparent_0.6px)] bg-[size:20px_20px] opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-8 py-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Hello Keys" className="h-9 w-auto object-contain" />
            <span className="border-l border-slate-200 pl-3 text-xs text-slate-400">Journal de migration</span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50/80 px-2.5 py-1 text-xs font-medium text-amber-800">
            <span className="relative flex h-1.5 w-1.5"><span className="absolute h-full w-full animate-ping rounded-full bg-amber-400 opacity-50 motion-reduce:animate-none" /><span className="relative h-1.5 w-1.5 rounded-full bg-amber-500" /></span>
            Maintenance en cours
          </span>
        </header>

        <section className="mt-14 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-red-600"><Sparkles className="h-3 w-3" aria-hidden="true" /> La prochaine étape de Hello Keys</p>
          <h1 className="mt-3 text-5xl font-semibold leading-[1.1] tracking-[-0.045em]">On prépare la suite.<br /><span className="text-slate-400">Vous allez l’adorer.</span></h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-slate-500">Nous transférons vos données vers notre nouveau logiciel hôtelier. Votre espace propriétaire revient bientôt, avec une nouvelle expérience.</p>
          <p className="mt-3 text-xs font-medium text-slate-400">Migration du 16 au 19 novembre 2026</p>
        </section>

        <section aria-label="Report de la réouverture" className="mx-auto mt-8 w-full max-w-2xl rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-4">
          <p className="flex items-center justify-center gap-2 text-sm font-semibold text-amber-900"><AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" /> Réouverture décalée de 24 h — incident chez notre partenaire Abritel</p>
          <p className="mt-2 text-center text-xs leading-relaxed text-amber-900/80">Chaque équipe technique suit son propre calendrier de déploiement : <strong>le nôtre a été tenu et nos travaux étaient terminés dans les temps</strong>. La plateforme Abritel a accusé environ 6 h de retard dans le traitement de ses flux de synchronisation (API de distribution / channel manager). Ce retard, indépendant de notre volonté, bloque le déploiement et le mapping de vos logements sur ce canal — sans sa validation, nous ne pouvons pas rouvrir en toute sécurité.</p>
        </section>

        <MaintenanceCountdown reopened={migration?.platform_reopened === 100} />

        <div aria-hidden="true" className="my-12 h-px w-full bg-slate-200/80" />

        {!online && <p role="status" className="mb-6 flex items-center justify-center gap-2 text-xs text-amber-800"><WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />Hors connexion. Le suivi reprendra à votre retour en ligne.</p>}

        <section aria-labelledby="migration-progress-title">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="migration-progress-title" className="text-sm font-semibold tracking-tight">Avancement du transfert</h2>
              <p className="mt-1 text-xs text-slate-400">{migration ? `${completedCount} / ${migrationSteps.length} étapes terminées` : "Suivi de la migration"}</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-5xl font-semibold leading-none tabular-nums tracking-[-0.04em]">{migration ? <>{migration.progress.toLocaleString("fr-FR")}<span className="ml-0.5 text-2xl text-slate-300">%</span></> : "—"}</p>
              <Button variant="ghost" size="icon" onClick={() => void refetch()} disabled={isFetching || !online} aria-label="Actualiser la progression" className="h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-100"><RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" /></Button>
            </div>
          </div>
          <Progress value={migration?.progress ?? 0} aria-label="Progression globale de la migration" aria-valuenow={migration?.progress ?? 0} className="mt-5 h-1 bg-slate-200/70 [&>div]:bg-gradient-to-r [&>div]:from-red-600 [&>div]:to-rose-400 [&>div]:duration-700 motion-reduce:[&>div]:transition-none" />

          {isPending && <p role="status" className="py-6 text-center text-xs text-slate-500">{online ? "Chargement de la progression…" : "Connexion nécessaire pour consulter la progression."}</p>}
          {isError && online && <p role="alert" className="mt-4 flex items-center gap-2 text-xs text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />Actualisation momentanément indisponible. Nouvelle tentative automatique.</p>}

          {migration && (
            <>
              <ul aria-label="Étapes de la migration" className="mt-10 grid grid-cols-2 gap-x-12 gap-y-6">
                {migrationSteps.map((step) => {
                  const percentage = migration[step.key];
                  const completed = percentage === 100;
                  return (
                    <li key={step.key}>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className={`text-xs leading-snug ${completed ? "text-slate-700" : "text-slate-500"}`}>{step.label}</p>
                        <span className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium tabular-nums ${completed ? "text-emerald-600" : percentage > 0 ? "text-orange-600" : "text-slate-400"}`}>{completed && <Check className="h-3 w-3" aria-hidden="true" />}{percentage}%</span>
                      </div>
                      <Progress value={percentage} aria-label={`Progression : ${step.label}`} aria-valuenow={percentage} className={`mt-2 h-[3px] bg-slate-200/70 [&>div]:duration-700 [&>div]:ease-out motion-reduce:[&>div]:transition-none ${completed ? "[&>div]:bg-emerald-500" : percentage > 0 ? "[&>div]:bg-orange-500" : ""}`} />
                    </li>
                  );
                })}
              </ul>
              <p className="mt-8 text-[10px] text-slate-400">Mis à jour le {new Date(migration.updated_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · Paris · Actualisation toutes les 30 s</p>
            </>
          )}
        </section>

        <section className="mt-12">
          <MigrationUpdates />
        </section>

        <footer className="mt-auto flex items-center justify-between gap-3 pt-10 text-[10px] text-slate-400">
          <div className="flex items-center gap-2"><p>Support habituel suspendu. Réponses selon disponibilité.</p><MaintenanceQuestions /></div>
          <p className="flex items-center gap-1.5 whitespace-nowrap"><span className={`h-1 w-1 rounded-full ${online ? "bg-emerald-500" : "bg-amber-500"}`} /> {online ? "En ligne" : "Hors ligne"}</p>
        </footer>
      </div>
    </main>
    <MaintenanceAdminAccess />
    </>
  );
}
