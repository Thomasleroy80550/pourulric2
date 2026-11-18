import { useEffect, useState } from "react";

const reopeningTime = new Date("2026-11-19T19:30:00+01:00").getTime();

const labels = ["jours", "heures", "min", "sec"] as const;
const shorts = ["j", "h", "min", "s"] as const;

export default function MaintenanceCountdown({ compact = false, reopened = false }: { compact?: boolean; reopened?: boolean }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((reopeningTime - Date.now()) / 1000)));

  useEffect(() => {
    const update = () => setRemaining(Math.max(0, Math.ceil((reopeningTime - Date.now()) / 1000)));
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const values = [
    Math.floor(remaining / 86400),
    Math.floor(remaining / 3600) % 24,
    Math.floor(remaining / 60) % 60,
    remaining % 60,
  ];

  const counting = remaining > 0 && !reopened;

  if (compact) {
    return (
      <section aria-label="Réouverture des annonces et de la plateforme propriétaire" className="shrink-0 pt-2.5">
        <p className="text-[10px] text-slate-500">Nouvel horaire de réouverture : <span className="font-medium text-slate-700">19 novembre · 19 h 30</span> <span className="text-slate-400">(Paris)</span></p>
        {counting ? (
          <p className="mt-1 flex items-baseline gap-2.5 text-lg font-medium tabular-nums tracking-tight text-slate-900">
            {values.map((value, i) => (
              <span key={labels[i]}>{String(value).padStart(2, "0")}<span className="ml-0.5 text-[10px] font-normal tracking-normal text-slate-400">{shorts[i]}</span></span>
            ))}
          </p>
        ) : (
          <p role="status" className="mt-1 text-[10px] font-medium text-slate-600">{reopened ? "Réouverture effectuée" : "Horaire atteint · Finalisation en cours"}</p>
        )}
      </section>
    );
  }

  return (
    <section aria-label="Réouverture des annonces et de la plateforme propriétaire" className="mt-8 flex flex-col items-center text-center">
      <p className="text-xs text-slate-500">Nouvel horaire de réouverture · <span className="font-medium text-slate-700">19 novembre à 19 h 30</span> (Paris)</p>
      {counting ? (
        <div className="mt-5 flex items-start">
          {values.map((value, i) => (
            <div key={labels[i]} className="flex items-start">
              {i > 0 && <span aria-hidden="true" className="mx-3 text-3xl font-light leading-none text-rose-300">:</span>}
              <div className="flex w-16 flex-col items-center">
                <span className="text-4xl font-semibold tabular-nums leading-none tracking-tight">{String(value).padStart(2, "0")}</span>
                <span className="mt-2 text-[9px] font-medium uppercase tracking-[0.15em] text-slate-400">{labels[i]}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p role="status" className="mt-5 text-sm font-medium text-slate-700">{reopened ? "Réouverture effectuée ✨" : "Horaire prévu atteint · Finalisation en cours"}</p>
      )}
    </section>
  );
}
