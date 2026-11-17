import { useState } from "react";
import { Check, ChartNoAxesCombined, MessageSquare, NotebookText, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import MigrationUpdates from "@/components/MigrationUpdates";
import MaintenanceQuestions from "@/components/MaintenanceQuestions";
import { migrationSteps, type MigrationProgress } from "@/lib/migration-api";

interface MobileMaintenanceProps {
  migration: MigrationProgress | undefined;
  online: boolean;
  pending: boolean;
  error: boolean;
  fetching: boolean;
  refresh: () => void;
}

export default function MobileMaintenance({ migration, online, pending, error, fetching, refresh }: MobileMaintenanceProps) {
  const [tab, setTab] = useState<"progress" | "notes">("progress");
  const completed = migration ? migrationSteps.filter((step) => migration[step.key] === 100).length : 0;
  const circumference = 2 * Math.PI * 34;

  return (
    <div className="maintenance-mobile fixed inset-x-0 top-0 z-10 flex h-dvh flex-col overflow-hidden bg-[#f5f6f8] text-slate-900 lg:hidden">
      <header className="flex shrink-0 items-center justify-between gap-3 px-[max(1rem,env(safe-area-inset-left))] pb-3 pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <img src="/logo.png" alt="Hello Keys" className="h-7 w-auto max-w-[125px] object-contain" />
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-semibold ${online ? "bg-orange-100/70 text-orange-700" : "bg-slate-200 text-slate-600"}`}>
            {online ? <span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> : <WifiOff className="h-3 w-3" aria-hidden="true" />}
            {online ? "Maintenance" : "Hors ligne"}
          </span>
          <Button variant="ghost" size="icon" aria-label="Actualiser la progression" disabled={fetching || !online} onClick={refresh} className="h-9 w-9 rounded-full bg-white text-slate-500 shadow-sm">
            <RefreshCw className={`h-3.5 w-3.5 ${fetching ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
          </Button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3 px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-3">
        <section className="maintenance-mobile-summary relative flex shrink-0 items-center justify-between gap-3 overflow-hidden rounded-3xl bg-slate-950 p-4 text-white shadow-lg shadow-slate-950/10">
          <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-red-500/15 blur-2xl" />
          <div className="relative min-w-0">
            <p className="maintenance-mobile-eyebrow text-[9px] font-medium uppercase tracking-[0.16em] text-slate-400">Votre nouvelle plateforme</p>
            <h1 className="mt-1.5 text-xl font-semibold leading-tight tracking-tight">On prépare la suite.</h1>
            <p className="mt-1 text-[10px] text-slate-400">Migration du 16 au 18 novembre</p>
            <p className="mt-2 text-[10px] leading-snug text-amber-200">Réouverture de vos annonces et de la plateforme propriétaire prévue le <strong>18 novembre à 19 h 30 (Paris)</strong>. En cas de retard, vous serez informés.</p>
            <p className="maintenance-mobile-detail mt-3 flex items-center gap-1.5 text-[10px] text-slate-300"><span className="h-1 w-1 rounded-full bg-emerald-400" />{migration ? `${completed} / ${migrationSteps.length} étapes terminées` : "Suivi de la migration"}</p>
          </div>
          <div className="maintenance-mobile-ring relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" role="progressbar" aria-label="Progression globale de la migration" aria-valuemin={0} aria-valuemax={100} aria-valuenow={migration?.progress}>
              <circle cx="40" cy="40" r="34" fill="none" stroke="#334155" strokeWidth="4" />
              {migration && <circle cx="40" cy="40" r="34" fill="none" stroke="#fb7185" strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - migration.progress / 100)} className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none" />}
            </svg>
            <p className="absolute inset-0 flex items-center justify-center text-xl font-semibold tabular-nums tracking-tight">{migration ? `${migration.progress.toLocaleString("fr-FR")}%` : "—"}</p>
          </div>
        </section>

        {tab === "progress" ? (
          <section className="flex min-h-0 flex-1 flex-col gap-2" aria-labelledby="mobile-migration-steps-title">
            <div className="flex shrink-0 items-center justify-between gap-2"><h2 id="mobile-migration-steps-title" className="text-xs font-semibold">Les étapes du transfert</h2><span className="text-[9px] text-slate-400">Actualisation · 30 s</span></div>
            {pending && <div role="status" className="flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 text-center text-xs text-slate-500">{online ? "Chargement de la progression…" : "Reconnectez-vous au réseau pour consulter la progression."}</div>}
            {error && online && <div role="alert" className="shrink-0 rounded-xl bg-orange-50 px-3 py-2 text-[10px] text-orange-800">Le suivi est temporairement indisponible. Actualisation automatique en cours.</div>}
            {migration && (
              <ul aria-label="Avancement des étapes de migration" className="maintenance-mobile-steps grid min-h-0 flex-1 grid-cols-2 grid-rows-5 gap-2">
                {migrationSteps.map((step) => {
                  const percentage = migration[step.key];
                  const done = percentage === 100;
                  const status = done ? "Terminé" : percentage > 0 ? "En cours" : "À venir";
                  return (
                    <li key={step.key} title={step.label} aria-label={`${step.label} : ${percentage} %, ${status}`} className={`maintenance-mobile-step flex min-h-0 flex-col justify-between rounded-2xl border bg-white p-2.5 ${percentage > 0 && !done ? "border-orange-200/70" : done ? "border-emerald-100" : "border-slate-200/70"}`}>
                      <p className="line-clamp-2 text-[10px] font-medium leading-tight text-slate-600">{step.label}</p>
                      <div className="mt-1 space-y-1.5">
                        <div className="flex items-center justify-between gap-1"><span className={`text-[8px] ${done ? "text-emerald-600" : percentage > 0 ? "text-orange-600" : "text-slate-400"}`}>{status}</span><span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums ${done ? "text-emerald-600" : percentage > 0 ? "text-orange-600" : "text-slate-500"}`}>{done && <Check className="h-2.5 w-2.5" aria-hidden="true" />}{percentage}%</span></div>
                        <Progress value={percentage} aria-label={step.label} aria-valuenow={percentage} className={`h-1 bg-slate-100 [&>div]:duration-700 motion-reduce:[&>div]:transition-none ${done ? "[&>div]:bg-emerald-500" : "[&>div]:bg-orange-500"}`} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="shrink-0 text-center text-[8px] text-slate-400">{migration ? `Mise à jour à ${new Date(migration.updated_at).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" })} (Paris)` : "Support habituel suspendu pendant la migration."}</p>
          </section>
        ) : <div className="min-h-0 flex-1 overflow-hidden"><MigrationUpdates /></div>}
      </main>

      <nav aria-label="Navigation de maintenance" className="grid shrink-0 grid-cols-3 gap-1 border-t border-slate-200/60 bg-white/95 px-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <Button variant="ghost" aria-pressed={tab === "progress"} onClick={() => setTab("progress")} className={`maintenance-mobile-nav h-12 flex-col gap-1 rounded-xl text-[9px] ${tab === "progress" ? "bg-red-50 text-red-600 hover:bg-red-50" : "text-slate-400"}`}><ChartNoAxesCombined className="h-[18px] w-[18px]" aria-hidden="true" />Suivi</Button>
        <Button variant="ghost" aria-pressed={tab === "notes"} onClick={() => setTab("notes")} className={`maintenance-mobile-nav h-12 flex-col gap-1 rounded-xl text-[9px] ${tab === "notes" ? "bg-red-50 text-red-600 hover:bg-red-50" : "text-slate-400"}`}><NotebookText className="h-[18px] w-[18px]" aria-hidden="true" />Journal</Button>
        <MaintenanceQuestions trigger={<Button variant="ghost" className="maintenance-mobile-nav h-12 flex-col gap-1 rounded-xl text-[9px] text-slate-400"><MessageSquare className="h-[18px] w-[18px]" aria-hidden="true" />Questions</Button>} />
      </nav>
    </div>
  );
}
