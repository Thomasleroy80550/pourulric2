import { useEffect, useState } from "react";

const reopeningTime = new Date("2026-11-18T19:30:00+01:00").getTime();

export default function MaintenanceCountdown({ compact = false, reopened = false }: { compact?: boolean; reopened?: boolean }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((reopeningTime - Date.now()) / 1000)));

  useEffect(() => {
    const update = () => setRemaining(Math.max(0, Math.ceil((reopeningTime - Date.now()) / 1000)));
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const units = [
    { label: "j", value: Math.floor(remaining / 86400) },
    { label: "h", value: Math.floor(remaining / 3600) % 24 },
    { label: "min", value: Math.floor(remaining / 60) % 60 },
    { label: "s", value: remaining % 60 },
  ];

  return (
    <section aria-label="Réouverture des annonces et de la plateforme propriétaire" className={compact ? "maintenance-countdown-compact mt-3" : "mt-5"}>
      <p className={compact ? "text-[10px] leading-relaxed text-slate-500" : "text-xs leading-relaxed text-slate-500"}>Réouverture des annonces et de l’espace propriétaire<br /><span className="font-medium text-slate-700">18 novembre · 19 h 30</span> <span className="text-slate-400">(Paris)</span></p>
      {remaining > 0 && !reopened ? (
        <p className={`mt-2 flex items-baseline gap-3 whitespace-nowrap font-medium tabular-nums tracking-tight text-slate-900 ${compact ? "text-xl" : "text-3xl"}`}>
          {units.map(({ label, value }) => (
            <span key={label}>{String(value).padStart(2, "0")}<span className={`ml-1 font-normal tracking-normal text-slate-400 ${compact ? "text-[10px]" : "text-xs"}`}>{label}</span></span>
          ))}
        </p>
      ) : <p role="status" className={`mt-2 text-slate-600 ${compact ? "text-[10px]" : "text-xs"}`}>{reopened ? "Réouverture effectuée" : "Horaire prévu atteint · Finalisation en cours"}</p>}
      <p className={compact ? "mt-1 text-[8px] text-slate-400" : "mt-2 text-[10px] text-slate-400"}>Horaire prévisionnel · En cas de retard, vous serez informés.</p>
    </section>
  );
}
