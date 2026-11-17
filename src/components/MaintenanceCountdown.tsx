import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const reopeningTime = new Date("2026-11-18T19:30:00+01:00").getTime();

export default function MaintenanceCountdown({ compact = false, reopened = false }: { compact?: boolean; reopened?: boolean }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((reopeningTime - Date.now()) / 1000)));

  useEffect(() => {
    const update = () => setRemaining(Math.max(0, Math.ceil((reopeningTime - Date.now()) / 1000)));
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const units = [
    { label: "Jours", value: Math.floor(remaining / 86400) },
    { label: "Heures", value: Math.floor(remaining / 3600) % 24 },
    { label: "Minutes", value: Math.floor(remaining / 60) % 60 },
    { label: "Secondes", value: remaining % 60 },
  ];

  return (
    <section aria-label="Réouverture des annonces et de la plateforme propriétaire" className={compact ? "maintenance-countdown-compact mt-3 border-t border-white/10 pt-2.5" : "relative w-full overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 p-7 text-white shadow-xl shadow-rose-950/15"}>
      {!compact && <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-rose-500/25 blur-3xl" />}
      <div className="relative">
        {!compact && <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300"><Sparkles className="h-3.5 w-3.5" /> Le compte à rebours est lancé</p>}
        <p className={compact ? "text-[10px] font-medium text-slate-300" : "text-sm font-medium text-slate-300"}>Réouverture des annonces et de l’espace propriétaire</p>
        <p className={compact ? "mt-0.5 text-[11px] font-semibold text-white" : "mt-1 text-xl font-semibold tracking-tight"}>18 novembre · 19 h 30 <span className="text-[9px] font-normal text-slate-400">(Paris)</span></p>
        {remaining > 0 && !reopened ? (
          <div className={`grid grid-cols-4 ${compact ? "mt-2 gap-1.5" : "mt-6 gap-2"}`}>
            {units.map(({ label, value }) => (
              <div key={label} className={`flex flex-col items-center rounded-xl border border-white/10 bg-white/[0.06] ${compact ? "py-1" : "py-3"}`}>
                <span className={`font-semibold tabular-nums tracking-tight ${compact ? "text-xl leading-none" : "text-4xl"}`}>{String(value).padStart(2, "0")}</span>
                <span className={`font-medium uppercase tracking-wider text-slate-400 ${compact ? "mt-1 text-[7px]" : "mt-1.5 text-[8px]"}`}>{label}</span>
              </div>
            ))}
          </div>
        ) : <p role="status" className={`font-medium text-rose-200 ${compact ? "mt-2 text-[10px]" : "mt-6 text-sm"}`}>{reopened ? "Réouverture effectuée ✨" : "L’horaire prévu est atteint. Réouverture en cours de finalisation."}</p>}
        <p className={compact ? "mt-1.5 text-[8px] text-slate-400" : "mt-5 text-xs leading-relaxed text-slate-400"}>Horaire prévisionnel · En cas de retard, vous serez informés.</p>
      </div>
    </section>
  );
}
